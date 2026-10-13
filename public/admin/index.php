<?php
declare(strict_types=1);
define('BOOKSTORE_API', true);
require dirname(__DIR__) . '/api/bookstore.php';
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: default-src 'none'; connect-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
header('Referrer-Policy: same-origin');
function h($value): string { return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function redirect_admin(string $message): void { $_SESSION['flash'] = $message; header('Location: ./index.php', true, 303); exit; }
function edit_state(callable $edit): array {
    $lock = bb_lock('state');
    try { $state = $edit(bb_state()); bb_write('state', $state); return $state; }
    finally { flock($lock, LOCK_UN); fclose($lock); }
}
$error = ''; $message = ''; $probe = null; $cached = null; $state = null; $authenticated = false;
try {
    bb_session();
    $state = bb_state(); $settings = bb_settings(); $authenticated = bb_authenticated($state);
    if ($authenticated) $_SESSION['seen'] = time();
    $message = $_SESSION['flash'] ?? ''; unset($_SESSION['flash']);
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        bb_csrf();
        $action = isset($_POST['musicTest']) ? 'music-check' : (is_string($_POST['action'] ?? null) ? $_POST['action'] : '');
        if ($action === 'setup') {
            bb_attempt();
            $installKey = bb_install_key();
            if ($installKey === '' || !is_string($_POST['installKey'] ?? null) || !hash_equals($installKey, trim($_POST['installKey']))) { bb_attempt(true); throw new RuntimeException('安装码不正确，或后台已经初始化。'); }
            $password = bb_password($_POST['password'] ?? null);
            if ($password !== ($_POST['confirm'] ?? null)) throw new InvalidArgumentException('两次输入的密码不一致。');
            $state = edit_state(static function ($existing) use ($password,$settings): array {
                if ($existing) throw new RuntimeException('后台已经初始化，请使用管理员密码登录。');
                return ['passwordHash'=>password_hash($password, PASSWORD_DEFAULT),'sessionVersion'=>bin2hex(random_bytes(24)),'settings'=>bb_validate_settings($settings)];
            });
            @unlink(bb_dir() . '/install-key.php');
            bb_attempt(false, true); session_regenerate_id(true);
            $_SESSION['auth'] = $state['sessionVersion']; $_SESSION['seen'] = time(); $_SESSION['csrf'] = bin2hex(random_bytes(24));
            redirect_admin('管理员已创建。填写博客 RSS 地址后，文章就能上架。');
        } elseif ($action === 'login') {
            bb_attempt();
            if (!$state || !is_string($_POST['password'] ?? null) || !password_verify($_POST['password'], $state['passwordHash'])) { bb_attempt(true); throw new RuntimeException('管理员密码不正确。'); }
            bb_attempt(false, true); session_regenerate_id(true);
            $_SESSION['auth'] = $state['sessionVersion']; $_SESSION['seen'] = time(); $_SESSION['csrf'] = bin2hex(random_bytes(24));
            redirect_admin('已登录。');
        } else {
            if (!$authenticated) throw new RuntimeException('请先登录后台。');
            if ($action === 'logout') {
                $_SESSION = []; session_destroy(); header('Location: ./index.php', true, 303); exit;
            } elseif ($action === 'music-check') {
                $settings = bb_validate_settings($_POST); $selected = null;
                foreach ($settings['musicPlaylists'] as $playlist) if ($playlist['id'] === $_POST['musicTest']) $selected = $playlist;
                if (!$selected) throw new RuntimeException('请先填写要测试的歌单。');
                $record = bb_resolve_playlist($selected);
                $message = '歌单“' . $selected['name'] . '”已读取，共 ' . count($record['tracks']) . ' 首。当前输入尚未保存；音频是否可播放请在前台确认。';
            } elseif ($action === 'save' || $action === 'check') {
                $settings = bb_validate_settings($_POST);
                if ($action === 'check') {
                    $probe = bb_fetch_feed(bb_url($settings['feedUrl'], false))['info'];
                    $message = '订阅可读取，共 ' . $probe['count'] . ' 篇文章。当前输入尚未保存。';
                } else {
                    edit_state(static function ($current) use ($settings): array {
                        if (!bb_authenticated($current)) throw new RuntimeException('登录已失效，请重新登录。');
                        $current['settings'] = $settings; return $current;
                    });
                    redirect_admin('设置已保存。刷新书店即可使用新的名称、场景和文章来源。');
                }
            } elseif ($action === 'refresh') {
                $record = bb_cached_feed(bb_settings(), true);
                redirect_admin('RSS 已更新，共 ' . $record['info']['count'] . ' 篇文章。');
            } elseif ($action === 'password') {
                $password = bb_password($_POST['newPassword'] ?? null);
                if ($password !== ($_POST['confirm'] ?? null)) throw new InvalidArgumentException('两次输入的新密码不一致。');
                $state = edit_state(static function ($current) use ($password): array {
                    if (!bb_authenticated($current) || !is_string($_POST['currentPassword'] ?? null) || !password_verify($_POST['currentPassword'], $current['passwordHash'])) throw new RuntimeException('当前密码不正确，或登录已失效。');
                    $current['passwordHash'] = password_hash($password, PASSWORD_DEFAULT); $current['sessionVersion'] = bin2hex(random_bytes(24)); return $current;
                });
                session_regenerate_id(true); $_SESSION['auth'] = $state['sessionVersion']; $_SESSION['csrf'] = bin2hex(random_bytes(24));
                redirect_admin('密码已更新，其他设备的登录已失效。');
            } elseif ($action === 'export') {
                header('Content-Type: application/json; charset=utf-8'); header('Content-Disposition: attachment; filename="config.json"');
                $config = bb_settings(); $config['feedEndpoint'] = './api/feed.php';
                echo json_encode($config, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit;
            } else throw new RuntimeException('没有这个操作。');
        }
    }
    if (!$state) bb_install_key();
    if ($authenticated && $settings['feedUrl'] !== '') $cached = bb_read('feed-' . hash('sha256', $settings['feedUrl']));
} catch (Throwable $exception) { $error = $exception->getMessage(); }
$settings = $settings ?? bb_defaults();
$csrf = $_SESSION['csrf'] ?? '';
$weatherNames = ['clear'=>'晴朗','cloudy'=>'多云','rain'=>'小雨','storm'=>'暴雨','snow'=>'飘雪'];
?><!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>书店设置 · BlogBookstore</title><link rel="icon" href="../favicon.svg"><link rel="stylesheet" href="./style.css?v=1.8.3"><link rel="stylesheet" href="./appearance-settings.css"></head>
<body><div class="shell"><header class="topbar"><a class="identity" href="../"><span class="logo">B</span><span><strong>BlogBookstore</strong><small>把你的博客，放进一间书店。</small></span></a><div class="top-actions"><a class="button subtle" href="../" target="_blank" rel="noopener">打开书店 ↗</a><?php if ($authenticated): ?><form method="post"><input type="hidden" name="csrf" value="<?=h($csrf)?>"><button class="button subtle" name="action" value="logout">退出登录</button></form><?php endif ?></div></header>
<?php if ($error): ?><div class="notice error" role="alert"><?=h($error)?></div><?php endif ?>
<?php if ($message): ?><div class="notice success" role="status"><?=h($message)?></div><?php endif ?>
<?php if (!$authenticated): ?>
<main class="auth-layout"><section class="intro"><span class="eyebrow">YOUR BLOG, YOUR BOOKSHOP</span><h1><?= $state ? '欢迎回来。' : '从这里，开一家书店。' ?></h1><p>接入公开 RSS / Atom 订阅，博客文章就会变成可阅读的书。更换来源和外观设置后，无需重新打包网站。</p><div class="intro-note">独立部署 · 无需数据库 · 支持不同博客系统</div></section><section class="card auth-card"><h2><?= $state ? '管理员登录' : '首次设置管理员' ?></h2>
<form method="post"><input type="hidden" name="csrf" value="<?=h($csrf)?>"><input type="hidden" name="action" value="<?= $state ? 'login' : 'setup' ?>">
<?php if (!$state): ?><p class="hint"><?= getenv('BOOKSTORE_DEV') === '1' ? '在本地项目目录打开' : '在服务器文件管理器打开网站根目录下的' ?> <code><?= getenv('BOOKSTORE_DEV') === '1' ? '.local/data/install-key.php' : '.bookstore/install-key.php' ?></code>，复制其中 <code>key</code> 的值。使用自定义数据目录时，请在该目录寻找文件。安装码不会通过网页提供。</p><label>安装码<input name="installKey" required autocomplete="off" spellcheck="false"></label><?php endif ?>
<label><?= $state ? '管理员密码' : '设置管理员密码' ?><input name="password" type="password" required <?= $state ? '' : 'minlength="12"' ?> maxlength="72" autocomplete="<?= $state ? 'current-password' : 'new-password' ?>"></label>
<?php if (!$state): ?><label>再次输入密码<input name="confirm" type="password" required minlength="12" maxlength="72" autocomplete="new-password"></label><p class="hint">使用至少 12 个字符的密码。后台只创建一个管理员账号。</p><?php endif ?>
<button class="button primary wide" type="submit"><?= $state ? '登录后台' : '创建管理员并进入设置' ?> →</button></form></section></main>
<?php else: ?>
<main><section class="page-heading"><div><span class="eyebrow">BOOKSHOP SETTINGS</span><h1>让书店成为你的样子。</h1><p>保存后刷新书店，设置会应用到所有访客。</p></div><span class="status-tag"><?= $settings['feedUrl'] ? '已设置订阅来源' : '等待接入 RSS' ?></span></section>
<div class="settings-layout"><form class="settings-form" method="post"><input type="hidden" name="csrf" value="<?=h($csrf)?>">
<section class="card"><div class="card-heading"><span class="section-number">01</span><div><h2>书店与品牌</h2><p>页面名称、店面招牌和书本封面会一并更新。</p></div></div><div class="fields two"><label>书店名称<input name="title" value="<?=h($settings['title'])?>" required maxlength="60" placeholder="例如：晚风书店"></label><label>品牌缩写<input name="brandMark" value="<?=h($settings['brandMark'])?>" required maxlength="4" placeholder="B / LL / 书"></label></div><div class="fields two"><label>默认封面作者<input name="author" value="<?=h($settings['author'])?>" maxlength="60" placeholder="RSS 未提供作者时使用"></label><label>博客首页地址<input name="blogUrl" type="url" value="<?=h($settings['blogUrl'])?>" placeholder="https://your-blog.example/"></label></div><label>Favicon 图标地址 <span class="optional">可选</span><input name="faviconUrl" type="url" value="<?=h($settings['faviconUrl'])?>" placeholder="https://your-blog.example/favicon.ico"></label><p class="hint">留空使用默认书本图标；博客地址用于“回到博客”按钮。</p></section>
<section class="card"><div class="card-heading"><span class="section-number">02</span><div><h2>文章订阅</h2><p>支持 RSS 2.0、RSS 1.0 和 Atom；填写订阅地址。</p></div></div><label>RSS / Atom 地址<input name="feedUrl" type="url" value="<?=h($settings['feedUrl'])?>" placeholder="https://your-blog.example/feed.xml"></label><div class="fields two"><label>缓存时间（分钟）<input name="cacheMinutes" type="number" min="5" max="1440" step="1" value="<?=h($settings['cacheMinutes'])?>" required></label><div class="field-note">缓存期间访客复用同一份订阅。博客发布新文章后会在缓存到期时更新，也可手动立即更新。</div></div><button class="button secondary" name="action" value="check">测试当前订阅</button><p class="hint">测试不会保存设置。能读取的历史篇数与正文长度由博客订阅决定。</p>
<?php if ($probe): ?><div class="feed-preview"><strong><?=h($probe['title'] ?: '未命名订阅')?></strong><small>共 <?=h($probe['count'])?> 篇 · 前五篇预览</small><ol><?php foreach ($probe['titles'] as $title): ?><li><?=h($title)?></li><?php endforeach ?></ol></div><?php endif ?></section>
<section class="card"><div class="card-heading"><span class="section-number">03</span><div><h2>默认场景</h2><p>访客仍然可以在书店中调整天气与时间。</p></div></div><div class="fields two"><label>时间（0–23.99 时）<input name="defaultHour" type="number" min="0" max="23.99" step=".01" value="<?=h($settings['defaultHour'])?>" required></label><label>天气<select name="defaultWeather"><?php foreach ($weatherNames as $value=>$label): ?><option value="<?=h($value)?>" <?= $settings['defaultWeather'] === $value ? 'selected' : '' ?>><?=h($label)?></option><?php endforeach ?></select></label><label>云量（%）<input name="defaultClouds" type="number" min="0" max="100" step="1" value="<?=h($settings['defaultClouds'])?>" required></label><label>灯光亮度（0–1.8）<input name="defaultBrightness" type="number" min="0" max="1.8" step=".05" value="<?=h($settings['defaultBrightness'])?>" required></label></div></section>
<?php require __DIR__ . '/appearance-settings.php'; ?>
<?php require __DIR__ . '/music-settings.php'; ?>
<?php require __DIR__ . '/gallery-settings.php'; ?>
<div class="save-bar"><span id="settings-save-status" class="hint" role="status">同时保存已打开的旅游册编辑和网站设置。</span><button class="button primary" name="action" value="save">保存设置 →</button></div><script src="./settings-save.js?v=1.8.3" defer></script></form>
<aside class="sidebar"><section class="card"><span class="eyebrow">FEED STATUS</span><h2>馆藏更新</h2><?php if ($cached): ?><strong class="stat-number"><?=h($cached['info']['count'])?><small>篇文章</small></strong><p><?=h($cached['info']['title'])?></p><p class="hint">最近获取于 <?=h(gmdate('Y-m-d H:i', $cached['fetchedAt']))?> UTC</p><?php else: ?><p class="hint">尚未缓存文章。设置 RSS 后打开书店，或点击立即更新。</p><?php endif ?><form method="post"><input type="hidden" name="csrf" value="<?=h($csrf)?>"><button class="button secondary wide" name="action" value="refresh" <?= $settings['feedUrl'] ? '' : 'disabled' ?>>立即更新已保存的 RSS</button></form></section>
<section class="card"><h2>配置备份</h2><p class="hint">下载书店与完整歌单设置，不包含管理员密码。可用于迁移；纯静态部署时请使用无需私密密钥的音乐来源。</p><form method="post"><input type="hidden" name="csrf" value="<?=h($csrf)?>"><button class="button secondary wide" name="action" value="export">下载配置</button></form></section>
<section class="card"><h2>修改管理员密码</h2><form method="post"><input type="hidden" name="csrf" value="<?=h($csrf)?>"><input type="hidden" name="action" value="password"><label>当前密码<input name="currentPassword" type="password" autocomplete="current-password" required></label><label>新密码<input name="newPassword" type="password" minlength="12" maxlength="72" autocomplete="new-password" required></label><label>再次输入新密码<input name="confirm" type="password" minlength="12" maxlength="72" autocomplete="new-password" required></label><button class="button secondary wide">更新密码</button></form></section></aside></div></main>
<?php endif ?><footer class="footer">BlogBookstore · 由 <a href="https://github.com/LLLimit" target="_blank" rel="noopener">LLLimit</a> 开发</footer></div></body></html>
