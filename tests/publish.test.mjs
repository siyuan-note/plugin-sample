import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {runInNewContext} from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
const i18n = JSON.parse(readFileSync(new URL("../src/i18n/en.json", import.meta.url), "utf8"));
const code = ts.transpileModule(source, {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
}).outputText;

function createSample({readonly = true, isPublish = false} = {}) {
    const messages = [];
    const menus = [];
    const forbidden = () => assert.fail("Published frontend called an administrator operation");
    class Plugin {
        data = {};
        i18n = i18n;
        customBlockRenders = {};
        kernel = {rpc: {bind: forbidden, unbind: forbidden}};
        eventBus = {on: forbidden, off: forbidden};
        loadData = forbidden;
        saveData = forbidden;
        removeData = forbidden;
        savePublishData = forbidden;
        loadPublishData = async () => ({readonlyText: "Public text", privateToken: "must not be copied"});
        addTopBar() {
            return {};
        }
    }
    class Menu {
        items = [];
        constructor() {
            menus.push(this);
        }
        addItem(item) {
            this.items.push(item);
        }
        open() {}
        fullscreen() {}
    }
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
                Menu,
                getFrontend: () => "browser-desktop",
                showMessage: (message) => messages.push(message),
            };
        },
        window: {siyuan: {config: {readonly}, isPublish}},
        document: {
            createElement: (tag) => {
                assert.equal(tag, "span");
                return {
                    textContent: "",
                    get innerHTML() {
                        return this.textContent.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(
                            ">",
                            "&gt;",
                        );
                    },
                };
            },
        },
        console: {log() {}},
    });
    return {plugin: new exports.default(), messages, menus};
}

for (const flags of [{readonly: true}, {readonly: false, isPublish: true}]) {
    test(`published lifecycle skips private storage and kernel RPC: ${JSON.stringify(flags)}`, async () => {
        const {plugin} = createSample(flags);
        plugin.onload();
        assert.ok(plugin.customBlockRenders.counter);
        assert.equal(plugin.setting, undefined);
        await plugin.onLayoutReady();
        assert.equal(plugin.data["menu-config"].readonlyText, "Public text");
        assert.deepEqual(Object.keys(plugin.data["menu-config"]), ["readonlyText"]);
        await plugin.publishSettings("do not publish");
        await plugin.onunload();
        await plugin.uninstall();
    });
}

for (
    const [error, message] of [
        [{code: 403}, i18n.publishDataUnavailable],
        [{code: 404}, i18n.publishDataMissing],
        [{code: 500}, i18n.publishDataLoadFailed],
        [new Error("network failure"), i18n.publishDataLoadFailed],
    ]
) {
    test(`failed public read clears stale data without a private fallback: ${error.code ?? "network"}`, async () => {
        const {plugin} = createSample();
        plugin.onload();
        await plugin.onLayoutReady();
        plugin.loadPublishData = async () => {
            throw error;
        };
        await plugin.loadPublishedSettings();
        assert.equal(plugin.data["menu-config"].readonlyText, i18n.readonlyText);
        assert.equal(plugin.publishDataStatus, message);
        plugin.loadPublishData = async () => ({readonlyText: "Updated"});
        await plugin.loadPublishedSettings();
        assert.equal(plugin.data["menu-config"].readonlyText, "Updated");
        assert.equal(plugin.publishDataStatus, "");
    });
}

test("missing or non-string public text uses the default", async () => {
    const {plugin} = createSample();
    plugin.onload();
    for (const data of [{}, {readonlyText: null}, {readonlyText: false}, {readonlyText: 1}]) {
        plugin.loadPublishData = async () => data;
        await plugin.loadPublishedSettings();
        assert.equal(plugin.data["menu-config"].readonlyText, i18n.readonlyText);
    }
});

test("administrator snapshot includes only the explicitly selected field", async () => {
    const {plugin, messages} = createSample();
    plugin.isReadonly = false;
    plugin.data["menu-config"] = {readonlyText: "Private draft", token: "secret"};
    const snapshots = [];
    plugin.savePublishData = async (data) => snapshots.push(JSON.parse(JSON.stringify(data)));
    await plugin.publishSettings("Selected public text");
    assert.deepEqual(snapshots, [{readonlyText: "Selected public text"}]);
    assert.equal(plugin.data["menu-config"].readonlyText, "Private draft");
    assert.deepEqual(messages, [i18n.publishDataSaved]);
});

test("administrator snapshot failures are handled without retrying or granting access", async () => {
    const {plugin, messages} = createSample();
    plugin.isReadonly = false;
    let calls = 0;
    plugin.savePublishData = async () => {
        calls++;
        throw {code: 403};
    };
    await plugin.publishSettings("Public text");
    assert.equal(calls, 1);
    assert.deepEqual(messages, [i18n.publishDataGrantRequired]);
});

test("published menu escapes text and exposes only read and refresh actions", async () => {
    const {plugin, menus, messages} = createSample();
    plugin.onload();
    plugin.loadPublishData = async () => ({readonlyText: "<img src=x onerror=alert(1)>"});
    await plugin.onLayoutReady();
    plugin.addMenu({right: 10, bottom: 20});
    const items = menus[0].items;
    assert.equal(items.length, 2);
    assert.equal(items[0].type, "readonly");
    assert.equal(items[0].label, "&lt;img src=x onerror=alert(1)&gt;");
    assert.equal(items[1].label, i18n.publishDataRefresh);
    plugin.loadPublishData = async () => {
        throw {code: 403};
    };
    await items[1].click();
    assert.equal(plugin.data["menu-config"].readonlyText, i18n.readonlyText);
    assert.deepEqual(messages, [i18n.publishDataUnavailable]);
});
