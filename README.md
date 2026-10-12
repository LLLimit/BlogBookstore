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
  <a href="https://book.darkduck.fun/">在线演示</a> ·
  <a href="https://github.com/LLLimit/BlogBookstore/releases/latest">下载发布包</a> ·
  <a href="#快速开始独立部署">快速开始</a> ·
  <a href="#本地开发">本地开发</a> ·
  <a href="#纯静态托管--github-pages">静态托管</a> ·
  <a href="https://github.com/LLLimit/BlogBookstore/issues">反馈问题</a>
</p>

---

BlogBookstore 通过公开 RSS / Atom 将博客文章放进可漫游的两层书店，不限定博客系统、作者或域名。访客可以调整昼夜、天气和音乐，从书架取下文章阅读；站长通过独立 PHP 后台管理订阅和场景。

## 1.8.1 更新

本次修复翻页分片接缝，增加末页回弹抖动，底部「保存设置」同时保存旅游册，并保留连接失败时的输入。旅游册章节与文章翻页继续沿用。完整记录见 [CHANGELOG](CHANGELOG.md)。

- **TRAVEL NOTES 旅游册**：白色杂志式界面与飞机 Logo，标题 Places worth keeping.；后台选定照片封面，封面居中，翻开后平滑展开为居中的双页书。
- **章节与排序**：后台创建 HONG KONG 等章节，批量归类、调整照片与章节顺序，一键整理单页配对，减少没有内容的空白对页。
- **照片版式**：横幅默认铺满双页；逐张选择跨页铺满、跨页留白、单页铺满、单页留白或自动。
- **文案与故事**：自定义页角文案与日期位置，跨页左右页可单独填写；故事浮动于书外左右侧，手机在书下展示。每日同步保留编辑数据。
- **纸页与结尾**：连续弯曲双面纸页使用 Canvas 2D，支持点击、拖动、方向键与触屏；结尾为旅程文案，继续翻动时半翻回弹。
- **文章翻页**：纯色加标题封面、正文自动分页、字号与页码记忆；保留连续阅读，便于查看原有链接、代码和复杂内容。
- **家具虚影修复**：室内取消过重的屏幕空间环境遮蔽颜色叠加，保留法线描边和实际灯光阴影，减轻桌椅与沙发周围错位黑影。
- **保留已有功能与修复**：Smart-Gallery / JSON 接入、每日本地缓存、提前加载、后台相册选择、歌单与配色；包含此前 CSP、PHP 7.4 兼容与中文图片路径修复。

每日下载、旅游册编辑和相册管理属于独立 PHP 版；纯静态和 Typecho 插件模式通过 JSON 读取旅游册。详见 [旅游册设置](docs/photo-album.md)、[文章阅读](docs/article-book.md)、[保存排查](docs/admin-save.md)、[配色与歌单](docs/appearance-and-playlists.md)和[材质与灯光](docs/stylized-rendering.md)。

## 在线演示

