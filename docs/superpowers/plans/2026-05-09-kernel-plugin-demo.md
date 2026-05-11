# Kernel Plugin Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the TypeScript kernel plugin demo in `plugin-sample/src/kernel.ts` and extend `petal/kernel.d.ts` with the server-side port types needed to fully type WS and SSE server handlers.

**Architecture:** Single `KernelPlugin` class covering all 8 API namespaces (`siyuan.plugin`, `siyuan.logger`, `console`, `siyuan.storage`, `siyuan.rpc`, `siyuan.client`, `siyuan.event`, `siyuan.server`). Type additions to `petal/kernel.d.ts` are additive and backward-compatible. The installed `siyuan` npm package in `plugin-sample/node_modules` is kept in sync manually until the package is republished.

**Tech Stack:** TypeScript 6, goja JS runtime (kernel-side), webpack (esbuild-loader), TSDoc.

**Spec:** `plugin-sample/docs/superpowers/specs/2026-05-09-kernel-plugin-demo-design.md`

---

## File Map

| File                                                                                    | Action               | Responsibility                                                                                                                      |
| --------------------------------------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `petal/kernel.d.ts`                                                                     | Modify lines 880–927 | Add `IEsServerPort`, `IServerWsRequest`, `IServerEsRequest`; extend `IServerRequestHandler` generic; update `IServerScope.ws`/`.es` |
| `plugin-sample/node_modules/.pnpm/siyuan@1.2.2-alpha.0/node_modules/siyuan/kernel.d.ts` | Overwrite            | Keep installed package in sync with `petal/kernel.d.ts` so TypeScript picks up new types locally                                    |
| `plugin-sample/src/kernel.ts`                                                           | Rewrite              | Full `KernelPlugin` class with TSDoc                                                                                                |

---

## Task 1: Extend `petal/kernel.d.ts` with server-side port types

**Files:**

* Modify: `petal/kernel.d.ts:880–927`

### Background

`IServerRequestHandler<TRes>` currently hard-codes `IServerRequest` as the handler argument. WS and SSE server handlers receive an augmented request with a `port` property — so we need:

* `IEsServerPort` — SSE server-side port (onopen/onclose/send/close)
* `IServerWsRequest extends IServerRequest` — adds `port: IWebSocket`
* `IServerEsRequest extends IServerRequest` — adds `port: IEsServerPort`
* `IServerRequestHandler<TRes, TReq extends IServerRequest = IServerRequest>` — second generic (default preserves backward compat); `handler` field uses `TReq`
* `IServerScope.ws` → `IServerRequestHandler<void, IServerWsRequest>`, `.es` → `IServerRequestHandler<void, IServerEsRequest>`

