/// <reference types="siyuan/kernel" />

import type * as kernel from 'siyuan/kernel';

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
    private readonly siyuan: kernel.ISiyuan = siyuan;

    /** Client-side WebSocket connection to the plugin's own RPC endpoint. */
    private ws: kernel.IWebSocket | null = null;

    /** Client-side SSE connection to the kernel broadcast endpoint. */
    private es: kernel.IEventSource | null = null;

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
     * Demonstrates {@link kernel.IRpc} and {@link kernel.IStorage}.
     *
     * @remarks
     * Called when the plugin script is first evaluated. Register RPC methods
     * here so they are ready once the plugin reaches the `running` state.
     * RPC calls are rejected with `-32002` before `running` is reached.
     *
     * {@link kernel.IStorage} paths are relative to
     * `data/storage/petal/<plugin-name>/`. Path traversal is blocked by the
     * kernel. Each {@link kernel.IDataObject} returned by `storage.get` is
     * single-use — call at most one decoder per instance.
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
        await storage.put("demo.txt", JSON.stringify(new Date().toISOString()));

        // get: returns IDataObject — a lazy accessor. Each IDataObject is single-use:
        // call at most one decoder (.text(), .json(), or .arrayBuffer()) per instance.
        // A separate get() call is required for each decoder demonstration here.
        const obj = await storage.get("demo.txt");
        await logger.debug("storage.get → text():", await obj.text());

        await logger.debug("storage.get → json():", await obj.json());

        await logger.debug("storage.get → arrayBuffer():", await obj.arrayBuffer());

        await logger.debug("storage.get → buffer():", await obj.buffer());

        // list: returns IStorageEntry[] for the given relative directory
        const entries = await storage.list(".");
        await logger.debug("storage.list:", entries);

        // remove: deletes a file or directory tree
        await storage.remove("demo.txt");

        try {
            throw new Error("This is a test error to demonstrate logger.error with stack trace");
        } catch (error) {
            console.error((error as Error).stack?.trim());
        }
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
        this.ws.onmessage = async (event) => { await logger.debug("ws client: message", event); };
        this.ws.onping = async (event) => { await logger.debug("ws client: ping", event); };
        this.ws.onpong = async (event) => { await logger.debug("ws client: pong", event); };
        this.ws.onerror = async (event) => { await logger.debug("ws client: error", event); };
        this.ws.onclose = async (event) => { await logger.debug("ws client: close", event); };

        // Initiate the connection after wiring all callbacks
        await this.ws.open();

        // ── SSE / EventSource client ──────────────────────────────────────────
        this.es = await client.event("/es/broadcast/subscribe");
        this.es.onopen = async (e) => { await logger.debug("es client: open", e); };
        this.es.onmessage = async (e) => { await logger.debug("es client: message", e); };
        this.es.onclose = async (e) => { await logger.debug("es client: close", e); };
        this.es.onerror = async (e) => { await logger.debug("es client: error", e); };
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
    private async eventHandler(event: kernel.IEventMessage): Promise<void> {
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
    private async httpHandler(request: kernel.IServerRequest): Promise<kernel.IHttpResponse> {
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
    private async wsHandler(request: kernel.IServerWsRequest): Promise<void> {
        const { logger } = this.siyuan;

        request.port.onopen = async (event) => {
            await logger.debug("ws server: port open", event);
            // Greet the client on connection
            await request.port.send("Hello from plugin WebSocket server!");
        };
        request.port.onmessage = async (event) => {
            await logger.debug("ws server: message", event);
            // send text frames back as-is; convert binary frames to a string representation
            if (typeof event.data === "string") {
                await request.port.send(event.data);
            } else {
                // Binary frame — event.data is always ArrayBuffer in the else branch
                await request.port.send(new TextDecoder().decode(event.data as ArrayBuffer));
            }
        };
        request.port.onping = async (event) => {
            await logger.debug("ws server: ping", event);
            // Reply with a pong carrying the same application data
            await request.port.pong(event.data);
        };
        request.port.onpong = async (event) => { await logger.debug("ws server: pong", event); };
        request.port.onclose = async (event) => { await logger.debug("ws server: close", event); };
        request.port.onerror = async (event) => { await logger.debug("ws server: error", event); };
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
    private async esHandler(request: kernel.IServerEsRequest): Promise<void> {
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
        // Note: IEsServerPort has no onerror callback — SSE errors surface as onclose.
    }
}

new KernelPlugin();
