import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
    dirname,
    resolve,
} from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {runInNewContext} from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
const i18n = JSON.parse(readFileSync(new URL("../src/i18n/en.json", import.meta.url), "utf8"));
const code = ts.transpileModule(source, {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
}).outputText;
const DATE_STORAGE_NAME = "date-picker-config";

test("uncommented independent settings option type-checks against the installed SDK", () => {
    const enabledSource = source.replace("// openInWindow: true,", "openInWindow: true,");
    assert.notEqual(enabledSource, source, "The sample must include the commented option");
    const configPath = fileURLToPath(new URL("../tsconfig.json", import.meta.url));
    const sourcePath = fileURLToPath(new URL("../src/index.ts", import.meta.url));
    const config = ts.readConfigFile(configPath, ts.sys.readFile);
    assert.equal(config.error, undefined);
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, dirname(configPath));
    assert.deepEqual(parsed.errors, []);
    const host = ts.createCompilerHost(parsed.options);
    const getSourceFile = host.getSourceFile.bind(host);
    host.getSourceFile = (filename, languageVersion, onError, shouldCreateNewSourceFile) => {
        if (resolve(filename) === resolve(sourcePath)) {
            return ts.createSourceFile(filename, enabledSource, languageVersion);
        }
        return getSourceFile(filename, languageVersion, onError, shouldCreateNewSourceFile);
    };
    const program = ts.createProgram(parsed.fileNames, parsed.options, host);
    const diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics, host));
});

function createSample(
    {settingsWindow = true, readonly = false, frontend = "desktop", colorPicker, datePicker, timers} = {},
) {
    const classes = new Set(settingsWindow ? ["body--settings"] : []);
    const registrations = [];
    const delegated = [];
    const loads = [];
    const writes = [];
    const messages = [];
    const removed = [];
    const statusBars = [];
    const stored = {"menu-config": {readonlyText: "Saved settings"}};
    const persist = (plugin, name, data) => {
        stored[name] = {...data};
        plugin.data[name] = data;
        return {code: 0, msg: "", data: null};
    };
    const register = (name) => () => {
        registrations.push(name);
        assert.equal(settingsWindow, false, `Settings instance registered ${name}`);
        return {};
    };
    class Plugin {
        name = "plugin-sample";
        data = {};
        i18n = i18n;
        customBlockRenders = {};
        kernel = {rpc: {bind: register("RPC bind"), unbind: register("RPC unbind")}};
        eventBus = {on: register("event on"), off: register("event off")};
        addToolbarItem = register("toolbar");
        addBreadcrumbButton = register("breadcrumb");
        addIcons = register("icons");
        addTab = register("tab");
        addCommand = register("command");
        addDock = register("dock");
        addTopBar = register("top bar");
        addStatusBar(options) {
            register("status bar")();
            statusBars.push(options);
        }
        async loadData(name) {
            loads.push(name);
            if (stored[name] !== undefined) {
                this.data[name] = {...stored[name]};
            }
            return this.data[name];
        }
        async saveData(name, data) {
            writes.push({name, data});
            return persist(this, name, data);
        }
        async loadPublishData() {
            return {readonlyText: "Published settings"};
        }
        async removeData(name) {
            removed.push(name);
            delete stored[name];
            delete this.data[name];
            return {code: 0, msg: "", data: null};
        }
        openSetting() {
            delegated.push(this);
        }
    }
    class Setting {
        items = [];
        constructor(options) {
            this.options = options;
        }
        addItem(item) {
            this.items.push(item);
        }
        open() {
            assert.fail("Sample bypassed Plugin.openSetting");
        }
    }
    const createElement = () => ({
        isConnected: true,
        children: [],
        listeners: {},
        append(...children) {
            this.children.push(...children);
        },
        addEventListener(name, callback) {
            this.listeners[name] = callback;
        },
        content: {
            firstElementChild: {
                listeners: {},
                addEventListener(name, callback) {
                    this.listeners[name] = callback;
                },
            },
        },
    });
    const exports = {};
    runInNewContext(code, {
        exports,
        require: (name) => {
            if (name === "./index.scss") {
                return {};
            }
            assert.equal(name, "siyuan");
            return {
                Plugin,
                Setting,
                getFrontend: () => frontend,
                getBackend: () => "windows",
                openColorPicker: colorPicker,
                openDatePicker: datePicker,
                showMessage: message => messages.push(message),
                confirm: (_title, _message, callback) => callback(),
            };
        },
        window: {siyuan: {config: {readonly}}},
        document: {
            body: {
                classList: {
                    contains: (name) => classes.has(name),
                    add: (name) => classes.add(name),
                    remove: (name) => classes.delete(name),
                },
            },
            createElement,
        },
        console: {log() {}},
        setTimeout: timers?.setTimeout || setTimeout,
        clearTimeout: timers?.clearTimeout || clearTimeout,
    });
    const plugin = new exports.default();
    return {
        plugin,
        classes,
        registrations,
        delegated,
        loads,
        writes,
        messages,
        removed,
        statusBars,
        setStored: (value, name = "menu-config") => stored[name] = value,
        getStored: (name = "menu-config") => stored[name],
        persist: (name, data) => persist(plugin, name, data),
    };
}

