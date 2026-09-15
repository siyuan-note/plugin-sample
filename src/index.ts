import {
    Plugin,
    showMessage,
    confirm,
    Dialog,
    Menu,
    openTab,
    adaptHotkey,
    getFrontend,
    getBackend,
    Setting,
    fetchPost,
    Protyle,
    openWindow,
    IOperation,
    Constants,
    openMobileFileById,
    lockScreen,
    ICard,
    ICardData,
    exitSiYuan,
    getModelByDockType,
    getAllEditor,
    Files,
    platformUtils,
    openSetting,
    openAttributePanel,
    saveLayout,
    IKernelPluginState,
    IKernelPluginRpcCall,
} from "siyuan";
import type {ICommandContext, IEventBusMap} from "siyuan";
import type {FlashcardReviewOptions} from "./siyuan-review";
import "./index.scss";

const STORAGE_NAME = "menu-config";
const TAB_TYPE = "custom_tab";
const DOCK_TYPE = "dock_tab";
const CUSTOM_BLOCK_TYPE = "counter";

export default class PluginSample extends Plugin {
    private custom: ReturnType<Plugin["addTab"]>;
    private isMobile: boolean;
    private isReadonly: boolean;
    private topBarElement: HTMLElement;
    private readonly onTopBarMenu = ({detail}: CustomEvent<IEventBusMap["open-menu-topbar"]>) => {
        // 所有订阅者都会收到事件，仅为本插件按钮同步添加菜单项，空白处的 element 和 entryPath 为 null。
        if (detail.element !== this.topBarElement) {
            return;
        }
        detail.menu.addItem({
            id: "plugin-sample-settings",
            icon: "iconSettings",
            label: this.i18n.openPluginSettings,
            click: () => this.openSetting(),
        });
    };
    private publishDataStatus = "";
    private blockIconEventBindThis = this.blockIconEvent.bind(this);
    private readonly renderCounterCustomBlock = ({element, content, setContent}: {
        element: HTMLElement;
        content: string;
        setContent: (content: string) => boolean;
    }) => {
        let count = Number(content);
        if (!Number.isSafeInteger(count)) {
            count = 0;
        }
        const button = document.createElement("button");
        button.type = "button";
        button.className = "b3-button b3-button--outline";
        const updateLabel = () => {
            const label = this.i18n.customBlockCounter.replace("${count}", count.toString());
            button.textContent = label;
            button.setAttribute("aria-label", label);
        };
        const increase = () => {
            const nextCount = count + 1;
            if (setContent(nextCount.toString())) {
                count = nextCount;
                updateLabel();
            }
        };
        updateLabel();
        button.addEventListener("click", increase);
        element.append(button);
        return () => button.removeEventListener("click", increase);
    };

