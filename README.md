<p align="center"><img src="public/favicon.svg" width="96" alt="BlogBookstore 图标"></p>

<h1 align="center">BlogBookstore</h1>

<p align="center">把博客变成一间可以走进去阅读的 3D 书店。<br>公开 RSS / Atom · 独立设置后台 · 动态天气 · 可选 Typecho 插件</p>

<p align="center">
  <img src="https://img.shields.io/badge/Three.js-222222?style=flat-square&amp;logo=threedotjs&amp;logoColor=white" alt="Three.js">
  <img src="https://img.shields.io/badge/JavaScript-B89A00?style=flat-square&amp;logo=javascript&amp;logoColor=white" alt="JavaScript">
  <img src="https://img.shields.io/badge/Vite%207-646CFF?style=flat-square&amp;logo=vite&amp;logoColor=white" alt="Vite 7">
  <img src="https://img.shields.io/badge/PHP-777BB4?style=flat-square&amp;logo=php&amp;logoColor=white" alt="PHP">
  <br>
  <img src="https://img.shields.io/badge/RSS%20%2F%20Atom-FFA500?style=flat-square&amp;logo=rss&amp;logoColor=white" alt="RSS / Atom">
  <img src="https://img.shields.io/badge/WebGL%202-990000?style=flat-square&amp;logo=webgl&amp;logoColor=white" alt="WebGL 2">
  <img src="https://img.shields.io/badge/DOMPurify-24563D?style=flat-square" alt="DOMPurify">
  <img src="https://img.shields.io/badge/License%20MIT-222222?style=flat-square" alt="License MIT">
</p>

<p align="center">
  <a href="https://github.com/LLLimit/BlogBookstore/releases/latest">下载发布包</a> ·
  <a href="#快速开始独立部署">快速开始</a> ·
  <a href="#本地开发">本地开发</a> ·
  <a href="#纯静态托管--github-pages">静态托管</a> ·
  <a href="https://github.com/LLLimit/BlogBookstore/issues">反馈问题</a>
</p>

---

BlogBookstore 通过公开 RSS / Atom 将博客文章放进可漫游的两层书店，不限定博客系统、作者或域名。访客可以调整昼夜、天气和音乐，从书架取下文章阅读；站长通过独立 PHP 后台管理订阅和场景。

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 场景与交互 | Three.js · JavaScript · WebGL 2 |
| 开发与构建 | Vite 7 · pnpm · Node.js 22.12+ |
| 服务与订阅 | PHP · cURL · DOM / XML · RSS / Atom |
| 正文清理 | DOMPurify |
| 部署方式 | PHP 网站 · 静态快照 · 可选 Typecho 插件 |

## 功能亮点

| 功能 | 说明 |
| --- | --- |
| 📚 漫游书店 | 两层书店、文章书架、馆藏搜索、二楼休息区与小卖部 |
| 📰 博客接入 | RSS 2.0 / RSS 1.0 / Atom，支持命名空间、相对链接、作者与 XHTML 正文 |
| 🛠️ 独立后台 | 书店名称、品牌、Favicon、订阅、缓存、默认时间与天气 |
| 🔄 订阅管理 | 测试订阅、文章预览、立即更新、配置下载与管理员密码修改 |
| 🌦️ 动态氛围 | 昼夜流转、日落、云团、雨雪和雾；随风雨滴与落地波纹 |
| 🎵 音乐与操作 | 原创 Lo-fi 循环、本机音频、电脑鼠标锁定与手机摇杆 |
| 🔖 阅读体验 | 阅读位置与字号记忆；无法显示 3D 时可从目录阅读 |
| 📦 独立部署 | 无需数据库、Docker 或常驻 Node 服务；3D 在访客浏览器运行 |

文章数量与正文长度由上游订阅决定。单份 RSS 上限 4 MB；前端最多展示 1000 篇，实体书架每批 24 本。

## 发布包

| 文件 | 用途 |
| --- | --- |
| BlogBookstore-standalone-1.4.1.zip | 独立部署，包含 PHP 设置后台 |
| BlogBookstore-source-1.4.1.zip | 通用源码，适合 GitHub 项目与二次开发 |
| BlogBookstore-1.4.1.zip | 可选 Typecho 插件，直接读取本站文章 |

发布包不包含个人博客地址、文章、密码、缓存或本地运行环境。所有 ZIP 的顶层目录均为 BlogBookstore。