function renderDateSetting(plugin) {
    const item = plugin.setting.items.find(item => item.title === i18n.datePicker);
    assert.equal(typeof item.createActionElement, "function", "date controls render from current settings data");
    return item.createActionElement();
}

function createTimers() {
    const callbacks = new Set();
    return {
        setTimeout(callback, delay) {
            assert.ok(delay > 0 && delay <= 15000, "date persistence has a bounded wait");
            callbacks.add(callback);
            return callback;
        },
        clearTimeout(callback) {
            callbacks.delete(callback);
        },
        expire() {
            [...callbacks].forEach(callback => callback());
            callbacks.clear();
        },
    };
}

const confirmedDatePicker = () => ({
    result: Promise.resolve({type: "confirm", value: "2026-11-12", changed: true}),
});

test("date settings render restored data and refresh visible controls after external changes", async () => {
    const f = createSample();
    f.setStored({date: "2026-11-11"}, DATE_STORAGE_NAME);
    f.plugin.onload();
    const early = renderDateSetting(f.plugin);
    await f.plugin.onLayoutReady();
    assert.equal(early.children[2].textContent, "2026-11-11");
    const current = renderDateSetting(f.plugin);
    assert.equal(current.children[2].textContent, "2026-11-11");
    f.setStored({date: "2026-11-13"}, DATE_STORAGE_NAME);
    await f.plugin.onDataChanged();
    assert.equal(current.children[2].textContent, "2026-11-13");
    f.setStored(undefined, DATE_STORAGE_NAME);
    await f.plugin.onDataChanged();
    assert.equal(current.children[2].textContent, "");
});

for (const failure of ["response", "rejection"]) {
    test(`date persistence reports ${failure} errors without accepting the failed cache value`, async () => {
        const f = createSample({datePicker: confirmedDatePicker});
        f.setStored({date: "2026-11-11"}, DATE_STORAGE_NAME);
        f.plugin.onload();
        await f.plugin.onLayoutReady();
        const [button, , preview] = renderDateSetting(f.plugin).children;
        f.plugin.saveData = async (name, data) => {
            if (failure === "rejection") throw {code: 403, msg: "Write denied", data: null};
            f.plugin.data[name] = data;
            return {code: 400, msg: "Write failed", data: null};
        };
        await button.listeners.click();
        assert.equal(f.plugin.data[DATE_STORAGE_NAME].date, "2026-11-11");
        assert.equal(preview.textContent, "2026-11-11");
        assert.match(f.messages.at(-1), failure === "rejection" ? /Write denied/ : /Write failed/);
        f.plugin.saveData = async (name, data) => {
            return f.persist(name, data);
        };
        await button.listeners.click();
        assert.equal(preview.textContent, "2026-11-12", "a known failure releases the save guard");
    });
}

