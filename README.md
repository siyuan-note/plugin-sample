[中文](https://github.com/siyuan-note/plugin-sample/blob/main/README.zh-CN.md)

# SiYuan plugin sample

## Get started

* Make a copy of this repo as a template with the <kbd>Use this template</kbd> button, please note that the repo name must be the same as the plugin name, the default branch must be `main`
* Clone your repo to a local development folder. For convenience, you can place this folder in your `{workspace}/data/plugins/` folder
* Install [NodeJS](https://nodejs.org/en/download) and [pnpm](https://pnpm.io/installation), then run `pnpm i` in the command line under your repo folder
* Execute `pnpm run dev` for real-time compilation
* Open SiYuan marketplace and enable plugin in downloaded tab

## Development

* i18n/*
* icon.png (160*160)
* index.css
* index.js
* plugin.json
* preview.png (1024*768)
* README*.md
* [Fontend API](https://github.com/siyuan-note/petal)
* [Backend API](https://github.com/siyuan-note/siyuan/blob/master/API.md)

## I18n

In terms of internationalization, our main consideration is to support multiple languages. Specifically, we need to
complete the following tasks:

* Meta information about the plugin itself, such as plugin description and readme
  * `displayName`, `description` and `readme` fields in plugin.json, and the corresponding README*.md file
* Text used in the plugin, such as button text and tooltips
  * src/i18n/*.json language configuration files
  * Use `this.i18.key` to get the text in the code

It is recommended that the plugin supports at least English and Simplified Chinese, so that more people can use it more conveniently. Unsupported languages do not need to be declared in the `displayName`, `description` and `readme` fields in plugin.json.

## plugin.json

A typical example is as follows:

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

* `name`: Plugin package name, must be the same as the GitHub repository name, and cannot be duplicated with other plugins in the marketplace
* `author`: Plugin author name
* `url`: Plugin repo URL
* `version`: Plugin version number, needs to follow the [semver](https://semver.org/) specification
* `minAppVersion`: Minimum SiYuan version required to use this plugin
* `disabledInPublish`: Whether to disable the plugin when using the publish service, defaults to false, i.e., not disabled
* `backends`: Backend environment required by the plugin, optional values are `windows`, `linux`, `darwin`, `docker`, `android`, `ios`, `harmony` and `all`
  * `windows`: Windows desktop
  * `linux`: Linux desktop
  * `darwin`: macOS desktop
  * `docker`: Docker
  * `android`: Android APP
  * `ios`: iOS APP
  * `harmony`: HarmonyOS APP
  * `all`: All environments
* `kernels`: Backend environment supported by the plugin's kernel plugin (`kernel.js`), optional values are the same as `backends` (`windows`, `linux`, `darwin`, `docker`, `android`, `ios`, `harmony` and `all`)
  * Only needed when the plugin includes a kernel plugin; if this field is missing or empty, the kernel plugin will not be started, but the plugin can still be installed and used on the frontend
* `frontends`: Frontend environment required by the plugin, optional values are `desktop`, `desktop-window`, `mobile`, `browser-desktop`, `browser-mobile` and `all`
  * `desktop`: Desktop
  * `desktop-window`: Desktop window converted from tab
  * `mobile`: Mobile APP
  * `browser-desktop`: Desktop browser
  * `browser-mobile`: Mobile browser
  * `all`: All environments
* `displayName`: Plugin name (plain text), displayed in the marketplace list
  * `default`: Default language, must exist. If the plugin supports English, English should be used here
  * `zh-CN`, `en` and other languages: optional, must be [BCP 47](https://tools.ietf.org/html/bcp47) tags (e.g. `zh-CN`, `zh-TW`, `en`, `ja`, `pt-BR`)
* `description`: Plugin description (plain text), displayed in the marketplace list
  * `default`: Default language, must exist. If the plugin supports English, English should be used here
  * `zh-CN`, `en` and other languages: optional, must be BCP 47 tags
* `readme`: Readme file name, displayed in the marketplace details page
  * `default`: Default language, must exist. If the plugin supports English, English should be used here
  * `zh-CN`, `en` and other languages: optional, must be BCP 47 tags
* `funding`: Plugin sponsorship information, only one type will be displayed in the marketplace
  * `openCollective`: Open Collective name
  * `patreon`: Patreon name
  * `github`: GitHub login name
  * `custom`: Custom sponsorship link list
* `keywords`: Search keyword list, used for marketplace search function, supplements search keywords beyond the values of `name`, `author`, `displayName`, and `description` fields

## Startup appearances

A plugin can provide one or more startup appearances without running plugin code during startup. SiYuan scans the resources declared by installed plugins, and the user makes the final selection in <kbd>Settings</kbd> - <kbd>Appearance</kbd> - <kbd>Startup appearance</kbd>. The selection applies only to the current device after restart; a plugin should not modify it proactively.

Declare the appearance IDs in `plugin.json`:

```json
{
  "bootAppearances": [
    "sunrise",
    "night-sky"
  ]
}
```

Place each appearance in its own directory:

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

`boot.json` uses the following format:

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

The layer array order is the visual stacking order. `style.css` runs only inside a non-interactive sandboxed frame and can address generated elements with `[data-layer="<id>"]`; relative `url()` values are resolved from the stylesheet directory. CSS subresources remain limited to the selected appearance by CSP and the resource route; an unavailable indirect resource fails on its own without necessarily disabling the whole appearance. JavaScript, arbitrary HTML, audio, custom fonts, and external URLs are not supported.

The format is validated before an appearance is listed:

* Appearance and layer IDs contain only lowercase letters, digits, and hyphens, are at most 64 characters, and hyphens cannot be consecutive or appear at either end; layer IDs must be unique
* `displayName.default` is required; `frontends` accepts only `desktop` and `mobile`, and when omitted it inherits the compatible native frontends from `plugin.json`
* Colors use 3, 4, 6, or 8 digit hexadecimal notation; omitted background and official UI colors use the built-in startup page colors, while `showLogo` and `showDetails` default to `true`
* `fit` accepts `cover`, `contain`, `fill`, `none`, or `scale-down` and defaults to `cover`; `position` accepts `center`, `top`, `right`, `bottom`, `left`, `top-left`, `top-right`, `bottom-right`, or `bottom-left` and defaults to `center`
* Images use PNG, JPEG, or WebP and are at most 5 MB each; videos use MP4, are at most 20 MB each, require an image poster, and are forced to muted, autoplay, loop, and inline playback
* `boot.json` and `style.css` are each at most 200 KB, an appearance has at most 8 layers, and its directory is at most 50 MB with at most 256 files and directories; relative paths are at most 512 UTF-8 bytes and 16 levels deep
* Paths declared by `boot.json` are relative to the appearance directory; absolute paths, `..`, backslashes, and symbolic links are rejected; unsupported declared resource types or MIME mismatches make the appearance unavailable, and unsupported files are never served

The appearance resources live under workspace `data` and can be synchronized. The active selection is device-local and automatically falls back to SiYuan's built-in startup page if the provider is uninstalled or any validation or loading step fails.

## Package

No matter which method is used to compile and package, we finally need to generate a package.zip, which contains at
least the following files:

* i18n/* (If the plugin supports multiple languages, language files need to be packaged to this directory, otherwise this directory is not needed)
* icon.png (recommended size: 160*160, file size should not exceed 20KB)
* index.css
* index.js
* plugin.json
* preview.png (recommended size: 1024*768, file size should not exceed 200KB)
* README*.md
* boot-appearances/* (optional startup appearance resources)

## List on the marketplace

* Execute `pnpm run build` to generate package.zip
* Create a new GitHub release using your new version number as the "Tag version". See here for an
  example: https://github.com/siyuan-note/plugin-sample/releases
* Upload the file package.zip as binary attachments
* Publish the release

If this is the first release, you also need to create a PR to the [Community Bazaar](https://github.com/siyuan-note/bazaar) repository and modify the plugins.json file in it. This file is the index of all community plugin repositories, the format is:

```json
{
  "repos": [
    "username/reponame"
  ]
}
```

After the PR is merged, the bazaar will automatically update the index and deploy through GitHub Actions. For subsequent plugin releases, you only need to follow the above steps to create a new release, and you don't need to PR the community bazaar repository.

Under normal circumstances, the community bazaar repository will automatically update the index and deploy every hour, and you can check the deployment status at https://github.com/siyuan-note/bazaar/actions.

## Developer's Guide

Developers need to pay attention to the following specifications.

### 1. File Reading and Writing Specifications

If plugins or external extensions require direct reading or writing of files under the `data` directory, please use the kernel API to achieve this. **Do not call `fs` or other electron or nodejs APIs directly**, as it may result in data loss during synchronization and cause damage to cloud data.

Related APIs can be found at: `/api/file/*` (e.g., `/api/file/getFile`).

### 2. Daily Note Attribute Specifications

When creating a daily note in SiYuan, a custom-dailynote-yyyymmdd attribute will be automatically added to the document to distinguish it from regular documents.

> For more details, please refer to [Github Issue #9807](https://github.com/siyuan-note/siyuan/issues/9807).

Developers should pay attention to the following when developing the functionality to manually create Daily Notes:

* If `/api/filetree/createDailyNote` is called to create a daily note, the attribute will be automatically added to the document, and developers do not need to handle it separately
* If a document is created manually by developer's code (e.g., using the `createDocWithMd` API to create a daily note), please manually add this attribute to the document

### 3. Frontend Plugin Lifecycle

Each frontend process owns its own plugin instance. Under normal conditions, SiYuan runs `onload`, `onLayoutReady`, `onDataChanged`, `onunload`, and `uninstall` for the same plugin strictly in sequence and waits for a returned Promise before entering the next phase. `onload` and `onunload` describe whether the plugin is running in the current frontend, `uninstall` runs only when the plugin is removed from the workspace, and `onLayoutReady` runs at most once after `onload` and kernel initialization complete.

`onDataChanged` runs only after the plugin reaches the Ready state and mounting completes. Pending notifications are coalesced. If the plugin leaves the base implementation unchanged, SiYuan reloads the whole plugin instead of invoking the empty callback. A pending notification that has not started is discarded when the plugin is disabled or uninstalled.

Disabling, reloading, or uninstalling a plugin starts one shared five-second removal budget when the first removal request is received. If `onload`, kernel initialization, `onLayoutReady`, or an active `onDataChanged` is still pending, waiting for it consumes the same budget. The remaining time is shared by `onunload` and, only for an actual uninstall, `uninstall`; the budget is not restarted for each hook.

Before the deadline, lifecycle phases remain strictly serial. Once the deadline expires, SiYuan stops waiting. JavaScript promises cannot be forcibly canceled, so a timed-out hook may continue during or after teardown. The five-second budget limits only how long SiYuan waits for Promises; it cannot interrupt synchronous JavaScript. SiYuan still invokes each remaining teardown hook exactly once on a best-effort basis without waiting for it, then removes host-managed resources and destroys the kernel connection.

Closing a standalone window or exiting SiYuan does not trigger frontend plugin lifecycle hooks as part of that action.

Plugin lifecycle hooks should follow these guidelines:

* Keep hooks short and avoid unbounded waits
* Make `onunload` and `uninstall` idempotent and safe when only part of the plugin state has been initialized
* Cancel pending work with a plugin-owned mechanism such as `AbortController`, and check cancellation after each asynchronous boundary before changing the DOM or using plugin APIs
* Persist essential data when the corresponding operation occurs instead of relying on a teardown hook to finish
