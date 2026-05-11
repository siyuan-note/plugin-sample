# Kernel Plugin Demo — Design Spec

**Date:** 2026-05-09\
**Status:** Approved\
**Scope:** `plugin-sample/src/kernel.ts` + `petal/kernel.d.ts`

---

## Goal

Implement a TypeScript reference demo of the kernel plugin API in `src/kernel.ts`. This file is the living, authoritative example for community developers. It will be updated alongside `petal/kernel.d.ts` whenever new kernel APIs are added.

---

## Architecture

### `src/kernel.ts`

Single file, single class `KernelPlugin`. Webpack compiles it to `kernel.js` (CommonJS2, executed inside the kernel's goja runtime).

```
/// <reference types="siyuan/kernel" />

class KernelPlugin {
    private readonly siyuan: ISiyuan
    private ws: IWebSocket | null
    private es: IEventSource | null

    constructor()          — wire lifecycle hooks + server/event handlers
    onload()               — siyuan.rpc.bind + siyuan.storage CRUD
    onloaded()             — siyuan.client.fetch (kernel REST API)
    onrunning()            — HTTP RPC loopback + WebSocket client + SSE client
    onunload()             — rpc.broadcast + ws/es cleanup
    eventHandler()         — siyuan.event.handler + siyuan.event.emit
    httpHandler()          — siyuan.server.private.http.handler → IHttpResponse
    wsHandler()            — siyuan.server.private.ws.handler (IServerWsRequest)
    esHandler()            — siyuan.server.private.es.handler (IServerEsRequest)
}

new KernelPlugin();
```

### `petal/kernel.d.ts` additions

The current `IServerRequestHandler<TRes>` hard-codes `IServerRequest` as the handler argument. WS and SSE server handlers receive an augmented request that also carries a `port` back-channel to the connected client. The following additions are required (all backward-compatible):

| Addition                                                                    | Purpose                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `IEsServerPort`                                                             | Server-side SSE port: `onopen`, `onclose`, `send(eventType: string, data: string): void` (synchronous — no `await` needed), `close(): void`                                                                                         |
| `IServerWsRequest extends IServerRequest`                                   | Adds `port: IWebSocket` for WS server handlers                                                                                                                                                                                      |
| `IServerEsRequest extends IServerRequest`                                   | Adds `port: IEsServerPort` for SSE server handlers                                                                                                                                                                                  |
| `IServerRequestHandler<TRes, TReq extends IServerRequest = IServerRequest>` | Second type param (default = `IServerRequest`) — backward-compatible. The `handler` field body is updated to `((request: TReq) => TRes \| Promise<TRes>) \| null` so the type parameter is actually applied to the handler argument |
| `IServerScope.ws` / `.es` updated                                           | `IServerRequestHandler<void, IServerWsRequest>` / `IServerRequestHandler<void, IServerEsRequest>`                                                                                                                                   |

---

## API Coverage

Every public API on `globalThis.siyuan` is exercised:

| Namespace        | Demonstrated                                                                     |
| ---------------- | -------------------------------------------------------------------------------- |
| `siyuan.plugin`  | `name`, `version`, `platform`, `i18n`; all four lifecycle hooks                  |
| `siyuan.logger`  | All five levels: `trace`, `debug`, `info`, `warn`, `error`                       |
| `console`        | Sync logging; note difference vs `siyuan.logger` (sync, 3 levels, `util.format`) |
| `siyuan.storage` | `put`, `get` → `.text()` / `.json()` / `.arrayBuffer()`, `list`, `remove`        |
| `siyuan.rpc`     | `bind` (with description), `unbind`, `broadcast`                                 |
| `siyuan.client`  | `fetch` (HTTP RPC loopback), `socket` (WS client), `event` (SSE client)          |
| `siyuan.event`   | `handler` (receive), `emit` (publish)                                            |
| `siyuan.server`  | `private.http.handler`, `private.ws.handler`, `private.es.handler`               |

---

## Comment Strategy (TSDoc)

### Method-level TSDoc blocks

Every method gets a TSDoc block with:

* Summary line describing which API/feature it demonstrates
* `@remarks` for behavioral constraints (e.g. lifecycle state semantics, when RPC calls are accepted)
* `@example` snippet for non-obvious usage patterns (e.g. `ws.open()` must be called explicitly)

Example:

```typescript
/**
 * Demonstrates {@link IRpc}: registering, calling, and broadcasting RPC methods.
 *
 * @remarks
 * `siyuan.rpc.bind` should be called in `onload` so methods are ready when the
 * plugin reaches the `running` state. RPC calls are rejected with `-32002` if
 * the plugin has not yet reached `running`.
 */
private async onload(): Promise<void> { ... }
```

### Inline comments

Key constraints or non-obvious behavior are annotated at the call site:

```typescript
// Assign all callbacks before calling open() — onopen fires only after
// the TCP/WebSocket handshake completes.
await this.ws.open();
```

### Class-level TSDoc

`KernelPlugin` gets a full class-level doc block explaining:

* purpose (living reference for the kernel plugin API)
* lifecycle state diagram reference
* how to update the file when new APIs are added

---

## Type Usage

| Location                                         | Type                                                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `this.siyuan` field                              | `ISiyuan`                                                                                              |
| `this.ws` field                                  | `IWebSocket \| null`                                                                                   |
| `this.es` field                                  | `IEventSource \| null`                                                                                 |
| `onload` / `onloaded` / `onrunning` / `onunload` | `() => Promise<void>`                                                                                  |
| `eventHandler` param                             | `IEventMessage`                                                                                        |
| `httpHandler` param                              | `IServerRequest`                                                                                       |
| `httpHandler` return                             | `IHttpResponse`                                                                                        |
| `wsHandler` param                                | `IServerWsRequest`                                                                                     |
| `esHandler` param                                | `IServerEsRequest`                                                                                     |
| `any`                                            | Only where the underlying API type is already `any` (e.g. `IEventMessage.detail`, `IRpc.bind` fn args) |

---

## Files Changed

| File                          | Change                                                                                                                     |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sample/src/kernel.ts` | Full implementation (was a one-line stub)                                                                                  |
| `petal/kernel.d.ts`           | Add `IEsServerPort`, `IServerWsRequest`, `IServerEsRequest`; extend `IServerRequestHandler` generic; update `IServerScope` |

---

## Out of Scope

* No changes to `src/index.ts`, `plugin.json`, `webpack.config.js`, or any other file
* No new dependencies
* No unit tests (kernel plugin runs inside goja; tested by loading in a live SiYuan instance)