for (const lateWrite of [false, true]) {
    test(`date persistence times out without retrying and reads the actual stored result (late write=${lateWrite})`, {
        timeout: 1000,
    }, async () => {
        const timers = createTimers();
        let opened = 0;
        const f = createSample({
            timers,
            datePicker: () => {
                opened++;
                return confirmedDatePicker();
            },
        });
        f.setStored({date: "2026-11-11"}, DATE_STORAGE_NAME);
        f.plugin.onload();
        await f.plugin.onLayoutReady();
        const [button, , preview] = renderDateSetting(f.plugin).children;
        let finish;
        let writes = 0;
        f.plugin.saveData = (name, data) => {
            writes++;
            if (!lateWrite) f.persist(name, data);
            return new Promise(resolve => {
                finish = () => {
                    if (lateWrite) f.persist(name, data);
                    f.plugin.data[name] = data;
                    resolve({code: 0, msg: "", data: null});
                };
            });
        };
        const first = button.listeners.click();
        await new Promise(resolve => setImmediate(resolve));
        timers.expire();
        await first;
        assert.equal(preview.textContent, "2026-11-11");
        assert.equal(f.messages.at(-1), i18n.datePickerSaveUncertain);
        await button.listeners.click();
        assert.equal(opened, 2, "an unresolved save does not leave the picker permanently locked");
        assert.equal(writes, 1, "an uncertain write is not retried or overlapped");
        f.setStored({readonlyText: "External settings"});
        f.setStored({date: "2026-11-14"}, DATE_STORAGE_NAME);
        await f.plugin.onDataChanged();
        finish();
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(f.plugin.data["menu-config"].readonlyText, "External settings");
        const storedDate = lateWrite ? "2026-11-12" : "2026-11-14";
        assert.equal(f.getStored(DATE_STORAGE_NAME).date, storedDate);
        assert.equal(f.plugin.data[DATE_STORAGE_NAME].date, storedDate);
        assert.equal(preview.textContent, storedDate);
        assert.equal(writes, 1);
    });
}

test("a late date success can settle the uncertain result without another write", {timeout: 1000}, async () => {
    const timers = createTimers();
    const f = createSample({timers, datePicker: confirmedDatePicker});
    f.plugin.onload();
    await f.plugin.onLayoutReady();
    const [button, , preview] = renderDateSetting(f.plugin).children;
    let finish;
    f.plugin.saveData = (name, data) =>
        new Promise(resolve => {
            finish = () => {
                resolve(f.persist(name, data));
            };
        });
    const pending = button.listeners.click();
    await new Promise(resolve => setImmediate(resolve));
    timers.expire();
    await pending;
    finish();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(preview.textContent, "2026-11-12");
});

for (const failure of ["response", "rejection"]) {
    test(
        `a late date ${failure} preserves the last confirmed value and allows a new attempt`,
        {timeout: 1000},
        async () => {
            const timers = createTimers();
            const f = createSample({timers, datePicker: confirmedDatePicker});
            f.setStored({date: "2026-11-11"}, DATE_STORAGE_NAME);
            f.plugin.onload();
            await f.plugin.onLayoutReady();
            const [button, , preview] = renderDateSetting(f.plugin).children;
            let finish;
            f.plugin.saveData = (name, data) =>
                new Promise((resolve, reject) => {
                    finish = () => {
                        if (failure === "response") {
                            f.plugin.data[name] = data;
                            resolve({code: 400, msg: "Late failure", data: null});
                        } else {
                            reject({code: 403, msg: "Late failure", data: null});
                        }
                    };
                });
            const pending = button.listeners.click();
            await new Promise(resolve => setImmediate(resolve));
            timers.expire();
            await pending;
            finish();
            await new Promise(resolve => setImmediate(resolve));
            assert.equal(preview.textContent, "2026-11-11");
            assert.equal(f.plugin.data[DATE_STORAGE_NAME].date, "2026-11-11");
            assert.match(f.messages.at(-1), /Late failure/);
            let saved = 0;
            f.plugin.saveData = async (name, data) => {
                saved++;
                return f.persist(name, data);
            };
            await button.listeners.click();
            assert.equal(saved, 1);
            assert.equal(preview.textContent, "2026-11-12");
        },
    );
}

