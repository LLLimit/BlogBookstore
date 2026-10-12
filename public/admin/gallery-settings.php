<section class="card" id="gallery-settings"><div class="card-heading"><span class="section-number">05</span><div><h2>展示的旅游册</h2><p>管理旅游册的来源、章节与排版，每天检查更新并下载到书店本地。</p></div></div>
<div class="fields"><label>数据来源<select name="galleryType"><option value="smart-gallery" <?=($settings['galleryType'] ?? '') === 'smart-gallery' ? 'selected' : ''?>>Smart-Gallery 相册页面</option><option value="json" <?=($settings['galleryType'] ?? '') === 'json' ? 'selected' : ''?>>BookstoreGallery 接口 / JSON 画册</option></select></label><label>相册页面或 JSON 地址<input type="url" name="galleryUrl" value="<?=h($settings['galleryUrl'] ?? '')?>" placeholder="https://example.com/index.php/pictures.html"></label></div>
<button class="button secondary" type="button" id="gallery-discover">读取可选相册</button><div id="gallery-choices" class="fields gallery-choices"></div>
<label>指定相册编号或名称<textarea name="galleryAlbums" id="gallery-albums" rows="2" placeholder="例如：旅游相册,生活相册"><?=h(implode(',', $settings['galleryAlbums'] ?? []))?></textarea></label>
<p class="hint">点击「读取可选相册」勾选相册，或直接填写编号/名称，多个相册用逗号隔开。留空展示全部公开相册；密码相册不导入。先保存设置，再开始同步。页面模式最多 12 本画册，JSON 模式最多 60 本，每本最多 300 张，合计最多 800 张。</p>
<label>本地图片存储上限（MB）<input name="galleryMaxMB" type="number" min="32" max="8192" step="1" value="<?=h($settings['galleryMaxMB'] ?? 512)?>"></label>
<div class="fields two"><button type="button" class="button secondary" id="gallery-sync-start">立即检查并下载更新</button><button type="button" class="button secondary" id="gallery-sync-status">查看同步状态</button></div>
<p id="gallery-sync-message" class="hint" role="status">图片从书店本地加载，进入网站时提前加载画册首页和后续照片。</p>
<p class="hint">自动检查间隔为 24 小时。访客打开网站时会补做过期检查；无人访问时也要每天更新，请在服务器计划任务中每天运行 <code>php /网站根目录/api/gallery-cron.php</code>。大量照片可每 5 分钟运行此命令，它会续传未完成任务，24 小时内不重复检查相册。</p>
<p class="hint">原图保留本地；PHP GD 可自动生成最长边 1600px 的 WebP 展示图，降低翻页加载量。同步失败保留已下载照片，可手动重试。</p>
<h3>旅游册 · 章节与排版</h3><p class="hint">先同步照片，再设置封面、章节、顺序及每张照片的版式。横幅默认铺满双页，竖图可铺满单页或留白。日期与文案显示在照片页角，故事浮动在书外。这里独立保存，不会被每日同步覆盖。</p><button type="button" class="button secondary" id="gallery-editor-load">编辑旅游册</button><p id="gallery-notes-message" class="hint" role="status"></p><div id="gallery-photo-notes"></div>
</section><script src="./gallery-settings.js?v=1.8.0" defer></script><script src="./gallery-editor.js?v=1.8.0" defer></script>