* [ ] **Step 1: Insert new interfaces before `IServerRequestHandler`**

  Open `petal/kernel.d.ts`. Find the comment `// ── Server handler interfaces ─────────────────────────────────────────────────` (line ~879). Insert the following block immediately before the `IServerRequestHandler` interface (i.e. before line 882):

  ```typescript
  // ── Server-side connection ports ──────────────────────────────────────────────

  /**
   * Server-side SSE (Server-Sent Events) port provided to
   * {@link IServerEsRequest.port}.
   *
   * @remarks
   * The kernel opens the SSE response stream before invoking the handler.
   * After the handler returns, the kernel fires {@link IEsServerPort.onopen}
   * to signal that the stream is ready. Call {@link IEsServerPort.send} to
   * push SSE events to the client and {@link IEsServerPort.close} to
   * terminate the stream. The connection stays open until `close()` is called
   * or the client disconnects.
   */
  export interface IEsServerPort {
      /** Called once when the SSE stream is ready to accept events. */
      onopen: ((event: IEventSourceOpenEvent) => void | Promise<void>) | null;
      /** Called when the client disconnects or after {@link IEsServerPort.close}. */
      onclose: ((event: IEventSourceCloseEvent) => void | Promise<void>) | null;
      /**
       * Pushes one SSE event to the connected client.
       *
       * @remarks
       * `send` is synchronous — no `await` required. It enqueues the event in
       * the kernel's SSE write buffer; the actual flush is asynchronous.
       *
       * @param eventType - Value for the SSE `event:` field (e.g. `"message"`, `"update"`).
       * @param data      - Value for the SSE `data:` field (UTF-8 string).
       */
      send(eventType: string, data: string): void;
      /** Terminates the SSE stream and closes the response. */
      close(): void;
  }

  /**
   * The request object received by {@link IServerScope.ws | WebSocket server handlers}.
   *
   * @remarks
   * Extends {@link IServerRequest} with a `port` property that mirrors the
   * {@link IWebSocket} client interface. The kernel upgrades the HTTP connection
   * to WebSocket before invoking the handler. After the handler returns, the
   * kernel auto-opens the port's read loop if `port.open()` was not called
   * explicitly.
   */
  export interface IServerWsRequest extends IServerRequest {
      /**
       * Bidirectional WebSocket port connected to the client.
       *
       * @remarks
       * Assign event callbacks (`onopen`, `onmessage`, `onping`, `onpong`,
       * `onclose`, `onerror`) before the handler returns. Calling `port.open()`
       * is optional — the kernel opens the read loop automatically.
       */
      readonly port: IWebSocket;
  }

  /**
   * The request object received by {@link IServerScope.es | SSE server handlers}.
   *
   * @remarks
   * Extends {@link IServerRequest} with a `port` property for pushing
   * Server-Sent Events to the client. The kernel opens the SSE response before
   * the handler is invoked; {@link IEsServerPort.onopen} fires once streaming
   * begins.
   */
  export interface IServerEsRequest extends IServerRequest {
      /**
       * Server-side SSE port for pushing events to the connected client.
       *
       * @remarks
       * Assign `onopen` and `onclose` callbacks in the handler body. Call
       * `port.send(eventType, data)` inside `onopen` to emit SSE events.
       */
      readonly port: IEsServerPort;
  }
  ```

* [ ] **Step 2: Replace `IServerRequestHandler` with the generic version**

  Replace the existing `IServerRequestHandler` interface (lines 882–899 approx):

  ```typescript
  // BEFORE:
  export interface IServerRequestHandler<TRes> {
      /**
       * The function invoked for each incoming request of this type.
       *
       * @remarks The kernel passes the parsed {@link IServerRequest} as the
       * sole argument and awaits any returned `Promise` before writing the
       * response.
       */
      handler: ((request: IServerRequest) => TRes | Promise<TRes>) | null;
  }
  ```

  With:

  ```typescript
  // AFTER:
  /**
   * Handler slot for one request type within a server scope.
   *
   * @remarks
   * The object is sealed by the kernel; only the `handler` property may be
   * reassigned. Set `handler` to `null` to leave the slot empty — the kernel
   * will return `500 Internal Server Error` for any unhandled request.
   *
   * @typeParam TRes - Expected return type of the handler function.
   * @typeParam TReq - Request object type passed to the handler. Defaults to
   *   {@link IServerRequest} for the HTTP slot; specialised to
   *   {@link IServerWsRequest} and {@link IServerEsRequest} for the WS and SSE
   *   slots respectively.
   */
  export interface IServerRequestHandler<TRes, TReq extends IServerRequest = IServerRequest> {
      /**
       * The function invoked for each incoming request of this type.
       *
       * @remarks
       * The kernel passes the parsed request as the sole argument and awaits
       * any returned `Promise` before writing the response.
       */
      handler: ((request: TReq) => TRes | Promise<TRes>) | null;
  }
  ```