## 快速开始：独立部署

准备网站目录与域名，启用 HTTPS、PHP、cURL 和 DOM / XML 扩展。代码兼容 PHP 7.4 以上；新部署请选择仍受官方支持的 PHP 版本。

1. 解压独立包，把 **BlogBookstore 内部的内容**上传到网站根目录。
2. 首页使用 index.html，不需要 Typecho 的伪静态规则。
3. 打开网站的 **/admin/index.php**。
4. 首次打开后，在服务器文件管理器中打开网站根目录的 **.bookstore/install-key.php**，复制 key 的值作为安装码。
5. 填写安装码，设置12–72 字节的管理员密码（建议使用至少 12 个 ASCII 字符）。成功后安装码文件自动删除。
6. 填写名称、博客首页和完整 RSS / Atom 地址，点击“测试当前订阅”，再“保存设置”。
7. 打开书店，文章自动上架。

网站根目录应直接包含 index.html、assets/、admin/、api/、config.json 和 feed.xml。

也可部署到子目录，例如 /bookstore/，此时后台地址为 /bookstore/admin/index.php。

PHP 运行用户需要能创建并写入 .bookstore。可在文件管理器中预建该目录并设置其所有者；其余源码只需读取。不要将整个网站设为 777。

后台设置保存在服务器，刷新前台即可应用，对所有访客生效，无需重新构建。config.json 是默认值，后台保存的设置优先。

### 接入博客

填写博客的公开订阅地址，而不是博客首页。Typecho、WordPress 等使用其公开订阅入口；Hexo、Hugo、Astro 等使用生成的 XML 文件。路径因站点配置而异，优先使用博客自身提供的订阅链接。

支持 HTTP / HTTPS 公网地址的 80 / 443 端口，不支持登录订阅、本机或内网来源。每次跳转都重新验证目标地址，连接固定到已验证的 IP。

缓存时间为 5–1440 分钟，默认 15 分钟。上游暂时不可用时使用当前订阅的旧缓存；切换 RSS 不会混用其他来源的快照。后台“立即更新”会明确显示失败。

### 后台与迁移

后台只有一个管理员账号。密码以 password_hash 保存；操作校验 CSRF，登录有失败次数限制，闲置两小时失效。修改密码后其他设备登录失效。

数据位于 .bookstore，使用受保护的 PHP 文件保存；网页直接访问不输出内容。环境变量 BOOKSTORE_DATA_DIR 可以将数据放在网站目录之外。

升级时备份并保留 .bookstore，覆盖其他发布文件。迁移时复制网站文件和 .bookstore。后台“下载配置”不包含管理员密码。

忘记密码时，在服务器网站根目录执行：

```bash
php api/reset-admin.php
```

按提示输入新密码；该工具只允许服务器终端运行。

## 本地开发

需要 Node.js 22.12+、pnpm；后台需要 PHP、cURL 和 DOM / XML 扩展。

```bash
pnpm install
pnpm dev
```

前台：http://127.0.0.1:8795/

后台：http://127.0.0.1:8795/admin/index.php

Vite 自动启动本机 PHP 并转发后台与 API 请求。PHP 不在 PATH 时，把 .env.example 复制成 .env，设置 BOOKSTORE_PHP_BIN 为 PHP 程序的绝对路径。Windows 也可双击“启动书店.cmd”。

本地数据和安装码位于 .local/data。私人预览默认值可放在 .local/config.json，格式与 public/config.json 相同；这些数据不进入 Git 和发布包。

没有 PHP 时仍可开发 3D 与静态快照；后台会提示配置 PHP，不会把 PHP 源码显示给浏览器。

<details>
<summary><strong>本机代理使用 Fake-IP 时如何配置</strong></summary>

部分本机代理会把公网域名解析为 198.18.x.x，RSS 后台会按保留地址拦截。需要在代理的 DNS 设置中查询真实公网地址，再用 .env 中的 BOOKSTORE_DNS_OVERRIDES 为该域名指定真实 IP。值是 JSON 对象，键是完整的小写域名，值是一个 IP 或 IP 数组。IP 变化后需要重新填写，并重启开发服务。

该选项只覆盖指定域名的解析结果；仍然校验公网地址、限制端口、固定连接 IP 并验证 HTTPS 证书。生产 PHP 站点使用进程环境变量配置这个选项；网络解析正常时无需设置。禁止将本机代理地址或内网 IP 填进去。

