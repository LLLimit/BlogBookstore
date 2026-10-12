# 后台保存与连接中断（1.8.1）

旅游册可以逐本保存，也可以点击页面底部「保存设置」：先保存已打开的旅游册编辑，再保存网站设置。总保存使用同站 JSON 接口，在当前页面显示结果，不再通过整页跳转完成。

保存失败时，章节、排序、日期、故事与网站设置输入继续留在页面。先按错误提示处理，再点击保存；直接刷新页面会丢失尚未保存的输入。不同旅游册依次保存，若中途失败，已经成功的旅游册仍已保存，不会回滚。

保存接口只验证和写入配置，不下载图片或解析音乐。登录会话在文件写入前释放；其他任务占用文件锁时返回 HTTP 409，避免一直等待。管理员密码和其他后台设置沿用原数据目录。

## 代理或 VPN 的线路问题

如果浏览器报连接中断或 Failed to fetch，但访问日志没有相应保存请求，可以对比经过代理和直连的结果。服务器上执行：

```bash
curl -I https://book.example.com/
curl --noproxy '*' -I https://book.example.com/
```

这只检测运行命令环境的线路，浏览器需要单独确认。使用 Clash 类客户端时，可将本站域名放入直连规则，例如 `DOMAIN,book.example.com,DIRECT`，放在可能匹配的代理规则之前。无需停用整个代理。

## 读取末尾日志

将下方域名替换为实际域名，在 SSH 终端执行。这些命令读取末尾，适合面板打开大日志卡住时使用：

```bash
tail -n 80 /www/wwwlogs/book.example.com.error.log
tail -n 60 /www/server/php/*/var/log/php-fpm.log
tail -n 1000 /www/wwwlogs/book.example.com.log | grep -E 'POST /admin/(index.php|gallery-notes.php|settings-save.php)' | tail -n 20
journalctl -k --since "30 minutes ago" --no-pager | tail -n 60
free -h
```

旧版 `/admin/index.php` 保存成功后返回 303，这是正常跳转。新版 `/admin/settings-save.php` 成功返回 200 JSON。HTTP 401 表示需要登录，409 表示另一个保存正在进行；HTTP 200 也可能是错误页面，需要同时检查响应内容。以保存时刻的记录判断，历史的 favicon 或其他路径 404 不足以说明保存接口发生故障。
