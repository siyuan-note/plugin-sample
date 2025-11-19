[中文](https://github.com/siyuan-note/plugin-sample/blob/main/README_zh_CN.md)

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
  "backends": ["all"],
  "frontends": ["all"],
  "disabledInPublish": false,
  "displayName": {
    "default": "Plugin Sample",
    "zh_CN": "插件示例"
  },
  "description": {
    "default": "This is a plugin development sample",
    "zh_CN": "这是一个插件开发示例"
  },
  "readme": {
    "default": "README.md",
    "zh_CN": "README_zh_CN.md"
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
* `frontends`: Frontend environment required by the plugin, optional values are `desktop`, `desktop-window`, `mobile`, `browser-desktop`, `browser-mobile` and `all`
  * `desktop`: Desktop
  * `desktop-window`: Desktop window converted from tab
  * `mobile`: Mobile APP
  * `browser-desktop`: Desktop browser
  * `browser-mobile`: Mobile browser
  * `all`: All environments
* `displayName`: Plugin name, displayed in the marketplace list
  * `default`: Default language, must exist. If the plugin supports English, English should be used here
  * `zh_CN`, `en_US` and other languages: optional
* `description`: Plugin description, displayed in the marketplace list
  * `default`: Default language, must exist. If the plugin supports English, English should be used here
  * `zh_CN`, `en_US` and other languages: optional
* `readme`: Readme file name, displayed in the marketplace details page
  * `default`: Default language, must exist. If the plugin supports English, English should be used here
  * `zh_CN`, `en_US` and other languages: optional
* `funding`: Plugin sponsorship information, only one type will be displayed in the marketplace
  * `openCollective`: Open Collective name
  * `patreon`: Patreon name
  * `github`: GitHub login name
  * `custom`: Custom sponsorship link list
* `keywords`: Search keyword list, used for marketplace search function, supplements search keywords beyond the values of `name`, `author`, `displayName`, and `description` fields

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