</details>

## 构建

```bash
pnpm build
pnpm package
```

dist 是部署目录；releases 包含三个 ZIP。不要把 node_modules、.local、.env、dist 或 releases 提交到 GitHub。

pnpm preview 可预览构建结果；本机 PHP 后台也会启动。请先结束 pnpm dev，它们使用同一个 8795 端口。

<details>
<summary><strong>将二次开发后的源码发布到 GitHub</strong></summary>

源码包中的 BlogBookstore 就是仓库根目录。GitHub 新建空仓库后，在该目录执行以下命令，将 YOUR_REPOSITORY_URL 替换为实际仓库地址：

    git init -b main
    git add .
    git commit -m "Release BlogBookstore 1.4.1"
    git remote add origin YOUR_REPOSITORY_URL
    git push -u origin main

如果使用已经初始化的本地项目，只需执行最后两行。部署包可以作为 GitHub Release 附件上传；使用者下载独立包，无需安装 Node.js。

首次公开发布使用空订阅配置，由每位使用者在自己的后台填写 RSS。管理员和服务器数据分别存于运行环境，不写入源码或发布包。

</details>

## 纯静态托管 / GitHub Pages

GitHub 可以托管项目源码；GitHub Pages 不执行 PHP，因此不提供服务器设置后台。

1. 修改 public/config.json 的书店名称、博客地址和 feedUrl，将 feedEndpoint 设为空字符串。
2. 执行 pnpm sync 下载 RSS 快照。
3. 执行 pnpm build，上传 dist 或配置静态构建发布。
4. 更新文章时重复同步和构建，也可以只更新部署后的 feed.xml 与 feed-meta.json。

配置示例：

    {
      "title": "晚风书店",
      "brandMark": "风",
      "author": "你的名字",
      "blogUrl": "https://your-blog.example/",
      "feedUrl": "https://your-blog.example/feed.xml",
      "feedEndpoint": "",
      "cacheMinutes": 15,
      "faviconUrl": "",
      "defaultHour": 17.3,
      "defaultWeather": "clear",
      "defaultClouds": 56,
      "defaultBrightness": 1
    }

config.json 可添加 music 数组，例如 [{"name":"阅读音乐","url":"./music/reading.mp3"}]，后台保留这个手动配置字段。

## 可选 Typecho 插件

把插件包中的 **BlogBookstore** 上传到 usr/plugins/，确保 usr/plugins/BlogBookstore/Plugin.php 存在。目录名、插件显示名、命名空间与 ZIP 顶层目录全部为 BlogBookstore。

启用插件后，在 Typecho 插件设置填写名称和默认封面作者，点击“打开 3D 书店”。它直接读取本站公开文章，支持分页，不受 RSS 条数限制。草稿、私密、密码和未来文章不公开。

Typecho 模式使用原有插件设置，独立 RSS 模式使用 /admin/index.php。

## 操作与限制

- 电脑进入书店后锁定鼠标；WASD 移动、鼠标环顾、E 阅读。浏览器拒绝锁定时显示提示。
- 漫游按 Esc 暂停，阅读或小卖部按 Esc 关闭窗口后恢复漫游。暂停菜单可以返回街景。
- 手机使用摇杆移动，右侧拖动环顾；3D 需要 WebGL 2。
- 精致模式提供 MSAA / SMAA、接触阴影与雨天反射；流畅模式降低渲染开销。
- 正文通过 DOMPurify 清理，不执行脚本、iframe 或表单；可访问原文。
- 正文图片从原站加载，会产生原站流量；不读取 RSS 以外的付费或私密内容。

## 项目结构

| 目录 | 内容 |
| --- | --- |
| src/ | Three.js 场景、阅读、音乐 |
| public/admin/ | 独立后台 |
| public/api/ | 配置、RSS 缓存与后台工具 |
| scripts/ | 同步与打包 |
| Plugin.php / Action.php | 可选 Typecho 适配 |

## 反馈与许可证

作者：[LLLimit](https://github.com/LLLimit)。欢迎通过 [Issues](https://github.com/LLLimit/BlogBookstore/issues) 反馈问题。

项目采用 [MIT License](LICENSE)。第三方许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)，修改与分发时请保留相应版权和许可文本。
