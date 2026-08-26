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
* icon.png (160*160)
* index.css
* index.js
* plugin.json
* preview.png (1024*768)
* README*.md
* [前端 API](https://github.com/siyuan-note/petal)
* [后端 API](https://github.com/siyuan-note/siyuan/blob/master/API_zh_CN.md)

## 国际化

国际化方面我们主要考虑的是支持多语言，具体需要完成以下工作：

* 插件自身的元信息，比如插件描述和自述文件
  * plugin.json 中的 `displayName`、`description` 和 `readme` 字段，以及对应的 README*.md 文件
* 插件中使用的文本，比如按钮文字和提示信息
  * src/i18n/*.json 语言配置文件
  * 代码中使用 `this.i18.key` 获取文本

建议插件至少支持英文和简体中文，这样可以方便更多人使用。不支持的语种不需要在 plugin.json 中的 `displayName`、`description` 和 `readme` 字段中声明。

## plugin.json

一个典型的示例如下：

```json
{
  "name": "plugin-sample",
  "author": "Vanessa",
  "url": "https://github.com/siyuan-note/plugin-sample",
  "version": "0.4.2",
  "minAppVersion": "3.3.0",
  "kernels": ["all"],
  "backends": ["all"],
  "frontends": ["all"],
  "disabledInPublish": false,
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
* `funding`：插件赞助信息，集市仅显示其中一种
  * `openCollective`：Open Collective 名称
  * `patreon`：Patreon 名称
  * `github`：GitHub 登录名
  * `custom`：自定义赞助链接列表
* `keywords`：搜索关键字列表，用于集市搜索功能，补充 `name`、`author`、`displayName`、`description` 字段值以外的搜索关键词

## 打包

无论使用何种方式编译打包，我们最终需要生成一个 package.zip，它至少包含如下文件：

* i18n/* (如果插件支持多语言，则需要将语言文件打包到该目录下，否则不需要该目录)
* icon.png (建议尺寸为 160*160、文件大小不超过 20KB)
* index.css
* index.js
* plugin.json
* preview.png (建议尺寸为 1024*768、文件大小不超过 200KB)
* README*.md

## 上架集市

* 执行 `pnpm run build` 生成 package.zip
* 在 GitHub 上创建一个新的发布，使用插件版本号作为 “Tag version”，示例 https://github.com/siyuan-note/plugin-sample/releases
* 上传 package.zip 作为二进制附件
* 提交发布

如果是第一次发布版本，还需要创建一个 PR 到 [Community Bazaar](https://github.com/siyuan-note/bazaar) 社区集市仓库，修改该库的 plugins.json。该文件是所有社区插件库的索引，格式为：

```json
{
  "repos": [
    "username/reponame"
  ]
}
```

PR 被合并以后集市会通过 GitHub Actions 自动更新索引并部署。后续发布新版本插件时只需要按照上述步骤创建新的发布即可，不需要再 PR 社区集市仓库。

正常情况下，社区集市仓库每隔 1 小时会自动更新索引并部署，可在 https://github.com/siyuan-note/bazaar/actions 查看部署状态。

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