    onload() {
        this.isReadonly = Boolean(window.siyuan.config.readonly || window.siyuan.isPublish);
        this.data[STORAGE_NAME] = {readonlyText: this.i18n.readonlyText};
        const frontEnd = getFrontend();
        this.isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";
        this.customBlockRenders[CUSTOM_BLOCK_TYPE] = {
            render: this.renderCounterCustomBlock,
        };
        // 发布端保留内容渲染，管理操作和内核通信仅在可写的管理端注册。
        if (this.isReadonly) {
            return;
        }
        this.kernel.rpc.bind("unload", this.onKernelPluginUnload);
        this.kernel.rpc.bind("notify", this.onKernelPluginNotify);
        this.eventBus.on("kernel-plugin-state-change", this.onKernelPluginStateChange);
        this.addToolbarItem({
            name: "insert-smail-emoji",
            icon: "iconEmoji",
            hotkey: "⇧⌘I",
            tipPosition: "n",
            tip: this.i18n.insertEmoji,
            click(protyle: Protyle) {
                protyle.insert("😊");
            },
        });

        this.addBreadcrumbButton({
            id: "fullscreen",
            icon: "iconFullscreen",
            title: this.i18n.toggleEditorFullscreen,
            callback: (event, protyle) => {
                event.preventDefault();
                const editor = protyle.getInstance();
                editor.setFullscreen(!editor.isFullscreen());
            },
        });
        this.addBreadcrumbButton({
            id: "insert-custom-block",
            icon: "iconAdd",
            title: this.i18n.insertCustomBlock,
            callback: (event, protyle) => {
                event.preventDefault();
                if (protyle.disabled) {
                    return;
                }
                const info = `${encodeURIComponent(this.name)}/${encodeURIComponent(CUSTOM_BLOCK_TYPE)}`;
                const markdown = `;;;${info}\n0\n;;;`;
                protyle.getInstance().insert(protyle.lute.Md2BlockDOM(markdown), true);
            },
        });
        // 图标的制作参见帮助文档
        this.addIcons(`<symbol id="iconFace" viewBox="0 0 32 32">
<path d="M13.667 17.333c0 0.92-0.747 1.667-1.667 1.667s-1.667-0.747-1.667-1.667 0.747-1.667 1.667-1.667 1.667 0.747 1.667 1.667zM20 15.667c-0.92 0-1.667 0.747-1.667 1.667s0.747 1.667 1.667 1.667 1.667-0.747 1.667-1.667-0.747-1.667-1.667-1.667zM29.333 16c0 7.36-5.973 13.333-13.333 13.333s-13.333-5.973-13.333-13.333 5.973-13.333 13.333-13.333 13.333 5.973 13.333 13.333zM14.213 5.493c1.867 3.093 5.253 5.173 9.12 5.173 0.613 0 1.213-0.067 1.787-0.16-1.867-3.093-5.253-5.173-9.12-5.173-0.613 0-1.213 0.067-1.787 0.16zM5.893 12.627c2.28-1.293 4.040-3.4 4.88-5.92-2.28 1.293-4.040 3.4-4.88 5.92zM26.667 16c0-1.040-0.16-2.040-0.44-2.987-0.933 0.2-1.893 0.32-2.893 0.32-4.173 0-7.893-1.92-10.347-4.92-1.4 3.413-4.187 6.093-7.653 7.4 0.013 0.053 0 0.12 0 0.187 0 5.88 4.787 10.667 10.667 10.667s10.667-4.787 10.667-10.667z"></path>
</symbol>
<symbol id="iconSaving" viewBox="0 0 32 32">
<path d="M20 13.333c0-0.733 0.6-1.333 1.333-1.333s1.333 0.6 1.333 1.333c0 0.733-0.6 1.333-1.333 1.333s-1.333-0.6-1.333-1.333zM10.667 12h6.667v-2.667h-6.667v2.667zM29.333 10v9.293l-3.76 1.253-2.24 7.453h-7.333v-2.667h-2.667v2.667h-7.333c0 0-3.333-11.28-3.333-15.333s3.28-7.333 7.333-7.333h6.667c1.213-1.613 3.147-2.667 5.333-2.667 1.107 0 2 0.893 2 2 0 0.28-0.053 0.533-0.16 0.773-0.187 0.453-0.347 0.973-0.427 1.533l3.027 3.027h2.893zM26.667 12.667h-1.333l-4.667-4.667c0-0.867 0.12-1.72 0.347-2.547-1.293 0.333-2.347 1.293-2.787 2.547h-8.227c-2.573 0-4.667 2.093-4.667 4.667 0 2.507 1.627 8.867 2.68 12.667h2.653v-2.667h8v2.667h2.68l2.067-6.867 3.253-1.093v-4.707z"></path>
</symbol>`);

        this.custom = this.addTab({
            type: TAB_TYPE,
            init() {
                this.element.innerHTML = `<div class="plugin-sample__custom-tab">${this.data.text}</div>`;
            },
            beforeDestroy() {
                console.log("before destroy tab:", TAB_TYPE);
            },
            destroy() {
                console.log("destroy tab:", TAB_TYPE);
            },
        });

        this.addCommand({
            langKey: "showDialog",
            hotkey: "⇧⌘O",
            execute: (context: ICommandContext) => {
                console.log("showDialog command context:", {
                    source: context.source,
                    focus: context.focus,
                    protyle: context.protyle,
                    range: context.range,
                    rangeConnected: Boolean(context.range?.startContainer.isConnected),
                    fileTree: context.fileTree,
                    dock: context.dock,
                });
                this.showDialog();
            },
            callback: () => {
                this.showDialog();
            },
            editorCallback: () => {
                this.showDialog();
            },
        });

        this.addCommand({
            langKey: "getTab",
            hotkey: "⇧⌘M",
            globalCallback: () => {
                console.log(this.getOpenedTab());
            },
        });
        this.addDock({
            config: {
                position: "LeftBottom",
                size: {width: 200, height: 0},
                icon: "iconSaving",
                title: "Custom Dock",
                hotkey: "⌥⌘W",
            },
            data: {
                text: "This is my custom dock",
            },
            type: DOCK_TYPE,
            resize() {
                console.log(DOCK_TYPE + " resize");
            },
            update() {
                console.log(DOCK_TYPE + " update");
            },
            init: (dock) => {
                if (this.isMobile) {
                    dock.element.innerHTML = `<div class="toolbar toolbar--border toolbar--dark">
    <svg class="toolbar__icon"><use xlink:href="#iconEmoji"></use></svg>
        <div class="toolbar__text">Custom Dock</div>
    </div>
    <div class="fn__flex-1 plugin-sample__custom-dock">
        ${dock.data.text}
    </div>
</div>`;
                } else {
                    dock.element.innerHTML = `<div class="fn__flex-1 fn__flex-column">
    <div class="block__icons">
        <div class="block__logo">
            <svg class="block__logoicon"><use xlink:href="#iconEmoji"></use></svg>Custom Dock
        </div>
        <span class="fn__flex-1 fn__space"></span>
        <span data-type="min" class="block__icon ariaLabel" data-position="north" aria-label="Min ${
                        adaptHotkey("⌘W")
                    }"><svg><use xlink:href="#iconMin"></use></svg></span>
    </div>
    <div class="fn__flex-1 plugin-sample__custom-dock">
        ${dock.data.text}
    </div>
</div>`;
                }
            },
            destroy() {
                console.log("destroy dock:", DOCK_TYPE);
            },
        });

        const textareaElement = document.createElement("textarea");
        this.setting = new Setting({
            confirmCallback: () => {
                this.saveData(STORAGE_NAME, {readonlyText: textareaElement.value}).catch(e => {
                    showMessage(`[${this.name}] save data [${STORAGE_NAME}] fail: `, e);
                });
            },
        });
        this.setting.addItem({
            title: this.i18n.readonlyText,
            direction: "row",
            description: this.i18n.readonlyTextTip,
            createActionElement: () => {
                textareaElement.className = "b3-text-field fn__block";
                textareaElement.placeholder = this.i18n.readonlyText;
                textareaElement.value = this.data[STORAGE_NAME].readonlyText;
                return textareaElement;
            },
        });
        const publishButton = document.createElement("button");
        publishButton.className = "b3-button b3-button--outline";
        publishButton.textContent = this.i18n.publishData;
        publishButton.addEventListener("click", async () => {
            publishButton.disabled = true;
            try {
                await this.publishSettings(textareaElement.value);
            } finally {
                publishButton.disabled = false;
            }
        });
        this.setting.addItem({
            title: this.i18n.publishData,
            description: this.i18n.publishDataTip,
            actionElement: publishButton,
        });
        const btnaElement = document.createElement("button");
        btnaElement.className = "b3-button b3-button--outline fn__flex-center fn__size200";
        btnaElement.textContent = "Open";
        btnaElement.addEventListener("click", () => {
            window.open("https://github.com/siyuan-note/plugin-sample");
        });
        this.setting.addItem({
            title: "Open plugin url",
            description: "Open plugin url in browser",
            actionElement: btnaElement,
        });

        this.protyleSlash = [{
            filter: ["insert emoji 😊", "插入表情 😊", "crbqwx"],
            html:
                `<div class="b3-list-item__first"><span class="b3-list-item__text">${this.i18n.insertEmoji}</span><span class="b3-list-item__meta">😊</span></div>`,
            id: "insertEmoji",
            callback(protyle: Protyle) {
                protyle.insert("😊");
            },
        }];

        this.protyleOptions = {
            toolbar: [
                "block-ref",
                "a",
                "|",
                "text",
                "strong",
                "em",
                "u",
                "s",
                "mark",
                "sup",
                "sub",
                "clear",
                "|",
                "code",
                "kbd",
                "tag",
                "inline-math",
                "inline-memo",
            ],
        };

        console.log(this.i18n.helloPlugin);
    }