for (const kind of ["textarea", "color"]) {
    for (const dateFirst of [false, true]) {
        test(`date and ${kind} saves persist independently in either completion order (date first=${dateFirst})`, async () => {
            const f = createSample({
                datePicker: confirmedDatePicker,
                colorPicker: () => ({
                    result: Promise.resolve({type: "confirm", value: {hex: "#112233"}, changed: true}),
                }),
            });
            f.setStored({readonlyText: "Saved settings", color: "#abcdef"});
            f.setStored({date: "2026-11-11"}, DATE_STORAGE_NAME);
            f.plugin.onload();
            await f.plugin.onLayoutReady();
            const [button, , preview] = renderDateSetting(f.plugin).children;
            const pending = [];
            f.plugin.saveData = (name, data) =>
                new Promise(resolve => {
                    pending.push({name, finish: () => resolve(f.persist(name, data))});
                });
            let other;
            if (kind === "textarea") {
                const input = f.plugin.setting.items[0].createActionElement();
                input.value = "Changed text";
                f.plugin.setting.options.confirmCallback();
            } else {
                const action = f.plugin.setting.items.find(item => item.title === i18n.colorPicker).actionElement;
                other = action.children[0].listeners.click();
            }
            const date = button.listeners.click();
            await new Promise(resolve => setImmediate(resolve));
            assert.equal(pending.length, 2);
            const dateWrite = pending.find(write => write.name === DATE_STORAGE_NAME);
            const otherWrite = pending.find(write => write.name === "menu-config");
            assert.ok(dateWrite && otherWrite, "each example writes its own complete storage file");
            (dateFirst ? dateWrite : otherWrite).finish();
            (dateFirst ? otherWrite : dateWrite).finish();
            await Promise.all([date, other]);
            assert.equal(f.getStored(DATE_STORAGE_NAME).date, "2026-11-12");
            assert.equal(f.getStored().readonlyText, kind === "textarea" ? "Changed text" : "Saved settings");
            assert.equal(f.getStored().color, kind === "color" ? "#112233" : "#abcdef");
            assert.equal(f.plugin.data[DATE_STORAGE_NAME].date, "2026-11-12");
            assert.equal(preview.textContent, "2026-11-12");
            await f.plugin.onDataChanged();
            assert.equal(preview.textContent, "2026-11-12", "reloading agrees with the confirmed display");
            assert.deepEqual({...f.plugin.data["menu-config"]}, f.getStored());
        });
    }
}

test("date controls recreated or unloaded while a picker is open ignore its old result", async () => {
    let finish;
    const f = createSample({datePicker: () => ({result: new Promise(resolve => finish = resolve)})});
    f.plugin.onload();
    await f.plugin.onLayoutReady();
    const first = renderDateSetting(f.plugin).children[0];
    const old = first.listeners.click();
    const current = renderDateSetting(f.plugin).children[0];
    finish({type: "confirm", value: "2026-11-12", changed: true});
    await old;
    assert.equal(f.writes.length, 0);
    const pending = current.listeners.click();
    await f.plugin.onunload();
    finish({type: "confirm", value: "2026-11-12", changed: true});
    await pending;
    assert.equal(f.writes.length, 0);
});

test("cleared dates do not revive a legacy date stored with unrelated settings", async () => {
    const f = createSample({datePicker: confirmedDatePicker});
    f.setStored({readonlyText: "Saved settings", date: "2026-11-01"});
    f.setStored({date: ""}, DATE_STORAGE_NAME);
    f.plugin.onload();
    await f.plugin.onLayoutReady();
    assert.equal(renderDateSetting(f.plugin).children[2].textContent, "");
    f.setStored(undefined, DATE_STORAGE_NAME);
    await f.plugin.onDataChanged();
    assert.equal(renderDateSetting(f.plugin).children[2].textContent, "");
    assert.equal(f.getStored().date, "2026-11-01", "unrelated storage remains unchanged");
    assert.equal(f.writes.length, 0, "loading never implicitly migrates or retries a write");
});

test("date persistence does not accept a missing response code or retain a synchronously thrown save guard", async () => {
    const f = createSample({datePicker: confirmedDatePicker});
    f.plugin.onload();
    await f.plugin.onLayoutReady();
    const [button, , preview] = renderDateSetting(f.plugin).children;
    f.plugin.saveData = async (name, data) => {
        f.plugin.data[name] = data;
    };
    await button.listeners.click();
    assert.equal(preview.textContent, "");
    assert.equal(f.messages.at(-1), i18n.datePickerSaveFailed);
    f.plugin.saveData = () => {
        throw new Error("Serialization failed");
    };
    await button.listeners.click();
    await button.listeners.click();
    assert.equal(f.messages.length, 3);
    assert.equal(preview.textContent, "");
});

test("uninstall and the confirmed remove-data action clear both private storage files", async () => {
    for (const uninstall of [false, true]) {
        const f = createSample({settingsWindow: false});
        f.setStored({date: "2026-11-11"}, DATE_STORAGE_NAME);
        f.plugin.onload();
        await f.plugin.onLayoutReady();
        const preview = renderDateSetting(f.plugin).children[2];
        if (uninstall) await f.plugin.uninstall();
        else {
            f.statusBars[0].element.listeners.click();
            await new Promise(resolve => setImmediate(resolve));
            assert.equal(preview.textContent, "");
        }
        assert.deepEqual(f.removed, ["menu-config", DATE_STORAGE_NAME]);
        assert.equal(f.getStored(), undefined);
        assert.equal(f.getStored(DATE_STORAGE_NAME), undefined);
    }
    const readonly = createSample({readonly: true});
    readonly.plugin.onload();
    await readonly.plugin.uninstall();
    assert.deepEqual(readonly.removed, []);
    assert.deepEqual(readonly.loads, []);
});

