/// <reference types="siyuan/kernel" />

import type * as kernel from "siyuan/kernel";

/**
 * 列出 globalThis 上的所有属性以查看 goja 引擎支持的全局对象和内置模块。
 * List all properties on globalThis to see the global objects and built-in modules supported by the goja engine.
 */
console.log(Object.getOwnPropertyNames(globalThis));
// Object,Function,Array,String,Number,BigInt,RegExp,Date,Boolean,Proxy,Reflect,Error,AggregateError,TypeError,ReferenceError,SyntaxError,RangeError,EvalError,URIError,GoError,eval,Math,JSON,ArrayBuffer,DataView,Uint8Array,Uint8ClampedArray,Int8Array,Uint16Array,Int16Array,Uint32Array,Int32Array,Float32Array,Float64Array,BigInt64Array,BigUint64Array,Symbol,WeakSet,WeakMap,Map,Set,Promise,globalThis,NaN,undefined,Infinity,isNaN,parseInt,parseFloat,isFinite,decodeURI,decodeURIComponent,encodeURI,encodeURIComponent,escape,unescape,require,console,setTimeout,setInterval,setImmediate,clearTimeout,clearInterval,clearImmediate,URL,URLSearchParams,Buffer,siyuan

/**
 * SiYuan 内核插件 API 的参考实现。
 *
 * This file provides a reference implementation of the SiYuan kernel plugin API.
 *
 * @remarks
 * 该类调用 `globalThis.siyuan` 的所有公共接口。
 * 它作为社区开发者的活体参考。
 *
 * ---
 * This class exercises every public surface on `globalThis.siyuan`.
 * It is the living reference for community developers.
 *
 * ## 生命周期状态机
 *
 * ready → loading → loaded → running → stopping → stopped
 *          ↓onload   ↓onloaded  ↓onrunning  ↓onunload
 *
 * 每个钩子都是异步安全的。
 * 内核会等待返回的 `Promise` 完成后再前进到下一个状态。
 * 因此慢的钩子会阻塞插件自身启动。
 * 请保持钩子非阻塞。
 * 将耗时工作交给 fire-and-forget 的任务。
 *
 * ---
 * ## Lifecycle state machine
 *
 * ready → loading → loaded → running → stopping → stopped
 *          ↓onload   ↓onloaded  ↓onrunning  ↓onunload
 *
 * Each hook is async-safe.
 * The kernel awaits the returned `Promise` before advancing to the next state.
 * Slow hooks therefore stall the plugin's own startup.
 * Keep hooks non-blocking.
 * Defer long-running work to fire-and-forget tasks.
 *
 * ## 添加新 API 的步骤
 *
 * 1. 在 `petal/kernel.d.ts` 中添加类型声明。
 * 2. 在相应的生命周期方法中添加示例调用。
 * 3. 添加 TSDoc 块来说明任何特殊约束。
 *
 * ---
 * ## Adding a new API
 *
 * 1. Add the type declaration to `petal/kernel.d.ts`.
 * 2. Add a demonstration call in the appropriate lifecycle method below.
 * 3. Add a TSDoc block linking to the new interface and explaining any non-obvious constraints.
 */
class KernelPlugin {
    private readonly siyuan: kernel.ISiyuan = siyuan;

    /**
     * 客户端 WebSocket 连接。
     * 连接到插件自身的 RPC 端点。
     *
     * ---
     * Client-side WebSocket connection.
     * Connects to the plugin's own RPC endpoint.
     */
    private ws: kernel.IWebSocket | null = null;

    /**
     * 客户端 SSE 连接。
     * 订阅内核广播端点。
     *
     * ---
     * Client-side SSE connection.
     * Subscribes to the kernel broadcast endpoint.
     */
    private es: kernel.IEventSource | null = null;