    async onLayoutReady() {
        const topBarElement = this.addTopBar({
            icon: this.isReadonly ? "iconEmoji" : "iconFace",
            title: this.i18n.addTopBarIcon,
            position: "right",
            callback: () => {
                if (this.isMobile) {
                    this.addMenu();
                } else {
                    let rect = topBarElement.getBoundingClientRect();
                    // 如果被隐藏，则使用更多按钮
                    if (rect.width === 0) {
                        rect = document.querySelector("#barMore").getBoundingClientRect();
                    }
                    if (rect.width === 0) {
                        rect = document.querySelector("#barPlugins").getBoundingClientRect();
                    }
                    this.addMenu(rect);
                }
            },
        });
        if (this.isReadonly) {
            await this.loadPublishedSettings();
            return;
        }
        this.topBarElement = topBarElement;
        // 顶栏事件由宿主合并菜单和分隔线，不另行注册拦截传播的 contextmenu 监听器。
        if (!this.isMobile) {
            this.eventBus.on("open-menu-topbar", this.onTopBarMenu);
        }
        const statusIconTemp = document.createElement("template");
        statusIconTemp.innerHTML = `<div class="toolbar__item ariaLabel" aria-label="Remove plugin-sample Data">
    <svg>
        <use xlink:href="#iconTrashcan"></use>
    </svg>
</div>`;
        statusIconTemp.content.firstElementChild.addEventListener("click", () => {
            confirm("⚠️", this.i18n.confirmRemove.replace("${name}", this.name), () => {
                this.removeData(STORAGE_NAME).then(() => {
                    this.data[STORAGE_NAME] = {readonlyText: this.i18n.readonlyText};
                    showMessage(`[${this.name}]: ${this.i18n.removedData}`);
                }).catch(e => {
                    showMessage(`[${this.name}] remove data [${STORAGE_NAME}] fail: `, e);
                });
            });
        });
        this.addStatusBar({
            element: statusIconTemp.content.firstElementChild as HTMLElement,
        });
        await this.loadData(STORAGE_NAME).catch(e => {
            console.log(`[${this.name}] load data [${STORAGE_NAME}] fail: `, e);
        });
        console.log(`frontend: ${getFrontend()}; backend: ${getBackend()}`);
    }