test("settings lifecycle initializes settings without main-window entries or RPC", async () => {
    const f = createSample();
    f.plugin.onload();
    assert.equal(f.plugin.setting.items.length, 5);
    await f.plugin.onLayoutReady();
    assert.deepEqual(f.loads, ["menu-config", DATE_STORAGE_NAME]);
    assert.equal(f.plugin.data["menu-config"].readonlyText, "Saved settings");
    assert.equal(f.classes.has("plugin-sample--settings"), true);
    assert.deepEqual(f.registrations, []);
    await f.plugin.onunload();
    await f.plugin.onunload();
    assert.equal(f.classes.has("plugin-sample--settings"), false);
    assert.equal(f.classes.has("body--settings"), true);
});

test("settings unload also handles initialization before layout readiness", async () => {
    const f = createSample();
    f.plugin.onload();
    await f.plugin.onunload();
    assert.equal(f.classes.has("plugin-sample--settings"), false);
    assert.deepEqual(f.loads, []);
});

test("settings instances keep separate caches and refresh changed or deleted storage", async () => {
    const first = createSample();
    const second = createSample();
    first.plugin.onload();
    second.plugin.onload();
    await first.plugin.onLayoutReady();
    await second.plugin.onLayoutReady();
    first.setStored({readonlyText: "Changed settings"});
    await first.plugin.onDataChanged();
    assert.equal(first.plugin.data["menu-config"].readonlyText, "Changed settings");
    assert.equal(second.plugin.data["menu-config"].readonlyText, "Saved settings");
    first.setStored(undefined);
    await first.plugin.onDataChanged();
    assert.equal(first.plugin.data["menu-config"].readonlyText, i18n.readonlyText);
    await first.plugin.onunload();
    assert.equal(second.classes.has("plugin-sample--settings"), true);
    await second.plugin.onunload();
});

test("settings item reads refreshed data and saves through the existing confirmation", async () => {
    const {plugin, writes} = createSample();
    plugin.onload();
    await plugin.onLayoutReady();
    const input = plugin.setting.items[0].createActionElement();
    assert.equal(input.value, "Saved settings");
    input.value = "Edited settings";
    plugin.setting.options.confirmCallback();
    assert.equal(writes.length, 1);
    assert.equal(writes[0].name, "menu-config");
    assert.equal(writes[0].data.readonlyText, "Edited settings");
});

test("the color sample previews without saving, cleans up to current data and persists only confirmation", async () => {
    let options;
    let finish;
    const f = createSample({
        colorPicker: value => {
            options = value;
            return {
                result: new Promise(resolve => {
                    finish = resolve;
                }),
            };
        },
    });
    f.plugin.onload();
    await f.plugin.onLayoutReady();
    const action = f.plugin.setting.items.find(item => item.title === i18n.colorPicker).actionElement;
    const [button, , preview] = action.children;
    const cancelled = button.listeners.click();
    assert.equal(options.ownerPlugin, f.plugin);
    assert.equal(options.ownerElement, button);
    options.onPreview({hex: "#123456"});
    assert.equal(preview.textContent, "#123456");
    assert.equal(f.writes.length, 0);
    f.plugin.data["menu-config"].color = "#abcdef";
    options.onPreviewEnd();
    assert.equal(preview.textContent, "#abcdef");
    finish({type: "cancel"});
    await cancelled;
    assert.equal(f.writes.length, 0);
    const accepted = button.listeners.click();
    finish({type: "confirm", value: {hex: "#112233"}, changed: true});
    await accepted;
    assert.equal(f.writes.length, 1);
    assert.equal(f.writes[0].data.color, "#112233");
    assert.equal(f.writes[0].data.readonlyText, "Saved settings");
    const input = f.plugin.setting.items[0].createActionElement();
    input.value = "Edited";
    f.plugin.setting.options.confirmCallback();
    assert.equal(f.writes[1].data.color, "#112233");
});

test("the color sample provides an older-version fallback", async () => {
    const f = createSample();
    f.plugin.onload();
    await f.plugin.onLayoutReady();
    const action = f.plugin.setting.items.find(item => item.title === i18n.colorPicker).actionElement;
    await action.children[0].listeners.click();
    assert.deepEqual(f.messages, [i18n.colorPickerUnavailable]);
    assert.deepEqual(f.writes, []);
});