* [ ] **Step 3: Update `IServerScope.ws` and `.es`**

  Replace the `IServerScope` interface body (the `ws` and `es` readonly properties and their doc blocks). The `http` property is unchanged.

  ```typescript
  // BEFORE (ws block):
      /**
       * WebSocket upgrade handler.
       *
       * @remarks Reserved — not yet implemented by the kernel.
       */
      readonly ws: IServerRequestHandler<void>;
      /**
       * Server-Sent Events handler.
       *
       * @remarks Reserved — not yet implemented by the kernel.
       */
      readonly es: IServerRequestHandler<void>;
  ```

  ```typescript
  // AFTER (ws + es blocks):
      /**
       * WebSocket upgrade handler.
       *
       * @remarks
       * The handler receives an {@link IServerWsRequest} that includes
       * `request.port`, a bidirectional {@link IWebSocket} connected to the
       * client. Assign event callbacks before the handler returns; the kernel
       * auto-opens the port's read loop afterwards.
       */
      readonly ws: IServerRequestHandler<void, IServerWsRequest>;
      /**
       * Server-Sent Events handler.
       *
       * @remarks
       * The handler receives an {@link IServerEsRequest} that includes
       * `request.port`, an {@link IEsServerPort} for pushing SSE events.
       * Assign `onopen` / `onclose` callbacks and call `port.send` inside
       * `onopen`.
       */
      readonly es: IServerRequestHandler<void, IServerEsRequest>;
  ```

* [ ] **Step 4: Sync installed package**

  Copy the updated file so TypeScript in `plugin-sample` picks up the changes.
  Run from the `plugin-sample` root (both repos are siblings):

  ```bash
  cp ../petal/kernel.d.ts \
     node_modules/.pnpm/siyuan@1.2.2-alpha.0/node_modules/siyuan/kernel.d.ts
  ```

* [ ] **Step 5: Commit `petal/kernel.d.ts`**

  ```bash
  cd ../petal
  git add kernel.d.ts
  git commit -m "feat(kernel): add IEsServerPort, IServerWsRequest, IServerEsRequest; extend IServerRequestHandler generic"
  ```

---

## Task 2: Implement `plugin-sample/src/kernel.ts`

**Files:**

* Modify: `plugin-sample/src/kernel.ts` (currently a one-line stub)

The full file content is specified below. Each method covers one or more API namespaces as documented in the spec. All type annotations reference interfaces from `petal/kernel.d.ts` via `/// <reference types="siyuan/kernel" />`.

