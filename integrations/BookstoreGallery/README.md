# BookstoreGallery

为独立 3D 博客书店提供 SmartGallery 公开图片数据的可选桥接插件。

安装目录、插件显示名均为 **BookstoreGallery**：复制到 `usr/plugins/BookstoreGallery/`，在 Typecho 后台启用。需要 Typecho 1.3 与已启用的 SmartGallery。

进入插件设置，复制「公开相册接口」地址，在独立书店后台的照片画册设置中选择 JSON 来源，填入并保存。独立书店也可以直接读取 Smart-Gallery 的公开相册页面，这种方式无需本插件。

只读 `smart_gallery_albums` 与 `smart_gallery_images`，不更改数据库，不导出密码相册，不返回密码字段。图片保持原网址，不复制原图。不包含 Smart-Gallery 原插件源码。

作者 [LLLimit](https://github.com/LLLimit)，MIT 许可证。