    constructor() {
        // 绑定生命周期钩子。
        // Wire lifecycle hooks.
        this.siyuan.plugin.lifecycle.onload = this.onload.bind(this);
        this.siyuan.plugin.lifecycle.onloaded = this.onloaded.bind(this);
        this.siyuan.plugin.lifecycle.onrunning = this.onrunning.bind(this);
        this.siyuan.plugin.lifecycle.onunload = this.onunload.bind(this);

        // 绑定内核入站事件处理器。
        // Wire the inbound kernel event handler.
        this.siyuan.event.handler = this.eventHandler.bind(this);

        // 绑定服务器端请求处理器（私有作用域：/plugin/private/<name>/*）。
        // Wire server-side request handlers (private scope: /plugin/private/<name>/*).
        this.siyuan.server.private.http.handler = this.httpHandler.bind(this);
        this.siyuan.server.private.ws.handler = this.wsHandler.bind(this);
        this.siyuan.server.private.es.handler = this.esHandler.bind(this);
    }

    // ── 生命周期 / Lifecycle ─────────────────────────────────────────────────

    /**
     * 演示 {@link kernel.IRpc} 的用法。
     * 演示 {@link kernel.IStorage} 的用法。
     *
     * @remarks
     * 在插件脚本首次求值时调用。
     * 在这里注册 RPC 方法，使其在插件到达 `running` 状态后可用。
     * 在 `running` 之前对 RPC 的调用会以 `-32002` 拒绝。
     *
     * {@link kernel.IStorage} 的路径相对于 `data/storage/petal/<plugin-name>/`。
     * 内核会阻止路径遍历。
     * `storage.get` 返回的每个 {@link kernel.IDataObject} 只能使用一次。
     * 每个实例最多调用一个解码器。
     *
     * ---
     * Demonstrates {@link kernel.IRpc} usage.
     * Demonstrates {@link kernel.IStorage} usage.
     *
     * Called when the plugin script is first evaluated.
     * Register RPC methods here so they are ready once the plugin reaches the `running` state.
     * RPC calls are rejected with `-32002` before `running` is reached.
     *
     * {@link kernel.IStorage} paths are relative to `data/storage/petal/<plugin-name>/`.
     * Path traversal is blocked by the kernel.
     * Each {@link kernel.IDataObject} returned by `storage.get` is single-use.
     * Call at most one decoder per instance.
     *
     * @example
     * ```ts
     * await siyuan.rpc.bind("echo", async (...args) => args, "description");
     * ```
     */
    private async onload(): Promise<void> {
        const {rpc, storage, logger, plugin} = this.siyuan;

        // ── siyuan.logger（示例）
        // ── siyuan.logger (example)
        // 与 console.* 不同，每次调用返回 Promise，并将参数序列化为 JSON。
        // Unlike console.*, each call returns a Promise and serialises args as JSON.
        await logger.trace("onload: plugin name =", plugin.name);
        await logger.debug("onload: version =", plugin.version);
        await logger.info("onload: platform =", plugin.platform);
        await logger.warn("onload: i18n keys =", Object.keys(plugin.i18n));
        await logger.error("onload: (error-level demo — not a real error)");

        // ── console.*（同步，Node.js util.format）
        // ── console.* (synchronous, Node.js util.format)
        // 会路由到内核日志的 INFO/WARN/ERROR。无需 await。
        // Routed to the kernel log at INFO/WARN/ERROR. No await needed.
        console.log("onload: console.log  (sync, util.format)");
        console.warn("onload: console.warn");
        console.error("onload: console.error");

        // ── siyuan.rpc 示例
        // bind(name, fn, ...descriptions)：注册一个 JSON-RPC 方法。
        // bind(name, fn, ...descriptions): registers a JSON-RPC method.
        // 第三个及其后参数为可选的人类可读描述。
        // The third argument and beyond are optional human-readable descriptions.
        await rpc.bind(
            "echo",
            async (...args: any[]) => {
                await logger.debug("echo called with:", args);
                return args;
            },
            "Returns all received arguments unchanged.",
        );

        // ── siyuan.storage 示例

        // 监听插件存储目录的文件系统事件。
        // Watch filesystem events in the plugin storage directory.
        await storage.watcher.add("./");

        // put：将 UTF-8 字符串写入相对于插件数据目录的路径。
        // put: write a UTF-8 string to a path relative to the plugin data dir.
        await storage.put("demo.txt", JSON.stringify(new Date().toISOString()));

        // get：返回 IDataObject — 懒加载访问器。
        // 每个 IDataObject 为单次使用。
        // 调用时每个实例最多使用一个解码器（.text(), .json(), .arrayBuffer()）。
        // get: returns IDataObject — a lazy accessor.
        // Each IDataObject is single-use.
        // Call at most one decoder (.text(), .json(), or .arrayBuffer()) per instance.
        const obj = await storage.get("demo.txt");
        await logger.debug("storage.get → text():", await obj.text());

        await logger.debug("storage.get → json():", await obj.json());

        await logger.debug("storage.get → arrayBuffer():", await obj.arrayBuffer());

        await logger.debug("storage.get → buffer():", await obj.buffer());

        // list：返回指定相对目录下的 IStorageEntry[]。
        // list: returns IStorageEntry[] for the given relative directory.
        const entries = await storage.list(".");
        await logger.debug("storage.list:", entries);

        // remove：删除文件或目录树。
        // remove: deletes a file or directory tree.
        await storage.remove("demo.txt");

        try {
            throw new Error("This is a test error to demonstrate logger.error with stack trace");
        } catch (error) {
            console.error((error as Error).stack?.trim());
        }
    }