    async onunload() {
        console.log(this.i18n.byePlugin);

        if (this.isReadonly) {
            return;
        }
        this.eventBus.off("kernel-plugin-state-change", this.onKernelPluginStateChange);
        this.eventBus.off("open-menu-topbar", this.onTopBarMenu);
        await Promise.all([
            this.kernel.rpc.unbind("unload", this.onKernelPluginUnload),
            this.kernel.rpc.unbind("notify", this.onKernelPluginNotify),
        ]);
    }

    async uninstall() {
        if (this.isReadonly) {
            return;
        }
        // 卸载插件时删除插件数据
        // Delete plugin data when uninstalling the plugin
        await this.removeData(STORAGE_NAME).catch(e => {
            showMessage(`uninstall [${this.name}] remove data [${STORAGE_NAME}] fail: ${e.msg}`);
        });
    }

    private async loadPublishedSettings() {
        // 每次读取先清除旧快照，未授权、未生成及请求失败时都使用默认值，不读取私有存储。
        this.data[STORAGE_NAME] = {readonlyText: this.i18n.readonlyText};
        this.publishDataStatus = "";
        try {
            const data = await this.loadPublishData();
            if (typeof data.readonlyText === "string") {
                this.data[STORAGE_NAME] = {readonlyText: data.readonlyText};
            }
        } catch (error) {
            const code = (error as {code?: number;} | null)?.code;
            this.publishDataStatus = code === 403 ?
                this.i18n.publishDataUnavailable :
                code === 404 ?
                this.i18n.publishDataMissing :
                this.i18n.publishDataLoadFailed;
        }
    }

    private async publishSettings(readonlyText: string) {
        if (this.isReadonly) {
            return;
        }
        try {
            // 仅选择声明过的公开字段，完整替换快照，避免将私有配置对象直接传入。
            await this.savePublishData({readonlyText});
            showMessage(this.i18n.publishDataSaved);
        } catch (error) {
            const code = (error as {code?: number;} | null)?.code;
            showMessage(code === 403 ? this.i18n.publishDataGrantRequired : this.i18n.publishDataSaveFailed);
        }
    }

    // 使用 saveData() 存储的数据发生变更时触发，注释掉则自动禁用插件再重新启用
    // Triggered when data stored using saveData() changes. If commented out, the plugin will be automatically disabled and then re-enabled.
    // onDataChanged() {
    //     console.log("onDataChanged");
    // }

    async updateCards(options: ICardData) {
        options.cards.sort((a: ICard, b: ICard) => {
            if (a.blockID < b.blockID) {
                return -1;
            }
            if (a.blockID > b.blockID) {
                return 1;
            }
            return 0;
        });
        return options;
    }

    /* 自定义设置
    openSetting() {
        const dialog = new Dialog({
            title: this.name,
            content: `<div class="b3-dialog__content"><textarea class="b3-text-field fn__block" placeholder="readonly text in the menu"></textarea></div>
<div class="b3-dialog__action">
    <button class="b3-button b3-button--cancel">${this.i18n.cancel}</button><div class="fn__space"></div>
    <button class="b3-button b3-button--text">${this.i18n.save}</button>
</div>`,
            width: this.isMobile ? "92vw" : "520px",
        });
        const inputElement = dialog.element.querySelector("textarea");
        inputElement.value = this.data[STORAGE_NAME].readonlyText;
        const btnsElement = dialog.element.querySelectorAll(".b3-button");
        dialog.bindInput(inputElement, () => {
            (btnsElement[1] as HTMLButtonElement).click();
        });
        inputElement.focus();
        btnsElement[0].addEventListener("click", () => {
            dialog.destroy();
        });
        btnsElement[1].addEventListener("click", () => {
            this.saveData(STORAGE_NAME, {readonlyText: inputElement.value});
            dialog.destroy();
        });
    }
    */

    private readonly eventBusPaste = (event: any) => {
        // 如果需异步处理请调用 preventDefault， 否则会进行默认处理
        event.preventDefault();
        // 如果使用了 preventDefault，必须调用 resolve，否则程序会卡死
        event.detail.resolve({
            textPlain: event.detail.textPlain.trim(),
        });
    };

    private readonly eventBusLog = ({detail}: any) => {
        console.log(detail);
    };

    private readonly onKernelPluginStateChange = async ({detail}: CustomEvent<IKernelPluginState>) => {
        console.log("kernel-plugin-state-change", detail);
        switch (detail.code) {
            case 2: { // running
                const params = ["param 1", "param 2"];
                await this.kernel.rpc.notify["echo-notify"](...params);

                const result = await this.kernel.rpc.call.echo(...params);
                console.group("JSON RPC client -> kernel: call [echo] method");
                console.log("params:", params);
                console.log("result:", result);
                console.groupEnd();

                const request: IKernelPluginRpcCall[] = [
                    { // call with custom id
                        id: 0,
                        method: "echo",
                        params: {key1: "value1"},
                    },
                    { // call with auto-generated id
                        method: "echo",
                        params: ["key2", "value2"],
                    },
                    { // notify will not have response and id
                        method: "echo-notify",
                        params: {key3: "value3"},
                        notification: true,
                    },
                    { // notify will remove id even if it is set
                        id: "3",
                        method: "echo-notify",
                        params: ["key4", "value4"],
                        notification: true,
                    },
                ];
                const response = await this.kernel.rpc.batch(...request);
                console.group("JSON RPC client -> kernel: batch call [echo] and [notify] method");
                console.log("request:", request);
                console.log("response:", response);
                console.groupEnd();
                break;
            }
        }
    };