* [ ] **Step 1: Write the full file**

  Replace the entire contents of `plugin-sample/src/kernel.ts` with:

  ````typescript
  /// <reference types="siyuan/kernel" />

  /**
   * Reference implementation of the kernel plugin API for SiYuan.
   *
   * @remarks
   * This class exercises every public surface on `globalThis.siyuan`. It is the
   * living reference for community developers and is updated in lock-step with
   * `petal/kernel.d.ts` whenever new kernel APIs are added.
   *
   * ## Lifecycle state machine
   *
   * ```
   * ready → loading → loaded → running → stopping → stopped
   *          ↓onload   ↓onloaded  ↓onrunning  ↓onunload
   * ```
   *
   * Each hook is `async`-safe: the kernel awaits the returned `Promise` before
   * advancing to the next state, so slow hooks stall the plugin's own startup.
   * Keep hooks non-blocking; defer long-running work to fire-and-forget tasks.
   *
   * ## Adding a new API
   *
   * 1. Add the type declaration to `petal/kernel.d.ts`.
   * 2. Add a demonstration call in the appropriate lifecycle method below.
   * 3. Add a TSDoc block linking to the new interface and explaining any
   *    non-obvious constraints.
   */
  class KernelPlugin {
      private readonly siyuan: ISiyuan = globalThis.siyuan;

      /** Client-side WebSocket connection to the plugin's own RPC endpoint. */
      private ws: IWebSocket | null = null;

      /** Client-side SSE connection to the kernel broadcast endpoint. */
      private es: IEventSource | null = null;

      constructor() {
          // Wire lifecycle hooks
          this.siyuan.plugin.lifecycle.onload = this.onload.bind(this);
          this.siyuan.plugin.lifecycle.onloaded = this.onloaded.bind(this);
          this.siyuan.plugin.lifecycle.onrunning = this.onrunning.bind(this);
          this.siyuan.plugin.lifecycle.onunload = this.onunload.bind(this);

          // Wire the inbound kernel event handler
          this.siyuan.event.handler = this.eventHandler.bind(this);

          // Wire server-side request handlers (private scope: /plugin/private/<name>/*)
          this.siyuan.server.private.http.handler = this.httpHandler.bind(this);
          this.siyuan.server.private.ws.handler = this.wsHandler.bind(this);
          this.siyuan.server.private.es.handler = this.esHandler.bind(this);
      }

      // ── Lifecycle ─────────────────────────────────────────────────────────────

      /**
       * Demonstrates {@link IRpc} and {@link IStorage}.
       *
       * @remarks
       * Called when the plugin script is first evaluated. Register RPC methods
       * here so they are ready once the plugin reaches the `running` state.
       * RPC calls are rejected with `-32002` before `running` is reached.
       *
       * `siyuan.storage` paths are relative to
       * `data/storage/petal/<plugin-name>/`. Path traversal is blocked by the
       * kernel.
       *
       * @example
       * ```ts
       * await siyuan.rpc.bind("echo", async (...args) => args, "description");
       * ```
       */
      private async onload(): Promise<void> {
          const { rpc, storage, logger, plugin } = this.siyuan;

          // ── siyuan.logger (all five levels) ───────────────────────────────────
          // Unlike console.*, each call returns a Promise and serialises args as JSON.
          await logger.trace("onload: plugin name =", plugin.name);
          await logger.debug("onload: version =", plugin.version);
          await logger.info("onload: platform =", plugin.platform);
          await logger.warn("onload: i18n keys =", Object.keys(plugin.i18n));
          await logger.error("onload: (error-level demo — not a real error)");

          // ── console.* (synchronous, Node.js util.format, 3 levels) ────────────
          // Routed to the kernel log at INFO/WARN/ERROR. No await needed.
          console.log("onload: console.log  (sync, util.format)");
          console.warn("onload: console.warn");
          console.error("onload: console.error");

          // ── siyuan.rpc ────────────────────────────────────────────────────────
          // bind(name, fn, ...descriptions): registers a JSON-RPC method.
          // The third argument and beyond are optional human-readable descriptions.
          await rpc.bind(
              "echo",
              async (...args: any[]) => {
                  await logger.debug("echo called with:", args);
                  return args;
              },
              "Returns all received arguments unchanged.",
          );

          // ── siyuan.storage ────────────────────────────────────────────────────
          // put: write a UTF-8 string to a path relative to the plugin data dir
          await storage.put("demo.txt", new Date().toISOString());

          // get: returns IDataObject — a lazy accessor; call each decoder at most once
          const obj = await storage.get("demo.txt");
          await logger.debug("storage.get → text():", await obj.text());

          const obj2 = await storage.get("demo.txt");
          await logger.debug("storage.get → json():", await obj2.json());

          const obj3 = await storage.get("demo.txt");
          await logger.debug("storage.get → arrayBuffer():", await obj3.arrayBuffer());

          // list: returns IStorageEntry[] for the given relative directory
          const entries = await storage.list(".");
          await logger.debug("storage.list:", entries);

          // remove: deletes a file or directory tree
          await storage.remove("demo.txt");
      }

      /**
       * Demonstrates {@link IClient.fetch} against the kernel's own REST API.
       *
       * @remarks
       * Called after all plugins have completed `onload`. At this point every
       * enabled kernel plugin is visible in the plugin registry.
       *
       * `siyuan.client.fetch` tunnels the request through the kernel and injects
       * the plugin's JWT token automatically — no manual auth header needed.
       *
       * @example
       * ```ts
       * const resp = await siyuan.client.fetch("/api/system/version", { method: "POST", body: "{}" });
       * const data = await resp.json();
       * ```
       */
      private async onloaded(): Promise<void> {
          const { client, logger } = this.siyuan;

          // List all loaded plugins via the kernel REST API.
          // fetch() returns IFetchResponse; the body is a lazy IDataObject.
          const resp = await client.fetch("/api/plugin/listLoadedPlugins", {
              method: "POST",
              // body must be a string or ArrayBuffer
              body: "{}",
          });

          await logger.debug("onloaded: resp.ok =", resp.ok);
          await logger.debug("onloaded: resp.status =", resp.status);
          await logger.debug("onloaded: resp.statusText =", resp.statusText);
          await logger.debug("onloaded: resp.headers =", resp.headers);
          await logger.debug("onloaded: listLoadedPlugins =", await resp.json());
      }

      /**
       * Demonstrates {@link IClient.socket} (WebSocket client) and
       * {@link IClient.event} (SSE client), plus an HTTP JSON-RPC loopback call.
       *
       * @remarks
       * Called after `onloaded` resolves. The kernel is fully running and all
       * RPC methods registered in `onload` are now reachable.
       *
       * ### WebSocket client
       * `siyuan.client.socket` returns a sealed {@link IWebSocket} in
       * `CONNECTING` state immediately. **`ws.open()` must be called explicitly**
       * to initiate the TCP/WebSocket handshake; `onopen` fires only after
       * `open()` resolves. Assign all callbacks before calling `open()`.
       *
       * ### SSE client
       * `siyuan.client.event` returns immediately; the kernel starts the SSE
       * subscription in the background and fires `onopen` once connected.
       *
       * @example
       * ```ts
       * // Assign all callbacks BEFORE calling open().
       * const ws = await siyuan.client.socket("/ws/plugin/rpc/my-plugin");
       * ws.onopen = async () => { await ws.send("hello"); };
       * await ws.open();
       * ```
       */
      private async onrunning(): Promise<void> {
          const { client, logger, plugin } = this.siyuan;

          // ── HTTP RPC loopback (JS → HTTP → Go → JS → Go → HTTP → JS) ──────────
          const echoResp = await client.fetch(
              `/api/plugin/rpc/${plugin.name}`,
              {
                  method: "POST",
                  // body must be a string — stringify the JSON-RPC payload
                  body: JSON.stringify({
                      jsonrpc: "2.0",
                      method: "echo",
                      params: ["hello from onrunning", 42, { key: true }],
                      id: 1,
                  }),
              },
          );
          await logger.debug("onrunning: HTTP RPC echo =", await echoResp.json());

          // ── WebSocket client ──────────────────────────────────────────────────
          this.ws = await client.socket(`/ws/plugin/rpc/${plugin.name}`);

          // Assign all callbacks before calling open() — onopen fires only after
          // the TCP/WebSocket handshake completes.
          this.ws.onopen = async (event) => {
              await logger.debug("ws client: open", event);
              // Send a JSON-RPC request over the WebSocket connection
              await this.ws!.send(JSON.stringify({
                  jsonrpc: "2.0",
                  method: "echo",
                  params: { message: "hello via WebSocket", ts: Date.now() },
                  id: 2,
              }));
              // Demonstrate ping/pong control frames
              await this.ws!.ping("ping from plugin");
          };
          this.ws.onmessage = async (event) => {
              await logger.debug("ws client: message", event);
          };
          this.ws.onping = async (event) => {
              await logger.debug("ws client: ping", event);
          };
          this.ws.onpong = async (event) => {
              await logger.debug("ws client: pong", event);
          };
          this.ws.onerror = async (event) => {
              await logger.debug("ws client: error", event);
          };
          this.ws.onclose = async (event) => {
              await logger.debug("ws client: close", event);
          };

          // Initiate the connection after wiring all callbacks
          await this.ws.open();

          // ── SSE / EventSource client ──────────────────────────────────────────
          this.es = await client.event("/es/broadcast/subscribe");
          this.es.onopen = async (e) => {
              await logger.debug("es client: open", e);
          };
          this.es.onmessage = async (e) => {
              await logger.debug("es client: message", e);
          };
          this.es.onclose = async (e) => {
              await logger.debug("es client: close", e);
          };
          this.es.onerror = async (e) => {
              await logger.debug("es client: error", e);
          };
      }

      /**
       * Demonstrates {@link IRpc.broadcast} and connection cleanup.
       *
       * @remarks
       * Called when the plugin is stopping. `rpc.broadcast` pushes a JSON-RPC
       * 2.0 notification (no `id`) to all connected RPC WebSocket clients. It
       * is a no-op if the plugin is not in the `running` state, so it is safe
       * to call here even during a fast shutdown.
       *
       * After broadcasting, close any open client-side connections to avoid
       * resource leaks in the kernel process.
       */
      private async onunload(): Promise<void> {
          const { rpc, logger } = this.siyuan;

          // Unbind the RPC method registered in onload
          await rpc.unbind("echo");

          // Push a notification to all connected RPC WebSocket clients
          await rpc.broadcast("unload", ["Plugin is unloading"]);

          // Close client-side connections — optional chaining guards against the
          // case where onrunning was never reached (e.g. error during startup)
          this.ws?.close();
          this.es?.close();

          await logger.debug("onunload: cleanup complete");
      }

      // ── Event bridge ──────────────────────────────────────────────────────────

      /**
       * Demonstrates {@link IEvent.handler} (receive) and {@link IEvent.emit} (publish).
       *
       * @remarks
       * `siyuan.event.handler` receives every kernel broadcast event.
       * `event` has shape `{ id: UUID, type: string, detail: any }`.
       *
       * `siyuan.event.emit` publishes an event to the in-process bus.
       * The first argument is the topic string used for routing;
       * the second is the payload.
       *
       * @param event - The incoming kernel event message.
       */
      private async eventHandler(event: IEventMessage): Promise<void> {
          const { event: eventApi, logger } = this.siyuan;

          await logger.debug("event received:", event);

          // Re-publish the event under the "plugin" topic
          await eventApi.emit("plugin", {
              id: event.id,
              type: "echo",
              detail: event,
          });
      }

      // ── Server-side handlers ──────────────────────────────────────────────────

      /**
       * Demonstrates the HTTP server handler at
       * `ANY /plugin/private/<name>/*path`.
       *
       * @remarks
       * Must return an {@link IHttpResponse}. The `body` field supports:
       * `data` (JSON / XML / YAML / …), `file` (local filesystem path),
       * `string` (Go `fmt.Sprintf`), `raw` (bytes + Content-Type), `redirect`.
       * Set exactly one; the kernel uses the first non-null value.
       *
       * The route requires kernel authentication and admin role — unauthenticated
       * requests are rejected before reaching the handler.
       *
       * @param request - Parsed URL, headers, body, and Gin routing context.
       * @returns An {@link IHttpResponse} that the kernel writes to the client.
       */
      private async httpHandler(request: IServerRequest): Promise<IHttpResponse> {
          await this.siyuan.logger.debug("http handler: path =", request.url.path);

          return {
              statusCode: 200,
              headers: {
                  // Multi-value headers are arrays of strings
                  "X-Plugin": [this.siyuan.plugin.name],
              },
              body: {
                  // type: "JSON" delegates to c.JSON in Gin
                  data: {
                      type: "JSON",
                      data: {
                          path: request.url.path,
                          method: request.request.method,
                          contentType: request.request.contentType,
                          query: request.url.query,
                          params: request.context.params,
                      },
                  },
              },
          };
      }

      /**
       * Demonstrates the WebSocket server handler at
       * `GET /plugin/private/<name>/*path` (WebSocket upgrade).
       *
       * @remarks
       * `request.port` mirrors the {@link IWebSocket} interface — same event
       * callbacks, same `send` / `ping` / `pong` / `close` methods.
       *
       * Assign all callbacks in this handler body. The kernel auto-opens the
       * port's read loop after the handler returns; calling `port.open()`
       * explicitly is optional.
       *
       * `onmessage` events carry
       * `{ type: "text" | "binary", data: string | ArrayBuffer }`.
       *
       * @param request - Server request augmented with `port` (a bidirectional
       *   WebSocket back-channel to the connected client).
       */
      private async wsHandler(request: IServerWsRequest): Promise<void> {
          const { logger } = this.siyuan;

          request.port.onopen = async (event) => {
              await logger.debug("ws server: port open", event);
              // Greet the client on connection
              await request.port.send("Hello from plugin WebSocket server!");
          };
          request.port.onmessage = async (event) => {
              await logger.debug("ws server: message", event);
              // Echo the message back to the client
              await request.port.send(event.data as string);
          };
          request.port.onping = async (event) => {
              await logger.debug("ws server: ping", event);
              // Reply with a pong carrying the same application data
              await request.port.pong(event.data);
          };
          request.port.onpong = async (event) => {
              await logger.debug("ws server: pong", event);
          };
          request.port.onclose = async (event) => {
              await logger.debug("ws server: close", event);
          };
          request.port.onerror = async (event) => {
              await logger.debug("ws server: error", event);
          };
          // port.open() is optional — the kernel auto-opens after this handler returns.
      }

      /**
       * Demonstrates the SSE server handler at
       * `GET /plugin/private/<name>/*path` (Server-Sent Events).
       *
       * @remarks
       * `request.port.onopen` fires once the SSE stream is ready. Call
       * `port.send(eventType, data)` inside `onopen` or later to push events.
       * `eventType` maps to the SSE `event:` field; `data` maps to `data:`.
       * `send` is **synchronous** — no `await` needed.
       *
       * The connection stays open until `port.close()` is called or the
       * client disconnects, which fires `onclose`.
       *
       * @param request - Server request augmented with `port` (an SSE
       *   back-channel to the connected client).
       */
      private async esHandler(request: IServerEsRequest): Promise<void> {
          const { logger } = this.siyuan;

          request.port.onopen = async (event) => {
              await logger.debug("sse server: port open", event);
              // send is synchronous; eventType becomes the SSE `event:` field
              request.port.send("message", "Connected to plugin SSE!");
              request.port.send("update", JSON.stringify({ ts: Date.now() }));
          };
          request.port.onclose = async (event) => {
              await logger.debug("sse server: port close", event);
          };
      }
  }

  new KernelPlugin();
  ````