    /**
     * 演示通过内核自身的 REST API 使用 {@link IClient.fetch}。
     *
     * @remarks
     * 在所有插件完成 `onload` 后调用。
     * 此时已加载的插件可在插件注册表中看到。
     *
     * `siyuan.client.fetch` 会通过内核隧道请求并自动注入插件的 JWT token。
     * 无需手动设置认证头。
     *
     * ---
     * Demonstrates {@link IClient.fetch} against the kernel's own REST API.
     *
     * Called after all plugins have completed `onload`.
     * At this point every enabled kernel plugin is visible in the plugin registry.
     *
     * `siyuan.client.fetch` tunnels the request through the kernel and injects
     * the plugin's JWT token automatically.
     * No manual auth header is needed.
     *
     * @example
     * ```ts
     * const resp = await siyuan.client.fetch("/api/system/version", { method: "POST", body: "{}" });
     * const data = await resp.json();
     * ```
     */
    private async onloaded(): Promise<void> {
        const {client, logger} = this.siyuan;

        // 列出通过内核 REST API 加载的所有插件。
        // List all loaded plugins via the kernel REST API.
        // fetch() 返回 IFetchResponse；body 为懒加载的 IDataObject。
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
     * 演示 {@link IClient.socket} 和 {@link IClient.event}，
     * 以及一个 HTTP JSON-RPC 回环调用。
     *
     * @remarks
     * 在 `onloaded` 解析后调用。
     * 此时内核已完全运行。
     * `onload` 中注册的 RPC 方法均可调用。
     *
     * ### WebSocket 客户端
     * `siyuan.client.socket` 立即返回一个封闭的 {@link IWebSocket} 且处于 `CONNECTING` 状态。
     * 必须显式调用 `ws.open()` 发起握手。
     * 在调用 `open()` 前先分配所有回调。
     *
     * ### SSE 客户端
     * `siyuan.client.event` 立即返回。
     * 内核在后台启动 SSE 订阅并在连接后触发 `onopen`。
     *
     * ---
     * Demonstrates {@link IClient.socket} (WebSocket client) and
     * {@link IClient.event} (SSE client), plus an HTTP JSON-RPC loopback call.
     *
     * Called after `onloaded` resolves.
     * The kernel is fully running and all RPC methods registered in `onload` are now reachable.
     *
     * ### WebSocket client
     * `siyuan.client.socket` returns a sealed {@link IWebSocket} in `CONNECTING` state.
     * `ws.open()` must be called explicitly to initiate the TCP/WebSocket handshake.
     * Assign all callbacks before calling `open()`.
     *
     * ### SSE client
     * `siyuan.client.event` returns immediately.
     * The kernel starts the SSE subscription in the background and fires `onopen` once connected.
     *
     * @example
     * ```ts
     * const ws = await siyuan.client.socket("/ws/plugin/rpc/my-plugin");
     * ws.onopen = async () => { await ws.send("hello"); };
     * await ws.open();
     * ```
     */
    private async onrunning(): Promise<void> {
        const {client, logger, plugin} = this.siyuan;

        // ── HTTP RPC 回环（示例）
        // ── HTTP RPC loopback (example)
        const echoResp = await client.fetch(
            `/api/plugin/rpc/${plugin.name}`,
            {
                method: "POST",
                // body must be a string — stringify the JSON-RPC payload
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "echo",
                    params: ["hello from onrunning", 42, {key: true}],
                    id: 1,
                }),
            },
        );
        await logger.debug("onrunning: HTTP RPC echo =", await echoResp.json());