    private onKernelPluginUnload = async (...params: any[]) => {
        console.group("JSON RPC kernel -> client: unload");
        console.log("params:", params);
        console.groupEnd();
    };

    private onKernelPluginNotify = async (...params: any[]) => {
        console.group("JSON RPC kernel -> client: notify");
        console.log("params:", params);
        console.groupEnd();
    };

    private blockIconEvent({detail}: any) {
        detail.menu.addItem({
            id: "pluginSample_removeSpace",
            iconHTML: "",
            label: this.i18n.removeSpace,
            click: () => {
                const doOperations: IOperation[] = [];
                detail.blockElements.forEach((item: HTMLElement) => {
                    const editElement = item.querySelector('[contenteditable="true"]');
                    if (editElement) {
                        editElement.textContent = editElement.textContent.replace(/ /g, "");
                        doOperations.push({
                            id: item.dataset.nodeId,
                            data: item.outerHTML,
                            action: "update",
                        });
                    }
                });
                detail.protyle.getInstance().transaction(doOperations);
            },
        });
    }

    private showDialog() {
        const dialog = new Dialog({
            title: `SiYuan ${Constants.SIYUAN_VERSION}`,
            content: `<div class="b3-dialog__content">
    <div>appId:</div>
    <div class="fn__hr"></div>
    <div class="plugin-sample__time">${this.app.appId}</div>
    <div class="fn__hr"></div>
    <div class="fn__hr"></div>
    <div>API demo:</div>
    <div class="fn__hr"></div>
    <div class="plugin-sample__time">System current time: <span id="time"></span></div>
    <div class="fn__hr"></div>
    <div class="fn__hr"></div>
    <div>Protyle demo:</div>
    <div class="fn__hr"></div>
    <div id="protyle" style="height: 360px;"></div>
</div>`,
            width: this.isMobile ? "92vw" : "560px",
            height: "540px",
        });
        new Protyle(this.app, dialog.element.querySelector("#protyle"), {
            blockId: this.getEditor().protyle.block.rootID,
        });
        fetchPost("/api/system/currentTime", {}, (response) => {
            dialog.element.querySelector("#time").innerHTML = new Date(response.data).toString();
        });
    }

    private showFlashcardReview() {
        const dialog = new Dialog({
            title: this.i18n.openSelectedCardTab,
            content: '<div class="b3-dialog__content"></div>',
            width: "520px",
        });
        const container = dialog.element.querySelector(".b3-dialog__content");
        const addInput = (title: string) => {
            const label = document.createElement("label");
            label.textContent = title;
            const input = document.createElement("textarea");
            input.className = "b3-text-field fn__block";
            label.append(input);
            container.append(label);
            return input;
        };
        const decks = addInput(this.i18n.reviewSetIDs);
        const documents = addInput(this.i18n.reviewDocumentIDs);
        const button = document.createElement("button");
        button.className = "b3-button";
        button.textContent = this.i18n.openSelectedCardTab;
        button.addEventListener("click", () => {
            const parseIDs = (value: string) => Array.from(new Set(value.split(/[\s,]+/).filter(Boolean)));
            const reviewSetIDs = parseIDs(decks.value);
            if (reviewSetIDs.length === 0) {
                showMessage(this.i18n.reviewSetIDsRequired);
                return;
            }
            const rootIDs = parseIDs(documents.value);
            // 多个卡包取并集并去重；每张卡保留自身调度预设和每日额度，会话采用工作空间队列限制及默认排序。
            const options: FlashcardReviewOptions = {
                app: this.app,
                card: {
                    type: "all",
                    reviewSetIDs,
                    reviewMode: "normal",
                },
            };
            // 版本 1 查询 AST 与卡包及 type/id 范围取交集，此处可选地限制到多个文档。
            if (rootIDs.length > 0) {
                options.card.query = {
                    version: 1,
                    root: {operator: "predicate", field: "rootID", comparator: "in", value: rootIDs},
                };
            }
            // 关闭页签结束会话，恢复布局时根据保存的选择重新创建会话。
            openTab(options);
            dialog.destroy();
        });
        container.append(button);
    }