test("the date sample preserves cancellation, saves explicit changes and distinguishes clearing", async () => {
    let options;
    let finish;
    let opened = 0;
    const f = createSample({
        datePicker: value => {
            options = value;
            opened++;
            return {
                result: new Promise(resolve => {
                    finish = resolve;
                }),
            };
        },
    });
    f.plugin.onload();
    await f.plugin.onLayoutReady();
    const [button, , preview] = renderDateSetting(f.plugin).children;
    const canceled = button.listeners.click();
    assert.equal(options.type, "date");
    assert.equal(options.value, "");
    assert.equal(options.ownerPlugin, f.plugin);
    assert.equal(options.ownerElement, button);
    await button.listeners.click();
    assert.equal(opened, 1, "repeated clicks do not replace a pending picker");
    finish({type: "cancel", reason: "escape"});
    await canceled;
    assert.equal(f.writes.length, 0);
    const accepted = button.listeners.click();
    finish({type: "confirm", value: "2026-11-11", changed: true});
    await accepted;
    assert.equal(f.writes.length, 1);
    assert.equal(f.writes[0].data.date, "2026-11-11");
    assert.equal(f.writes[0].name, DATE_STORAGE_NAME);
    assert.equal(f.plugin.data["menu-config"].readonlyText, "Saved settings");
    assert.equal(preview.textContent, "2026-11-11");
    const unchanged = button.listeners.click();
    assert.equal(options.value, "2026-11-11");
    finish({type: "confirm", value: "2026-11-11", changed: false});
    await unchanged;
    assert.equal(f.writes.length, 1);
    const cleared = button.listeners.click();
    finish({type: "confirm", value: "", changed: true});
    await cleared;
    assert.equal(f.writes.length, 2);
    assert.equal(f.writes[1].data.date, "");
    assert.equal(preview.textContent, "");
    const removed = button.listeners.click();
    button.isConnected = false;
    finish({type: "confirm", value: "2026-11-12", changed: true});
    await removed;
    assert.equal(f.writes.length, 2, "a detached owner must not save");
});

test("the date sample handles old versions and picker failures without saving", async () => {
    const old = createSample();
    old.plugin.onload();
    await old.plugin.onLayoutReady();
    const oldButton = renderDateSetting(old.plugin).children[0];
    await oldButton.listeners.click();
    assert.deepEqual(old.messages, [i18n.datePickerUnavailable]);
    assert.deepEqual(old.writes, []);
    const failed = createSample({
        datePicker: () => {
            throw new Error("Unavailable window");
        },
    });
    failed.plugin.onload();
    await failed.plugin.onLayoutReady();
    const button = renderDateSetting(failed.plugin).children[0];
    await button.listeners.click();
    await button.listeners.click();
    assert.equal(failed.messages.length, 2, "failure releases the pending guard");
    assert.deepEqual(failed.writes, []);
});

for (
    const {settingsWindow, frontend} of [
        {settingsWindow: true, frontend: "desktop"},
        ...["desktop", "desktop-window", "browser-desktop", "mobile", "browser-mobile"].map(frontend => ({
            settingsWindow: false,
            frontend,
        })),
    ]
) {
    test(`openSetting delegates without forcing a new window (${frontend}, settingsWindow=${settingsWindow})`, async () => {
        const f = createSample({settingsWindow, frontend});
        f.plugin.onload();
        assert.notEqual(f.plugin.setting.options.openInWindow, true);
        await f.plugin.onLayoutReady();
        assert.equal(f.plugin.data["menu-config"].readonlyText, "Saved settings");
        f.plugin.openSetting();
        assert.deepEqual(f.delegated, [f.plugin]);
        if (!settingsWindow) {
            assert.ok(f.registrations.includes("top bar"));
            assert.ok(f.registrations.includes("dock"));
            assert.ok(f.registrations.includes("RPC bind"));
            assert.equal(f.classes.has("plugin-sample--settings"), false);
        }
        await f.plugin.onunload();
    });
}

test("readonly settings use public data and do not open administrator settings", async () => {
    const f = createSample({readonly: true});
    f.plugin.onload();
    await f.plugin.onLayoutReady();
    await f.plugin.onDataChanged();
    f.plugin.openSetting();
    assert.equal(f.plugin.setting, undefined);
    assert.equal(f.plugin.data["menu-config"].readonlyText, "Published settings");
    assert.deepEqual(f.loads, []);
    assert.deepEqual(f.delegated, []);
    await f.plugin.onunload();
    assert.equal(f.classes.has("plugin-sample--settings"), false);
});