[进入 LLLimit'书店](https://book.darkduck.fun/)

### 雨夜街角

[![雨夜街角：两层书店、斜落雨滴、路灯与湿润路面倒影](https://raw.githubusercontent.com/LLLimit/BlogBookstore/main/docs/images/rainy-street-corner.jpg)](https://book.darkduck.fun/)

暴雨中的书店，配有玻璃流动水珠、屋檐滴水与地面水花。

### 雪天街角

[![雪天街角：飘落雪花、人行道与路面积雪，以及屋顶和雨棚积雪](https://raw.githubusercontent.com/LLLimit/BlogBookstore/main/docs/images/snowy-street-corner.jpg)](https://book.darkduck.fun/)

飘雪时，路面、人行道、路沿、屋顶和雨棚逐渐积雪，店内保持温暖明亮。

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
| 🌦️ 动态氛围 | 昼夜流转、日落、云团和雨雪；随风雨滴、落地波纹、窗面水珠与屋檐滴水，暴雨时水流更密、更快；飘雪时路面、人行道、路沿和屋顶逐渐积雪 |
| 🎵 音乐与操作 | 原创 Lo-fi、后台配置多个歌单、音频直链、JSON/M3U 与兼容 Meting API 的网易云/QQ/酷狗歌单；本机音频、电脑鼠标锁定与手机摇杆 |
| 🔖 阅读体验 | 纯色标题封面、文章翻页、连续阅读切换、页码与字号记忆；无法显示 3D 时可从目录阅读 |
| 🖼️ 旅游册 | TRAVEL NOTES 照片封面、章节与排序、逐张版式、页角日期文案、书外故事、每日本地缓存与提前加载 |
| 🎨 个性设置 | 后台高亮配色、歌单显示开关；双面书架、桌面书本支架与动漫风格材质 |
| 📦 独立部署 | 无需数据库、Docker 或常驻 Node 服务；3D 在访客浏览器运行 |

文章数量与正文长度由上游订阅决定。单份 RSS 上限 4 MB；前端最多展示 1000 篇，实体书架每批 24 本。

## 发布包

| 文件 | 用途 |
| --- | --- |
| BlogBookstore-standalone-1.8.1.zip | 独立部署，包含 PHP 设置后台与相册缓存接口 |
| BlogBookstore-source-1.8.1.zip | 通用源码，包含文档和可选相册桥接插件源码 |
| BlogBookstore-1.8.1.zip | 可选 Typecho 插件，直接读取本站文章 |
| BookstoreGallery-1.0.0.zip | 可选相册桥接插件，把 SmartGallery 公开相册提供为 JSON；读取相册页面时无需安装 |

通用发布包不携带个人订阅配置、照片、音乐、密码、缓存或本地运行环境。书店 ZIP 的顶层目录为 BlogBookstore；相册桥接插件 ZIP 的顶层目录为 BookstoreGallery。

### 从旧版升级

备份网站，将独立包 `BlogBookstore/` 内的内容覆盖到网站根目录，保留原来的 `.bookstore/`、自定义音乐和图片。无需重新安装后台，已有设置优先于包内默认配置。登录 `/admin` 保存相册来源及展示相册，再检查下载更新。需要无人访问时也每天更新，按 [画册说明](docs/photo-album.md)添加服务器计划任务。

覆盖完整 1.8.1 即包含此前相册修复与本次功能；不要再用旧版相册小补丁覆盖新版文件。升级后进入 `/admin` →「展示的旅游册」→「编辑旅游册」设置封面、章节、照片顺序与版式，点击「保存这本旅游册」。旧照片日期和故事自动沿用。

## 快速开始：独立部署

准备网站目录与域名，启用 HTTPS、PHP、cURL 和 DOM / XML 扩展。代码兼容 PHP 7.4 以上；新部署请选择仍受官方支持的 PHP 版本。

1. 解压独立包，把 **BlogBookstore 内部的内容**上传到网站根目录。
2. 首页使用 index.html，不需要 Typecho 的伪静态规则。
3. 在网站网址后添加 **/admin** 进入后台，前台导航不展示设置入口。
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
    git commit -m "Release BlogBookstore 1.5.0"
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

### 音乐来源与歌单

独立后台的“音乐来源与歌单”支持添加、删除、测试多个歌单，并设置默认歌单。保存后刷新书店，播放器可分别选择歌单和歌曲；“单曲／歌单”按钮切换循环方式。音量和访客选择的歌单保存在当前浏览器。本机音频仍通过前台“添加音乐”选择。

| 来源 | 后台填写方式 |
| --- | --- |
| 音频直链列表 | 每行 `歌曲名 \| 完整音频地址 \| 歌手`，歌手可省略；支持自己的音频文件或外部直链 |
| JSON 歌单 | 填写返回歌曲数组或 `{ "tracks": [...] }` 的公网地址，歌曲字段为 `name`、`artist`、`url` |
| M3U 歌单 | 填写公网 `.m3u` 地址，支持 `#EXTINF` 标题和相对音频路径 |
| Meting API | 选择网易云、QQ 或酷狗，填写兼容 API 地址及歌单编号；网易云/QQ 也可以粘贴歌单链接 |

Meting 来源按 [MetingJS 文档](https://github.com/metowolf/MetingJS#advanced) 的 `server`、`type=playlist`、`id` 参数获取歌单。后台提供 `https://api.i-meto.com/meting/api` 和 [Meting API 项目](https://github.com/injahow/meting-api) 的 `https://api.injahow.cn/meting/` 地址参考，也可填自建兼容接口。支持带 `:server`、`:type`、`:id` 占位符的 URL。

**歌单能读取不代表每首都能播放。**会员、地区限制和音频地址有效期由平台及接口决定，接口失效时可在后台更换来源。内置原创音乐随时可用，不依赖外部服务。

独立站点只代理、缓存歌单文字信息五分钟，音频由访客浏览器直接从音频地址播放；不会经书店服务器中转音频。单个歌单文件上限 1 MB，最多 20 个歌单、每个最多 300 首。公开配置不暴露远程歌单/API 地址，后台导出的配置包含完整来源，供站长备份。

纯静态及 Typecho 插件模式可以在配置中填写以下 `musicPlaylists` 数组；插件后台有对应 JSON 输入框。远程歌单由浏览器直接获取，来源须允许 CORS。示例：

```json
[
  {
    "id": "reading",
    "name": "阅读歌单",
    "type": "tracks",
    "tracks": [{"name": "轻音乐", "artist": "", "url": "https://your-site.example/music/reading.mp3"}]
  },
  {
    "id": "cloud-list",
    "name": "我的平台歌单",
    "type": "meting",
    "url": "https://your-meting.example/api.php",
    "server": "netease",
    "playlistId": "123456789"
  }
]
```

JSON/M3U 来源用 `type: "json"` 或 `"m3u"` 和 `url`；默认歌单用 `defaultMusicPlaylist` 指定 `id`，内置歌单为 `builtin`。旧版 `music` 数组兼容读取，独立后台会将其显示为自定义歌单。旧版默认天气为薄雾时，升级后自动使用晴朗。

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

## 照片画册（1.7.1）

Travel Time 极简杂志封面配飞机 Logo；支持连续弯曲翻页、纸张厚度与移动阴影。16:9 等横幅跨两页，其余单页。接入 Smart-Gallery 页面、BookstoreGallery 接口或 JSON，在后台勾选要展示的画册，并逐张设置日期时间与故事。前台只提供翻阅入口；手动访问 `/admin` 进入后台。

独立 PHP 版每隔 24 小时检查更新，将图片下载到本地；保留原图，启用 GD 时生成轻量 WebP 展示图。进入网站即预加载照片，后台提供手动检查、下载和同步状态。无人访问也要更新时，设置服务器计划任务运行 `php /网站根目录/api/gallery-cron.php`；大相册可每 5 分钟运行以继续未完成下载，仍按 24 小时检查来源。详见[画册接入与升级说明](docs/photo-album.md)。