        // ── WebSocket 客户端示例
        // ── WebSocket client example
        this.ws = await client.socket(`/ws/plugin/rpc/${plugin.name}`);

        // 在调用 open() 之前分配所有回调。
        // Assign all callbacks before calling open().
        this.ws.onopen = async (event) => {
            await logger.debug("ws client: open", event);
            // 通过 WebSocket 发送一个 JSON-RPC 请求。
            // Send a JSON-RPC request over the WebSocket connection.
            await this.ws!.send(JSON.stringify({
                jsonrpc: "2.0",
                method: "echo",
                params: {message: "hello via WebSocket", ts: Date.now()},
                id: 2,
            }));
            // 演示 ping/pong 控制帧。
            // Demonstrate ping/pong control frames.
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

        // 在绑定好所有回调后发起连接。
        // Initiate the connection after wiring all callbacks.
        await this.ws.open();

        // ── SSE / EventSource 客户端示例
        // ── SSE / EventSource client example
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
     * 演示 {@link IRpc.broadcast} 与连接清理逻辑。
     *
     * @remarks
     * 在插件停止时调用。
     * `rpc.broadcast` 会向所有已连接的 RPC WebSocket 客户端推送一个 JSON-RPC 通知（无 `id`）。
     * 如果插件不在 `running` 状态，该调用是空操作。
     * 因此在快速关机时调用也是安全的。
     *
     * 广播后关闭任何打开的客户端连接以避免内核进程中的资源泄露。
     *
     * ---
     * Demonstrates {@link IRpc.broadcast} and connection cleanup.
     *
     * Called when the plugin is stopping.
     * `rpc.broadcast` pushes a JSON-RPC 2.0 notification (no `id`) to all connected RPC WebSocket clients.
     * It is a no-op if the plugin is not in the `running` state.
     * Therefore it is safe to call here even during a fast shutdown.
     *
     * After broadcasting, close any open client-side connections to avoid resource leaks in the kernel process.
     */
    private async onunload(): Promise<void> {
        const {rpc, logger, storage} = this.siyuan;

        // 解除对插件存储目录的文件系统事件的监听。
        // Unwatch filesystem events in the plugin storage directory.
        await storage.watcher.remove("./");

        // 解绑在 onload 中注册的 RPC 方法。
        // Unbind the RPC method registered in onload.
        await rpc.unbind("echo");

        // 向所有已连接的 RPC WebSocket 客户端推送一条通知。
        // Push a notification to all connected RPC WebSocket clients.
        await rpc.broadcast("unload", ["Plugin is unloading"]);

        // 关闭客户端连接。
        // 可选链用于防护 onrunning 未达成的情况（例如启动失败）。
        // Close client-side connections.
        // Optional chaining guards against the case where onrunning was never reached (e.g. error during startup).
        this.ws?.close();
        this.es?.close();

        await logger.debug("onunload: cleanup complete");
    }

    // ── 事件桥 / Event bridge ─────────────────────────────────────────────────

    /**
     * 演示 {@link IEvent.handler}（接收）与 {@link IEvent.emit}（发布）。
     *
     * @remarks
     * `siyuan.event.handler` 会接收每个内核广播事件。
     * `event` 的形状为 `{ id: UUID, type: string, detail: any }`。
     *
     * `siyuan.event.emit` 将事件发布到进程内总线。
     * 第一个参数是用于路由的主题字符串。
     * 第二个参数是负载。
     *
     * ---
     * Demonstrates {@link IEvent.handler} (receive) and {@link IEvent.emit} (publish).
     *
     * `siyuan.event.handler` receives every kernel broadcast event.
     * `event` has shape `{ id: UUID, type: string, detail: any }`.
     *
     * `siyuan.event.emit` publishes an event to the in-process bus.
     * The first argument is the topic string used for routing.
     * The second argument is the payload.
     *
     * @param event - The incoming kernel event message.
     */
    private async eventHandler(event: kernel.IEventMessage): Promise<void> {
        const {event: eventApi, logger} = this.siyuan;

        await logger.debug("event received:", event);

        // 在 "plugin" 主题下重新发布该事件。
        // Re-publish the event under the "plugin" topic.
        await eventApi.emit("plugin", {
            id: event.id,
            type: "echo",
            detail: event,
        });
    }

    // ── 服务器端处理器 / Server-side handlers ─────────────────────────────────

    /**
     * 演示位于 `ANY /plugin/private/<name>/*path` 的 HTTP 服务器处理器。
     *
     * @remarks
     * 必须返回 {@link IHttpResponse}。
     * `body` 字段支持：`data`（JSON / XML / YAML / …）、`file`（本地文件系统路径）、`string`（Go 的 fmt.Sprintf）、`raw`（字节 + Content-Type）、`redirect`。
     * 仅设置其中一个；内核会使用第一个非空值。
     *
     * 该路由需要内核认证和管理员角色。
     * 未认证的请求会在到达处理器前被拒绝。
     *
     * ---
     * Demonstrates the HTTP server handler at `ANY /plugin/private/<name>/*path`.
     *
     * Must return an {@link IHttpResponse}.
     * The `body` field supports: `data` (JSON / XML / YAML / …), `file` (local filesystem path), `string` (Go `fmt.Sprintf`), `raw` (bytes + Content-Type), `redirect`.
     * Set exactly one; the kernel uses the first non-null value.
     *
     * The route requires kernel authentication and admin role.
     * Unauthenticated requests are rejected before reaching the handler.
     *
     * @param request - Parsed URL, headers, body, and Gin routing context.
     * @returns An {@link IHttpResponse} that the kernel writes to the client.
     */
    private async httpHandler(request: kernel.IServerRequest): Promise<kernel.IHttpResponse> {
        await this.siyuan.logger.debug("http handler: path =", request.url.path);

        return {
            statusCode: 200,
            headers: {
                // 多值头为字符串数组。
                // Multi-value headers are arrays of strings.
                "X-Plugin": [this.siyuan.plugin.name],
            },
            body: {
                // type: "JSON" 将委托给 Gin 的 c.JSON。
                // type: "JSON" delegates to c.JSON in Gin.
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
     * 演示位于 `GET /plugin/private/<name>/*path` 的 WebSocket 服务器处理器（WebSocket 升级）。
     *
     * @remarks
     * `request.port` 的接口与 {@link IWebSocket} 相同。
     * 提供相同的事件回调和 `send` / `ping` / `pong` / `close` 方法。
     *
     * 在此处理器函数体内分配所有回调。
     * 内核在处理器返回后会自动打开端口的读取循环。
     * 显式调用 `port.open()` 是可选的。
     *
     * `onmessage` 事件携带 `{ type: "text" | "binary", data: string | ArrayBuffer }`。
     *
     * ---
     * Demonstrates the WebSocket server handler at `GET /plugin/private/<name>/*path` (WebSocket upgrade).
     *
     * `request.port` mirrors the {@link IWebSocket} interface.
     * It provides the same event callbacks and `send` / `ping` / `pong` / `close` methods.
     *
     * Assign all callbacks in this handler body.
     * The kernel auto-opens the port's read loop after the handler returns.
     * Calling `port.open()` explicitly is optional.
     *
     * `onmessage` events carry `{ type: "text" | "binary", data: string | ArrayBuffer }`.
     *
     * @param request - Server request augmented with `port` (a bidirectional WebSocket back-channel to the connected client).
     */
    private async wsHandler(request: kernel.IServerWebSocketRequest): Promise<void> {
        const {logger} = this.siyuan;

        request.port.onopen = async (event) => {
            await logger.debug("ws server: port open", event);
            // 在连接时向客户端问好。
            // Greet the client on connection.
            await request.port.send("Hello from plugin WebSocket server!");
        };
        request.port.onmessage = async (event) => {
            await logger.debug("ws server: message", event);
            // 将文本帧原样回送。
            // 将二进制帧转换为字符串表示后回送。
            // Send text frames back as-is.
            // Convert binary frames to a string representation before sending.
            if (typeof event.data === "string") {
                await request.port.send(event.data);
            } else {
                // 二进制帧 — 在 else 分支中 event.data 始终为 ArrayBuffer。
                // Binary frame — event.data is always ArrayBuffer in the else branch.
                await request.port.send(Buffer.from(event.data as ArrayBuffer).toString("utf-8"));
            }
        };
        request.port.onping = async (event) => {
            await logger.debug("ws server: ping", event);
            // 使用相同的应用数据回复 pong。
            // Reply with a pong carrying the same application data.
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
        // port.open() 是可选的。
        // 内核在此处理器返回后会自动打开端口。
        // port.open() is optional.
        // The kernel auto-opens the port after this handler returns.
    }

    /**
     * 演示位于 `GET /plugin/private/<name>/*path` 的 SSE 服务器处理器（Server-Sent Events）。
     *
     * @remarks
     * `request.port.onopen` 在 SSE 流准备好后触发。
     * 可在 `onopen` 内或之后调用 `port.send(eventType, data)` 来推送事件。
     * `eventType` 映射到 SSE 的 `event:` 字段。
     * `data` 映射到 `data:`。
     * `send` 是同步的。
     *
     * 连接保持打开直到调用 `port.close()` 或客户端断开连接。
     * 客户端断开连接会触发 `onclose`。
     *
     * ---
     * Demonstrates the SSE server handler at `GET /plugin/private/<name>/*path` (Server-Sent Events).
     *
     * `request.port.onopen` fires once the SSE stream is ready.
     * Call `port.send(event)` inside `onopen` or later to push events.
     *
     * `send` is synchronous.
     *
     * The connection stays open until `port.close()` is called or the client disconnects.
     * The client disconnect triggers `onclose`.
     *
     * @param request - Server request augmented with `port` (an SSE back-channel to the connected client).
     */
    private async esHandler(request: kernel.IServerEventSourceRequest): Promise<void> {
        const {logger} = this.siyuan;

        request.port.onopen = async (event) => {
            await logger.debug("sse server: port open", event);
            // send 是同步的。
            // send is synchronous.
            const now = Date.now();
            request.port.send({
                event: "update",
                data: JSON.stringify({ts: now}),
                id: now.toString(),
                retry: 5000,
            });
            request.port.send({
                data: "Connected to plugin SSE!",
            });
        };
        request.port.onclose = async (event) => {
            await logger.debug("sse server: port close", event);
        };
        // 注意：IEsServerPort 没有 onerror 回调。
        // SSE 的错误作为 onclose 曝露。
        // Note: IEsServerPort has no onerror callback.
        // SSE errors surface as onclose.
    }
}

new KernelPlugin();
