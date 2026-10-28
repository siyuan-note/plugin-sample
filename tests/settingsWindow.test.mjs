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

function createSample({settingsWindow = true, readonly = false, frontend = "desktop"} = {}) {
    const classes = new Set(settingsWindow ? ["body--settings"] : []);
    const registrations = [];
    const delegated = [];
    const loads = [];
    const writes = [];
    let stored = {readonlyText: "Saved settings"};
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
        addStatusBar = register("status bar");
        async loadData(name) {
            loads.push(name);
            if (stored !== undefined) {
                this.data[name] = {...stored};
            }
            return this.data[name];
        }
        async saveData(name, data) {
            writes.push({name, data});
            stored = {...data};
            this.data[name] = data;
        }
        async loadPublishData() {
            return {readonlyText: "Published settings"};
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
        addEventListener() {},
        content: {firstElementChild: {addEventListener() {}}},
    });
    const exports = {};
    runInNewContext(code, {
        exports,
        require: (name) => {
            if (name === "./index.scss") {
                return {};
            }
            assert.equal(name, "siyuan");
            return {Plugin, Setting, getFrontend: () => frontend, getBackend: () => "windows"};
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
    });
    return {
        plugin: new exports.default(),
        classes,
        registrations,
        delegated,
        loads,
        writes,
        setStored: (value) => stored = value,
    };
}

test("settings lifecycle initializes settings without main-window entries or RPC", async () => {
    const f = createSample();
    f.plugin.onload();
    assert.equal(f.plugin.setting.items.length, 3);
    await f.plugin.onLayoutReady();
    assert.deepEqual(f.loads, ["menu-config"]);
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