* [ ] **Step 2: Verify TypeScript types**

  The project uses `esbuild-loader` which strips types without checking them — `npm run build` will succeed even if types are wrong. Use `tsc --noEmit` to actually type-check.
  Run from the `plugin-sample` root:

  ```bash
  npx tsc --noEmit 2>&1
  ```

  Expected: no output (zero errors). Fix any reported errors before proceeding.

* [ ] **Step 3: Build the production bundle**

  ```bash
  npm run build 2>&1 | tail -20
  ```

  Expected: webpack exits with code 0. The build produces `dist/kernel.js`.

* [ ] **Step 4: Commit `plugin-sample/src/kernel.ts`**

  ```bash
  git add src/kernel.ts
  git commit -m "feat: implement kernel plugin demo with full API coverage and TSDoc"
  ```

---

## Task 3: Verify the built output is valid for the goja runtime

The webpack build outputs `kernel.js` in CommonJS2 format. The goja runtime in the kernel loads it as a CommonJS module.

* [ ] **Step 1: Confirm `siyuan` is the only external `require` call**

  `webpack.config.js` declares `siyuan` as an external, so `require("siyuan")` will appear in the bundle — that is expected and intentional. Any other `require("<package-name>")` would indicate an accidental import of a module the goja runtime cannot resolve.
  Run from the `plugin-sample` root:

  ```bash
  grep -o 'require("[^"]*")' dist/kernel.js | sort -u
  ```

  Expected output: exactly `require("siyuan")` (the external stub). Any additional package name is a bug — investigate and remove the offending import.

* [ ] **Step 2: Confirm file size is reasonable**

  ```bash
  wc -c dist/kernel.js
  ```

  Expected: a few kilobytes (minified). A multi-megabyte file would indicate an accidental bundling of large dependencies.
