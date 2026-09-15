[English](https://github.com/siyuan-note/plugin-sample/blob/main/README.md)

# 思源笔记插件示例

## 开始

* 通过 <kbd>Use this template</kbd> 按钮将该库文件复制到你自己的库中，请注意库名必须和插件名称一致，默认分支必须为 `main`
* 将你的库克隆到本地开发文件夹中，为了方便可以直接将开发文件夹放置在 `{工作空间}/data/plugins/` 下
* 安装 [NodeJS](https://nodejs.org/en/download) 和 [pnpm](https://pnpm.io/installation)，然后在开发文件夹下执行 `pnpm i`
* 执行 `pnpm run dev` 进行实时编译
* 在思源中打开集市并在下载选项卡中启用插件

## 开发

* i18n/*
* icon.png（可选默认图标，160*160）
* index.css
* index.js
* plugin.json
* preview.png（可选默认预览图，1024*768）
* README*.md
* [前端 API](https://github.com/siyuan-note/petal)
* [后端 API](https://github.com/siyuan-note/siyuan/blob/master/docs/API.zh-CN.md)

## 国际化

国际化方面我们主要考虑的是支持多语言，具体需要完成以下工作：

* 插件自身的元信息，比如插件描述和自述文件
  * plugin.json 中的 `displayName`、`description` 和 `readme` 字段，以及对应的 README*.md 文件
* 插件中使用的文本，比如按钮文字和提示信息
  * src/i18n/*.json 语言配置文件
  * 代码中使用 `this.i18n.key` 获取文本

建议插件至少支持英文和简体中文，这样可以方便更多人使用。不支持的语种不需要在 plugin.json 中的 `displayName`、`description` 和 `readme` 字段中声明。

## plugin.json

一个典型的示例如下：

```json
{
  "name": "plugin-sample",
  "author": "Vanessa",
  "url": "https://github.com/siyuan-note/plugin-sample",
  "version": "0.5.1",
  "minAppVersion": "3.8.4",
  "kernels": ["all"],
  "backends": ["all"],
  "frontends": ["all"],
  "disabledInPublish": false,
  "publish": {
    "resources": [],
    "data": ["readonlyText"]
  },
  "displayName": {
    "default": "Plugin Sample",
    "zh-CN": "插件示例"
  },
  "description": {
    "default": "This is a plugin development sample",
    "zh-CN": "这是一个插件开发示例"
  },
  "readme": {
    "default": "README.md",
    "zh-CN": "README.zh-CN.md"
  },
  "icon": "icon.png",
  "preview": "preview.png",
  "funding": {
    "custom": ["https://ld246.com/sponsor"]
  },
  "keywords": [
    "开发者参考",
    "developer reference",
    "示例插件"
  ]
}
```

* `name`：插件包名，必须和 GitHub 仓库名一致，且不能与集市中的其他插件重复
* `author`：插件作者名
* `url`：插件仓库地址
* `version`：插件版本号，需要遵循 [semver](https://semver.org/lang/zh-CN/) 规范
* `minAppVersion`：插件支持的最低思源笔记版本号
* `disabledInPublish`：使用发布服务时是否禁用该插件，默认为 false，即不禁用
* `publish.resources`：允许发布服务访问者读取的额外前端文件，使用相对于插件目录的完整路径，例如 `images/logo.png`，不支持目录和通配符
* `publish.data`：公开快照的字段名，值只能是字符串、数字、布尔值或 `null`，需要管理员单独授权
* `backends`：插件需要的后端环境，可选值为 `windows`, `linux`, `darwin`, `docker`, `android`, `ios`, `harmony` 和 `all`
  * `windows`：Windows 桌面端
  * `linux`：Linux 桌面端
  * `darwin`：macOS 桌面端
  * `docker`：Docker 端
  * `android`：Android 端
  * `ios`：iOS 端
  * `harmony`：鸿蒙端
  * `all`：所有环境
* `kernels`：插件的内核插件（`kernel.js`）支持的后端环境，可选值同 `backends`（`windows`, `linux`, `darwin`, `docker`, `android`, `ios`, `harmony` 和 `all`）
  * 仅在插件包含内核插件时需要声明；该字段缺失或为空时不会启动内核插件，但插件仍可安装并在前端使用
* `frontends`：插件需要的前端环境，可选值为 `desktop`, `desktop-window`, `mobile`, `browser-desktop`, `browser-mobile` 和 `all`
  * `desktop`：桌面端
  * `desktop-window`：桌面端页签转换的独立窗口
  * `mobile`：移动端
  * `browser-desktop`：桌面端浏览器
  * `browser-mobile`：移动端浏览器
  * `all`：所有环境
* `displayName`：插件名称（纯文本），在插件集市列表中显示
  * `default`：默认语言，必须存在。如果插件支持英文，此处应使用英文
  * `zh-CN`、`en` 等其他语言：可选，须为 [BCP 47](https://tools.ietf.org/html/bcp47) 标签（如 `zh-CN`、`zh-TW`、`en`、`ja`、`pt-BR`）
* `description`：插件描述（纯文本），在插件集市列表中显示
  * `default`：默认语言，必须存在。如果插件支持英文，此处应使用英文
  * `zh-CN`、`en` 等其他语言：可选，须为 BCP 47 标签
* `readme`：自述文件名，在插件集市详情页中显示
  * `default`：默认语言，必须存在。如果插件支持英文，此处应使用英文
  * `zh-CN`、`en` 等其他语言：可选，须为 BCP 47 标签
  * 相对图片存在于 `package.zip` 时从本地加载，否则在线集市会回退到对应的 GitHub Release；如需离线显示，请将图片打入 `package.zip`
* `icon`：可选的集市图标文件名，图片必须位于包根目录；支持 PNG、JPEG、WebP 和 AVIF，最大 64 KiB，建议尺寸为 160*160
* `preview`：可选的集市预览图文件名，图片必须位于包根目录；支持 PNG、JPEG、WebP 和 AVIF，最大 512 KiB，建议尺寸为 1024*768
  * 不支持 SVG。不需要图片时，请删除对应字段及传统文件 `icon.png` 或 `preview.png`，字段值不能为空字符串
* `funding`：插件赞助信息
  * `openCollective`：Open Collective 名称
  * `patreon`：Patreon 名称
  * `github`：GitHub 登录名
  * `custom`：自定义赞助链接列表
  * `links`：带标签的自定义赞助链接列表，例如 `{"label": "赞助", "url": "https://example.com"}`
* `keywords`：搜索关键字列表，用于集市搜索功能，补充 `name`、`author`、`displayName`、`description` 字段值以外的搜索关键词

## 发布服务

本示例要求思源 3.8.4 或更新版本。通过 `loadData` / `saveData` 访问的私有设置与通过 `loadPublishData` / `savePublishData` 访问的公开快照分别管理。访问者和发布页面中的其他代码都能读取公开快照，请仅公开适合披露的内容。

1. 在管理员界面启用插件并允许其用于发布服务，然后在已下载插件卡片的「插件发布数据」中授权公开 `readonlyText`
2. 打开本插件设置，编辑「只读文本」，点击「生成公开快照」公开当前文本
3. 打开发布页面，通过插件顶栏菜单查看快照，使用「刷新公开快照」读取更新

管理员明确选择要公开的字段：

```typescript
await this.savePublishData({readonlyText: textareaElement.value});
```

发布端只读取公开快照：

```typescript
const label = document.createElement("span");
try {
    const data = await this.loadPublishData();
    label.textContent = typeof data.readonlyText === "string" ? data.readonlyText : this.i18n.readonlyText;
} catch {
    label.textContent = this.i18n.readonlyText;
}
```

完整示例见 `src/index.ts`。发布端兼顾只读模式，跳过私有存储和内核通信，每次读取前先清除旧快照。数据不可用（403）、尚未生成（404）或其他读取失败时使用默认值，不回退到私有设置。配置和快照中的文本在用作 HTML 菜单标签前都会转义。

* 保存或删除私有设置不会更新公开快照，公开变更时需再次点击「生成公开快照」
* `savePublishData` 完整替换快照，省略的字段会被移除，传入 `{}` 表示发布空快照
* 数据权限默认关闭，新增声明字段需要重新授权，授权或撤销都会清空旧快照
* 授权后需重新生成快照，停止公开时可在已下载插件卡片中撤销数据授权
* 逐一选择公开的标量值，不要直接传入整个私有配置对象，也不要将其序列化成字符串
* 标准前端入口 `index.js`、`index.css` 和直接位于 `i18n/` 下的 JSON 文件默认可用，本示例没有额外资源，因此 `publish.resources` 为空
* 额外脚本、图片、字体或 HTML 需逐个列入 `publish.resources` 并打入插件包，不得声明 `plugin.json`、`kernel.js`、链接或上级目录路径
* `data/storage/petal` 仍为私有存储，`/api/file/readDir` 仍仅允许管理员调用

已发布的 `siyuan` 1.2.7 尚未声明快照方法，`src/siyuan-publish.d.ts` 临时补充了与 `petal` 一致的声明，升级到包含这些方法的 SDK 后可删除此文件。声明仅提供类型，运行时方法要求思源 3.8.4 或更新版本。使用 `pnpm test` 检查发布示例，使用 `pnpm exec tsc --noEmit` 检查类型。

完整权限模型和 HTTP 接口见[插件发布](https://github.com/siyuan-note/siyuan/blob/master/docs/PLUGIN-PUBLISH.zh-CN.md)。

## 启动页外观

插件可以提供一个或多个启动页外观，启动过程中不会运行插件代码。思源扫描已安装插件声明的资源，最终由用户在 <kbd>设置</kbd> - <kbd>外观</kbd> - <kbd>启动页外观</kbd> 中选择。选择结果在重启后生效且仅应用于当前设备，插件不应主动修改。

在 `plugin.json` 中声明外观 ID：

```json
{
  "bootAppearances": [
    "sunrise",
    "night-sky"
  ]
}
```

每个外观使用独立目录：

```text
boot-appearances/
└── sunrise/
    ├── boot.json
    ├── style.css
    └── assets/
        ├── background.mp4
        ├── poster.webp
        └── logo.webp
```

`boot.json` 使用以下格式：

```json
{
  "schemaVersion": 1,
  "id": "sunrise",
  "displayName": {
    "default": "Sunrise",
    "zh_CN": "日出"
  },
  "frontends": [
    "desktop",
    "mobile"
  ],
  "backgroundColor": "#1e1e1e",
  "style": "style.css",
  "layers": [
    {
      "id": "background",
      "type": "video",
      "src": "assets/background.mp4",
      "poster": "assets/poster.webp",
      "fit": "cover",
      "position": "center"
    },
    {
      "id": "logo",
      "type": "image",
      "src": "assets/logo.webp",
      "fit": "contain",
      "position": "center"
    }
  ],
  "officialUI": {
    "showLogo": false,
    "showDetails": true,
    "textColor": "#ffffff",
    "progressColor": "#d23f31",
    "trackColor": "#ffffff33"
  }
}
```

图层数组顺序就是视觉堆叠顺序。`style.css` 仅在不可交互的沙箱框架内生效，可以使用 `[data-layer="<id>"]` 选择生成的元素；相对 `url()` 从样式表所在目录解析。CSS 子资源仍受 CSP 和资源路由限制，只能访问当前选中的外观；间接资源不可用时仅该资源加载失败，不一定禁用整个外观。不支持 JavaScript、任意 HTML、音频、自定义字体和外部 URL。

外观进入可选列表前会进行以下校验：

* 外观和图层 ID 只能包含小写字母、数字和单个连字符，最长 64 个字符，连字符不能连续，也不能出现在开头或结尾，图层 ID 必须唯一
* 必须提供 `displayName.default`；`frontends` 仅支持 `desktop` 和 `mobile`，缺省时继承 `plugin.json` 中兼容的原生前端
* 颜色使用 3、4、6 或 8 位十六进制格式；背景和官方界面颜色缺省时使用内置启动页颜色，`showLogo` 和 `showDetails` 默认为 `true`
* `fit` 支持 `cover`、`contain`、`fill`、`none` 和 `scale-down`，默认为 `cover`；`position` 支持 `center`、`top`、`right`、`bottom`、`left`、`top-left`、`top-right`、`bottom-right` 和 `bottom-left`，默认为 `center`
* 图片仅支持 PNG、JPEG 和 WebP，单文件不超过 5 MB；视频仅支持 MP4，单文件不超过 20 MB，必须提供图片 poster，并由思源强制静音、自动播放、循环和内嵌播放
* `boot.json` 和 `style.css` 均不超过 200 KB，单个外观最多 8 个图层，目录总量不超过 50 MB，且文件与目录合计不超过 256 个；相对路径不超过 512 个 UTF-8 字节和 16 层
* `boot.json` 声明的路径必须相对于当前外观目录，绝对路径、`..`、反斜杠和符号链接会被拒绝；声明的资源类型不受支持或 MIME 不匹配会使外观不可用，不支持的文件不会被提供给启动页

外观资源保存在工作空间 `data` 下，可以同步；当前选择仅保存在本机。如果提供插件被卸载，或任一校验、加载步骤失败，思源会自动使用内置启动页。

## 打包

无论使用何种方式编译打包，我们最终需要生成一个 package.zip，它至少包含如下文件：

* i18n/* (如果插件支持多语言，则需要将语言文件打包到该目录下，否则不需要该目录)
* `icon` 和 `preview` 字段声明的图片文件（可选）
* index.css
* index.js
* plugin.json
* README*.md
* boot-appearances/*（可选的启动页外观资源）

## 上架集市

* 执行 `pnpm run build` 生成 package.zip
* 在 GitHub 上创建一个新的发布，使用插件版本号作为 “Tag version”，示例 https://github.com/siyuan-note/plugin-sample/releases
* 上传 package.zip 作为二进制附件
* 提交发布

首次发布时，请 Fork [社区集市仓库](https://github.com/siyuan-note/bazaar)，在根目录的 `plugins.txt` 中新增一行 `owner/repo`，然后向 `main` 分支提交 PR。每行一个仓库，不添加逗号或空行；每个新增包 PR 只添加一个包。完整流程和审核规则请参阅[提交集市包](https://github.com/siyuan-note/bazaar/blob/main/README.zh-CN.md#提交集市包)。

PR 合并后，集市会自动更新索引。后续更新只需提升清单中的 `version` 并发布包含 `package.zip` 的正式 GitHub Release，无需再次提交上架 PR。更新时效和排错方法请参阅[更新集市包](https://github.com/siyuan-note/bazaar/blob/main/README.zh-CN.md#更新集市包)，部署状态可在 [Stage 工作流](https://github.com/siyuan-note/bazaar/actions/workflows/stage.yml) 查看。

## 开发者须知

开发者需注意以下规范。

### 1. 读写文件规范

插件或者外部扩展如果有直接读取或者写入 data 下文件的需求，请通过调用内核 API 来实现，**不要自行调用 `fs` 或者其他 electron、nodejs API**，否则可能会导致数据同步时分块丢失，造成云端数据损坏。

相关 API 见 `/api/file/*`（例如 `/api/file/getFile` 等）。

### 2. Daily Note 属性规范

思源在创建日记的时候会自动为文档添加 custom-dailynote-yyyymmdd 属性，以方便将日记文档同普通文档区分。

> 详情请见 [Github Issue #9807](https://github.com/siyuan-note/siyuan/issues/9807)。

开发者在开发手动创建 Daily Note 的功能时请注意：

* 如果调用了 `/api/filetree/createDailyNote` 创建日记，那么文档会自动添加这个属性，无需开发者特别处理
* 如果是开发者代码手动创建文档（例如使用 `createDocWithMd` API 创建日记），请手动为文档添加该属性

### 3. 前端插件生命周期

每个前端进程各自持有一份插件实例。正常情况下，思源会严格串行执行同一插件的 `onload`、`onLayoutReady`、`onDataChanged`、`onunload` 与 `uninstall`，并等待钩子返回的 Promise 后再进入下一阶段。`onload` 和 `onunload` 描述插件是否在当前前端中运行，`uninstall` 仅在从工作空间移除插件时运行，`onLayoutReady` 在 `onload` 与内核初始化完成后最多运行一次。

`onDataChanged` 仅在插件进入 Ready 状态并完成挂载后运行，尚未执行的通知会合并。若插件未覆盖基类实现，思源会重载整个插件，而不是调用空回调。插件被禁用或卸载时，尚未开始的通知会被丢弃。

禁用、重载或卸载插件时，会从首次收到拆除请求起启动一份共享的 5 秒总预算。若 `onload`、内核初始化、`onLayoutReady` 或已经开始的 `onDataChanged` 仍未完成，等待它们会消耗同一份预算。`onunload` 与仅在真正卸载时运行的 `uninstall` 共用剩余时间，不会为每个钩子重新开始计时。

截止时间前，各生命周期阶段保持严格串行。截止时间到达后，思源会停止等待。JavaScript Promise 无法被强制取消，因此超时的钩子可能在拆除期间或拆除后继续运行。这 5 秒只限制思源等待 Promise 的时间，无法中断同步 JavaScript。思源仍会尽力调用每个剩余的拆除钩子一次，但不再等待其完成，随后移除宿主管理的资源并销毁内核连接。

关闭独立窗口或退出思源时，该操作不会触发前端插件生命周期钩子。

插件生命周期钩子应遵循以下准则：

* 保持钩子简短，避免无期限等待
* 确保 `onunload` 和 `uninstall` 幂等，并能安全处理仅完成部分插件状态初始化的情况
* 使用插件自己的 `AbortController` 等机制取消未完成的任务，并在每个异步边界之后检查取消状态，再修改 DOM 或使用插件 API
* 在对应操作发生时持久化必要数据，不要依赖拆除钩子一定能够执行完毕

### 4. 自定义块渲染器

插件可以通过 `customBlockRenders` 注册自定义块渲染器。本示例注册了 `counter` 类型，并在编辑器面包屑栏添加了 <kbd>插入自定义块</kbd> 按钮；点击该按钮会在当前光标处插入一个计数器自定义块。完整实现见 [`src/index.ts`](./src/index.ts)。

对应的 Markdown 如下，其中 `plugin-sample` 是插件包名，实际使用时应替换为 `plugin.json` 中的 `name`。插件包名和块类型必须分别按 URI 组件编码。

```markdown
;;;plugin-sample/counter
0
;;;
```

渲染器只应修改传入的 `element` 挂载元素。`content` 是自定义块的持久化原始内容；需要修改时，应在 `render` 返回后调用 `setContent`。只读状态或内容包含独占一行的 `;;;` 结束标记时，`setContent` 返回 `false`。渲染器可以返回清理函数，用于移除事件监听器、定时器和其他外部资源。

插件未加载或未注册对应类型时，思源会显示原始内容作为回退。渲染产生的 DOM 不会持久化，持久化数据应放在 `content`、块属性或插件自己的存储中。挂载元素内不支持嵌套 Protyle。底层格式详见 [SiYuan `.sy` 文件 JSON 结构规范](https://github.com/siyuan-note/siyuan/blob/master/docs/SY-FORMAT.zh-CN.md#516-%E8%87%AA%E5%AE%9A%E4%B9%89%E5%9D%97)。