    private addMenu(rect?: DOMRect) {
        const menu = new Menu("topBarSample", () => {
            console.log(this.i18n.byeMenu);
        });
        if (this.isReadonly) {
            this.addReadonlyText(menu);
            if (this.publishDataStatus) {
                menu.addItem({label: this.publishDataStatus, type: "readonly"});
            }
            menu.addItem({
                icon: "iconRefresh",
                label: this.i18n.publishDataRefresh,
                click: async () => {
                    await this.loadPublishedSettings();
                    showMessage(this.publishDataStatus || this.i18n.publishDataLoaded);
                },
            });
            this.openMenu(menu, rect);
            return;
        }
        menu.addItem({
            icon: "iconSettings",
            label: "Open Setting",
            click: () => {
                openSetting(this.app);
            },
        });
        menu.addItem({
            icon: "iconDrag",
            label: "Open Attribute Panel",
            click: () => {
                openAttributePanel({
                    nodeElement: this.getEditor().protyle.wysiwyg.element.firstElementChild as HTMLElement,
                    protyle: this.getEditor().protyle,
                    focusName: "custom",
                });
            },
        });
        menu.addItem({
            icon: "iconInfo",
            label: "Dialog(open doc first)",
            accelerator: this.commands[0].customHotkey,
            click: () => {
                this.showDialog();
            },
        });
        menu.addItem({
            icon: "iconFocus",
            label: "Select Opened Doc(open doc first)",
            click: () => {
                (getModelByDockType("file") as Files).selectItem(
                    this.getEditor().protyle.notebookId,
                    this.getEditor().protyle.path,
                );
            },
        });
        if (!this.isMobile) {
            menu.addItem({
                icon: "iconFace",
                label: "Open Custom Tab",
                click: () => {
                    const tab = openTab({
                        app: this.app,
                        custom: {
                            icon: "iconFace",
                            title: "Custom Tab",
                            data: {
                                text: platformUtils.isHuawei() ? "Hello, Huawei!" : "This is my custom tab",
                            },
                            id: this.name + TAB_TYPE,
                        },
                    });
                    console.log(tab);
                },
            });
            menu.addItem({
                icon: "iconImage",
                label: "Open Asset Tab(First open the Chinese help document)",
                click: () => {
                    const tab = openTab({
                        app: this.app,
                        asset: {
                            path: "assets/paragraph-20210512165953-ag1nib4.svg",
                        },
                    });
                    console.log(tab);
                },
            });
            menu.addItem({
                icon: "iconFile",
                label: "Open Doc Tab(open doc first)",
                click: async () => {
                    const tab = await openTab({
                        app: this.app,
                        doc: {
                            id: this.getEditor().protyle.block.rootID,
                        },
                    });
                    console.log(tab);
                },
            });
            menu.addItem({
                icon: "iconSearch",
                label: "Open Search Tab",
                click: () => {
                    const tab = openTab({
                        app: this.app,
                        search: {
                            k: "SiYuan",
                        },
                    });
                    console.log(tab);
                },
            });
            menu.addItem({
                icon: "iconRiffCard",
                label: "Open Card Tab",
                click: () => {
                    const tab = openTab({
                        app: this.app,
                        card: {
                            type: "all",
                        },
                    });
                    console.log(tab);
                },
            });
            menu.addItem({
                icon: "iconRiffCard",
                label: this.i18n.openSelectedCardTab,
                click: () => this.showFlashcardReview(),
            });
            menu.addItem({
                icon: "iconLayout",
                label: "Open Float Layer(open doc first)",
                click: () => {
                    this.addFloatLayer({
                        refDefs: [{refID: this.getEditor().protyle.block.rootID}],
                        x: window.innerWidth - 768 - 120,
                        y: 32,
                        isBacklink: false,
                    });
                },
            });
            menu.addItem({
                icon: "iconOpenWindow",
                label: "Open Doc Window(open doc first)",
                click: () => {
                    openWindow({
                        doc: {id: this.getEditor().protyle.block.rootID},
                    });
                },
            });
        } else {
            menu.addItem({
                icon: "iconFile",
                label: "Open Doc(open doc first)",
                click: () => {
                    openMobileFileById(this.app, this.getEditor().protyle.block.rootID);
                },
            });
        }
        menu.addItem({
            icon: "iconLock",
            label: "Lockscreen",
            click: () => {
                lockScreen(this.app);
            },
        });
        menu.addItem({
            icon: "iconQuit",
            label: "Exit Application",
            click: () => {
                exitSiYuan();
            },
        });
        menu.addItem({
            icon: "iconDownload",
            label: "Save Layout",
            click: () => {
                saveLayout(() => {
                    showMessage("Layout saved");
                });
            },
        });
        menu.addItem({
            icon: "iconScrollHoriz",
            label: "Event Bus",
            type: "submenu",
            submenu: [{
                icon: "iconSelect",
                label: "On ws-main",
                click: () => {
                    this.eventBus.on("ws-main", this.eventBusLog);
                },
            }, {
                icon: "iconClose",
                label: "Off ws-main",
                click: () => {
                    this.eventBus.off("ws-main", this.eventBusLog);
                },
            }, {
                icon: "iconSelect",
                label: "On click-blockicon",
                click: () => {
                    this.eventBus.on("click-blockicon", this.blockIconEventBindThis);
                },
            }, {
                icon: "iconClose",
                label: "Off click-blockicon",
                click: () => {
                    this.eventBus.off("click-blockicon", this.blockIconEventBindThis);
                },
            }, {
                icon: "iconSelect",
                label: "On click-pdf",
                click: () => {
                    this.eventBus.on("click-pdf", this.eventBusLog);
                },
            }, {
                icon: "iconClose",
                label: "Off click-pdf",
                click: () => {
                    this.eventBus.off("click-pdf", this.eventBusLog);
                },
            }, {
                icon: "iconSelect",
                label: "On click-editorcontent",
                click: () => {
                    this.eventBus.on("click-editorcontent", this.eventBusLog);
                },
            }, {
                icon: "iconClose",
                label: "Off click-editorcontent",
                click: () => {
                    this.eventBus.off("click-editorcontent", this.eventBusLog);
                },
            }, {
                icon: "iconSelect",
                label: "On click-editortitleicon",
                click: () => {
                    this.eventBus.on("click-editortitleicon", this.eventBusLog);
                },
            }, {
                icon: "iconClose",
                label: "Off click-editortitleicon",
                click: () => {
                    this.eventBus.off("click-editortitleicon", this.eventBusLog);
                },
            }, {
                icon: "iconSelect",
                label: "On click-flashcard-action",
                click: () => {
                    this.eventBus.on("click-flashcard-action", this.eventBusLog);
                },
            }, {
                icon: "iconClose",
                label: "Off click-flashcard-action",
                click: () => {
                    this.eventBus.off("click-flashcard-action", this.eventBusLog);
                },
            }, {
                icon: "iconSelect",
                label: "On open-noneditableblock",
                click: () => {
                    this.eventBus.on("open-noneditableblock", this.eventBusLog);
                },
            }, {
                icon: "iconClose",
                label: "Off open-noneditableblock",
                click: () => {
                    this.eventBus.off("open-noneditableblock", this.eventBusLog);
                },
            }, {
                icon: "iconSelect",
                label: "On loaded-protyle-static",
                click: () => {
                    this.eventBus.on("loaded-protyle-static", this.eventBusLog);
                },
            }, {
                icon: "iconClose",
                label: "Off loaded-protyle-static",
                click: () => {
                    this.eventBus.off("loaded-protyle-static", this.eventBusLog);
                },
            }, {
                icon: "iconSelect",
                label: "On loaded-protyle-dynamic",
                click: () => {
                    this.eventBus.on("loaded-protyle-dynamic", this.eventBusLog);
                },
            }, {
                icon: "iconClose",
                label: "Off loaded-protyle-dynamic",
                click: () => {
                    this.eventBus.off("loaded-protyle-dynamic", this.eventBusLog);
                },
            }, {
                icon: "iconSelect",
                label: "On switch-protyle",
                click: () => {
                    this.eventBus.on("switch-protyle", this.eventBusLog);
                },
            }, {
                icon: "iconClose",
                label: "Off switch-protyle",
                click: () => {
                    this.eventBus.off("switch-protyle", this.eventBusLog);
                },
            }, {
                icon: "iconSelect",
                label: "On destroy-protyle",
                click: () => {
                    this.eventBus.on("destroy-protyle", this.eventBusLog);
                },
            }, {
                icon: "iconClose",
                label: "Off destroy-protyle",
                click: () => {
                    this.eventBus.off("destroy-protyle", this.eventBusLog);
                },
            }, {
                icon: "iconSelect",
                label: "On open-menu-doctree",
                click: () => {
                    this.eventBus.on("open-menu-doctree", this.eventBusLog);
                },
            }, {
                icon: "iconClose",
                label: "Off open-menu-doctree",
                click: () => {
                    this.eventBus.off("open-menu-doctree", this.eventBusLog);
                },
            }, {
                icon: "iconSelect",
                label: "On open-menu-blockref",
                click: () => {
                    this.eventBus.on("open-menu-blockref", this.eventBusLog);
                },
            }, {
                icon: "iconClose",
                label: "Off open-menu-blockref",
                click: () => {
                    this.eventBus.off("open-menu-blockref", this.eventBusLog);
                },
            }, {
                icon: "iconSelect",
                label: "On open-menu-fileannotationref",
                click: () => {
                    this.eventBus.on("open-menu-fileannotationref", this.eventBusLog);
                },
            }, {
                icon: "iconClose",
                label: "Off open-menu-fileannotationref",
                click: () => {
                    this.eventBus.off("open-menu-fileannotationref", this.eventBusLog);
                },
            }, {
                icon: "iconSelect",
                label: "On open-menu-tag",
                click: () => {
                    this.eventBus.on("open-menu-tag", this.eventBusLog);
                },
            }, {
                icon: "iconClose",
                label: "Off open-menu-tag",
                click: () => {
                    this.eventBus.off("open-menu-tag", this.eventBusLog);
                },
            }, {
                icon: "iconSelect",
                label: "On open-menu-link",
                click: () => {
                    this.eventBus.on("open-menu-link", this.eventBusLog);
                },
            }, {
                icon: "iconClose",
                label: "Off open-menu-link",
                click: () => {
                    this.eventBus.off("open-menu-link", this.eventBusLog);
                },
            }, {
                icon: "iconSelect",
                label: "On open-menu-image",
                click: () => {
                    this.eventBus.on("open-menu-image", this.eventBusLog);
                },
            }, {
                icon: "iconClose",
                label: "Off open-menu-image",
                click: () => {
                    this.eventBus.off("open-menu-image", this.eventBusLog);
                },
            }, {
                icon: "iconSelect",
                label: "On open-menu-av",
                click: () => {
                    this.eventBus.on("open-menu-av", this.eventBusLog);
                },
            }, {
                icon: "iconClose",
                label: "Off open-menu-av",
                click: () => {
                    this.eventBus.off("open-menu-av", this.eventBusLog);
                },
            }, {
                icon: "iconSelect",
                label: "On open-menu-content",
                click: () => {
                    this.eventBus.on("open-menu-content", this.eventBusLog);
                },
            }, {
                icon: "iconClose",
                label: "Off open-menu-content",
                click: () => {
                    this.eventBus.off("open-menu-content", this.eventBusLog);
                },
            }, {
                icon: "iconSelect",
                label: "On open-menu-breadcrumbmore",
                click: () => {
                    this.eventBus.on("open-menu-breadcrumbmore", this.eventBusLog);
                },
            }, {
                icon: "iconClose",
                label: "Off open-menu-breadcrumbmore",
                click: () => {
                    this.eventBus.off("open-menu-breadcrumbmore", this.eventBusLog);
                },
            }, {
                icon: "iconSelect",
                label: "On open-menu-inbox",
                click: () => {
                    this.eventBus.on("open-menu-inbox", this.eventBusLog);
                },
            }, {
                icon: "iconClose",
                label: "Off open-menu-inbox",
                click: () => {
                    this.eventBus.off("open-menu-inbox", this.eventBusLog);
                },
            }, {
                icon: "iconSelect",
                label: "On input-search",
                click: () => {
                    this.eventBus.on("input-search", this.eventBusLog);
                },
            }, {
                icon: "iconClose",
                label: "Off input-search",
                click: () => {
                    this.eventBus.off("input-search", this.eventBusLog);
                },
            }, {
                icon: "iconSelect",
                label: "On paste",
                click: () => {
                    this.eventBus.on("paste", this.eventBusPaste);
                },
            }, {
                icon: "iconClose",
                label: "Off paste",
                click: () => {
                    this.eventBus.off("paste", this.eventBusPaste);
                },
            }, {
                icon: "iconSelect",
                label: "On open-siyuan-url-plugin",
                click: () => {
                    this.eventBus.on("open-siyuan-url-plugin", this.eventBusLog);
                },
            }, {
                icon: "iconClose",
                label: "Off open-siyuan-url-plugin",
                click: () => {
                    this.eventBus.off("open-siyuan-url-plugin", this.eventBusLog);
                },
            }, {
                icon: "iconSelect",
                label: "On open-siyuan-url-block",
                click: () => {
                    this.eventBus.on("open-siyuan-url-block", this.eventBusLog);
                },
            }, {
                icon: "iconClose",
                label: "Off open-siyuan-url-block",
                click: () => {
                    this.eventBus.off("open-siyuan-url-block", this.eventBusLog);
                },
            }, {
                icon: "iconSelect",
                label: "On opened-notebook",
                click: () => {
                    this.eventBus.on("opened-notebook", this.eventBusLog);
                },
            }, {
                icon: "iconClose",
                label: "Off opened-notebook",
                click: () => {
                    this.eventBus.off("opened-notebook", this.eventBusLog);
                },
            }, {
                icon: "iconSelect",
                label: "On closed-notebook",
                click: () => {
                    this.eventBus.on("closed-notebook", this.eventBusLog);
                },
            }, {
                icon: "iconClose",
                label: "Off closed-notebook",
                click: () => {
                    this.eventBus.off("closed-notebook", this.eventBusLog);
                },
            }, {
                icon: "iconSelect",
                label: "On kernel-plugin-state-change",
                click: () => {
                    this.eventBus.on("kernel-plugin-state-change", this.onKernelPluginStateChange);
                },
            }, {
                icon: "iconClose",
                label: "Off kernel-plugin-state-change",
                click: () => {
                    this.eventBus.off("kernel-plugin-state-change", this.onKernelPluginStateChange);
                },
            }],
        });
        menu.addSeparator();
        this.addReadonlyText(menu);
        this.openMenu(menu, rect);
    }

    private addReadonlyText(menu: Menu) {
        // 菜单标签支持 HTML，使用文本节点转义配置和快照中的内容。
        const label = document.createElement("span");
        label.textContent = this.data[STORAGE_NAME].readonlyText || this.i18n.readonlyText;
        menu.addItem({
            icon: "iconSparkles",
            label: label.innerHTML,
            type: "readonly",
        });
    }

    private openMenu(menu: Menu, rect?: DOMRect) {
        if (this.isMobile) {
            menu.fullscreen();
        } else {
            menu.open({
                x: rect.right,
                y: rect.bottom,
                isLeft: true,
            });
        }
    }

    private getEditor() {
        const editors = getAllEditor();
        if (editors.length === 0) {
            showMessage("please open doc first");
            return;
        }
        return editors[0];
    }
}
