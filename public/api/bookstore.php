<?php
/** BlogBookstore server helpers. Author: LLLimit https://github.com/LLLimit */
declare(strict_types=1);
if (!defined('BOOKSTORE_API')) { http_response_code(404); exit; }
require_once __DIR__ . '/music-lib.php';

function bb_defaults(): array
{
    $data = json_decode((string) @file_get_contents(getenv('BOOKSTORE_CONFIG_FILE') ?: dirname(__DIR__) . '/config.json'), true);
    $defaults = array_merge([
        'title' => '博客书店', 'brandMark' => 'B', 'author' => '博客作者',
        'blogUrl' => '', 'feedUrl' => '', 'feedEndpoint' => './api/feed.php',
        'cacheMinutes' => 15, 'faviconUrl' => '', 'uiAccent' => '#83baff', 'defaultHour' => .8,
        'defaultWeather' => 'clear', 'defaultClouds' => 56, 'defaultBrightness' => 1,
        'musicPlaylists'=>[], 'defaultMusicPlaylist'=>'builtin', 'galleryUrl'=>'', 'galleryType'=>'smart-gallery', 'galleryAlbums'=>[], 'galleryMaxMB'=>512, 'galleryImageMode'=>'hd',
    ], is_array($data) ? array_intersect_key($data, array_flip(array_merge(bb_setting_keys(), ['music']))) : []);
    if (!$defaults['musicPlaylists'] && !empty($defaults['music']) && is_array($defaults['music'])) {
        $defaults['musicPlaylists'] = [['id'=>'custom','name'=>'自定义音乐','type'=>'tracks','tracks'=>bb_music_tracks($defaults['music'])]];
    }
    return $defaults;
}
function bb_setting_keys(): array
{
    return ['title','brandMark','author','blogUrl','feedUrl','cacheMinutes','faviconUrl','uiAccent','defaultHour','defaultWeather','defaultClouds','defaultBrightness','musicPlaylists','defaultMusicPlaylist','galleryUrl','galleryType','galleryAlbums','galleryMaxMB','galleryImageMode'];
}
function bb_dir(): string
{
    $path = getenv('BOOKSTORE_DATA_DIR') ?: dirname(__DIR__) . '/.bookstore';
    if (!is_dir($path) && !@mkdir($path, 0750, true) && !is_dir($path)) throw new RuntimeException('无法创建设置目录，请给予网站运行用户写入权限。');
    return rtrim($path, '/\\');
}
function bb_read(string $name): ?array
{
    $path = bb_dir() . '/' . $name . '.php';
    if (!is_file($path)) return null;
    $value = require $path;
    return is_array($value) ? $value : null;
}
function bb_write(string $name, array $data): void
{
    $path = bb_dir() . '/' . $name . '.php';
    $temporary = bb_dir() . '/write-' . bin2hex(random_bytes(8)) . '.php';
    $body = "<?php\nif (!defined('BOOKSTORE_API')) { http_response_code(404); exit; }\nreturn " . var_export($data, true) . ";\n";
    if (@file_put_contents($temporary, $body, LOCK_EX) === false) throw new RuntimeException('设置无法写入，请检查目录权限和剩余空间。');
    @chmod($temporary, 0640);
    if (!@rename($temporary, $path)) { @unlink($temporary); throw new RuntimeException('设置无法保存，请检查目录权限。'); }
    if (function_exists('opcache_invalidate')) @opcache_invalidate($path, true);
}
function bb_lock(string $name, bool $wait = true)
{
    $path = bb_dir() . '/lock-' . $name . '.php';
    $lock = @fopen($path, 'c+');
    if (!$lock) throw new RuntimeException('无法锁定设置文件，请检查目录写入权限。');
    if (!flock($lock, LOCK_EX | ($wait ? 0 : LOCK_NB))) { fclose($lock); return false; }
    if (fstat($lock)['size'] === 0) fwrite($lock, '<?php http_response_code(404); exit;');
    return $lock;
}
function bb_state(): ?array { return bb_read('state'); }
function bb_settings(): array
{
    $state = bb_state();
    $settings = array_merge(bb_defaults(), is_array($state['settings'] ?? null) ? $state['settings'] : []);
    if ($settings['defaultWeather'] === 'fog') $settings['defaultWeather'] = 'clear';
    return $settings;
}
function bb_public_config(): array
{
    $settings = bb_settings();
    $settings['feedEndpoint'] = './api/feed.php';
    $settings['adminUrl'] = './admin/index.php';
    $settings['configured'] = $settings['feedUrl'] !== '';
    $settings['musicEndpoint'] = './api/music.php';
    $settings['galleryEndpoint'] = './api/gallery.php';
    $enabled = array_values(array_filter($settings['musicPlaylists'], 'bb_playlist_enabled'));
    $settings['musicPlaylists'] = array_map(static function ($playlist) { return ['id'=>$playlist['id'],'name'=>$playlist['name']]; }, $enabled);
    if (!in_array($settings['defaultMusicPlaylist'], array_merge(['builtin'], array_column($enabled, 'id')), true)) $settings['defaultMusicPlaylist'] = 'builtin';
    unset($settings['music']);
    return $settings;
}
function bb_text($value, int $maximum, string $label, bool $required = false): string
{
    if (!is_string($value)) throw new InvalidArgumentException($label . '格式无效。');
    $value = trim($value);
    $length = preg_match_all('/./us', $value);
    if ($length === false || ($required && $value === '') || $length > $maximum || strlen($value) > $maximum * 4) throw new InvalidArgumentException($label . '长度或编码无效。');
    if (preg_match('/[\x00-\x1f\x7f]/', $value)) throw new InvalidArgumentException($label . '不能包含控制字符。');
    return $value;
}
function bb_url($value, bool $optional = true): string
{
    $value = bb_text($value, 2000, '网址');
    if ($optional && $value === '') return '';
    $parts = parse_url($value);
    if (!filter_var($value, FILTER_VALIDATE_URL) || !is_array($parts) || !in_array(strtolower($parts['scheme'] ?? ''), ['http','https'], true)
        || empty($parts['host']) || isset($parts['user']) || isset($parts['pass'])) throw new InvalidArgumentException('请填写完整的 HTTP / HTTPS 网址，网址中不能包含登录信息。');
    return preg_replace_callback('/^https?:/i', static function ($match) { return strtolower($match[0]); }, preg_replace('/#.*$/', '', $value));
}
function bb_validate_settings(array $input): array
{
    $result = [
        'title' => bb_text($input['title'] ?? '', 60, '书店名称', true),
        'brandMark' => bb_text($input['brandMark'] ?? '', 4, '品牌缩写', true),
        'author' => bb_text($input['author'] ?? '', 60, '封面作者'),
        'blogUrl' => bb_url($input['blogUrl'] ?? ''), 'feedUrl' => bb_url($input['feedUrl'] ?? ''),
        'faviconUrl' => bb_url($input['faviconUrl'] ?? ''),
        'galleryUrl' => bb_url($input['galleryUrl'] ?? ''),
        'galleryType' => ($input['galleryType'] ?? '') === 'json' ? 'json' : 'smart-gallery',
    ];
    $accent = $input['uiAccent'] ?? bb_settings()['uiAccent'];
    if (!is_string($accent) || !preg_match('/^#[0-9a-fA-F]{6}$/D', $accent)) throw new InvalidArgumentException('界面配色需要填写六位十六进制颜色，例如 #83baff。');
    $result['uiAccent'] = strtolower($accent);
    foreach (['cacheMinutes' => [5,1440], 'defaultHour' => [0,23.99], 'defaultClouds' => [0,100], 'defaultBrightness' => [0,1.8]] as $key => $bounds) {
        $value = $input[$key] ?? null;
        if (!is_scalar($value) || !is_numeric($value) || !is_finite((float) $value) || $value < $bounds[0] || $value > $bounds[1]) throw new InvalidArgumentException('缓存时间或场景数值超出允许范围。');
        $result[$key] = $key === 'cacheMinutes' ? (int) $value : (float) $value;
    }
    $result['defaultWeather'] = $input['defaultWeather'] ?? '';
    if ($result['defaultWeather'] === 'fog') $result['defaultWeather'] = 'clear';
    if (!in_array($result['defaultWeather'], ['clear','cloudy','rain','storm','snow'], true)) throw new InvalidArgumentException('请选择有效的默认天气。');
    $result['musicPlaylists'] = bb_validate_playlists($input['musicPlaylists'] ?? []);
    $selected = $input['defaultMusicPlaylist'] ?? 'builtin';
    $ids = array_merge(['builtin'], array_column(array_filter($result['musicPlaylists'], 'bb_playlist_enabled'), 'id'));
    $result['defaultMusicPlaylist'] = is_string($selected) && in_array($selected, $ids, true) ? $selected : 'builtin';
    $albums=$input['galleryAlbums']??[];
    if(is_string($albums))$albums=preg_split('/[,，\r\n]+/u',$albums,-1,PREG_SPLIT_NO_EMPTY);
    if(!is_array($albums)||count($albums)>60)throw new InvalidArgumentException('最多选择 60 个相册。');
    $result['galleryAlbums']=array_values(array_unique(array_map(static function($id){if(!is_string($id)&&!is_int($id))throw new InvalidArgumentException('相册编号或名称格式无效。');return bb_text((string)$id,100,'相册编号或名称',true);},$albums)));
    $maximum=$input['galleryMaxMB']??512;
    if(!is_scalar($maximum)||!ctype_digit((string)$maximum)||(int)$maximum<32||(int)$maximum>8192)throw new InvalidArgumentException('画册存储限额需要在 32–8192 MB 之间。');
    $result['galleryMaxMB']=(int)$maximum;
    $result['galleryImageMode']=$input['galleryImageMode']??bb_settings()['galleryImageMode'];
    if(!in_array($result['galleryImageMode'],['hd','original'],true))throw new InvalidArgumentException('请选择有效的照片清晰度模式。');
    return $result;
}
function bb_password($password): string
{
    if (!is_string($password) || strlen($password) < 12 || strlen($password) > 72 || strpos($password, "\0") !== false) throw new InvalidArgumentException('密码需要 12–72 字节，不能包含空字符；可以使用多个词组成的长密码。');
    return $password;
}
function bb_install_key(): string
{
    $lock = bb_lock('setup');
    try {
        if (bb_state()) return '';
        $key = bb_read('install-key');
        if (!$key) { $key = ['key' => bin2hex(random_bytes(24))]; bb_write('install-key', $key); }
        return $key['key'];
    } finally { flock($lock, LOCK_UN); fclose($lock); }
}
function bb_session(): void
{
    ini_set('session.use_strict_mode', '1');
    session_name('BlogBookstoreAdmin');
    $path = str_replace('\\', '/', dirname(dirname($_SERVER['SCRIPT_NAME'] ?? '/admin/index.php')));
    session_set_cookie_params(['lifetime'=>0,'path'=>rtrim($path, '/') . '/','secure'=>!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off','httponly'=>true,'samesite'=>'Strict']);
    session_start();
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(24));
}
function bb_authenticated(?array $state): bool
{
    return $state && isset($_SESSION['auth'], $_SESSION['seen']) && hash_equals($state['sessionVersion'], (string) $_SESSION['auth']) && time() - $_SESSION['seen'] < 7200;
}
function bb_csrf(): void
{
    if (!is_string($_POST['csrf'] ?? null) || !hash_equals($_SESSION['csrf'], $_POST['csrf'])) throw new RuntimeException('页面已过期，请刷新后重试。');
}
function bb_attempt(bool $failure = false, bool $clear = false): void
{
    $name = 'attempt-' . hash('sha256', $_SERVER['REMOTE_ADDR'] ?? 'local');
    $lock = bb_lock($name);
    try {
        $record = bb_read($name) ?: ['since'=>time(),'count'=>0];
        if (time() - $record['since'] >= 900 || $clear) $record = ['since'=>time(),'count'=>0];
        if ($record['count'] >= 8 && !$clear) throw new RuntimeException('尝试次数过多，请 15 分钟后重试。');
        if ($failure) $record['count']++;
        if ($failure || $clear) bb_write($name, $record);
    } finally { flock($lock, LOCK_UN); fclose($lock); }
}
function bb_public_ip(string $ip): bool
{
    if (stripos($ip, '::ffff:') === 0) $ip = substr($ip, 7);
    if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) return false;
    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
        $parts = array_map('intval', explode('.', $ip));
        if (($parts[0] === 100 && $parts[1] >= 64 && $parts[1] <= 127) || ($parts[0] === 198 && in_array($parts[1], [18,19], true))) return false;
    }
    return true;
}
function bb_feed_target(string $url): array
{
    $url = bb_url($url, false);
    $parts = parse_url($url);
    $host = trim($parts['host'], '[]');
    $port = $parts['port'] ?? ($parts['scheme'] === 'https' ? 443 : 80);
    if (!in_array($port, [80,443], true)) throw new RuntimeException('RSS 仅支持公共网站的 80 / 443 端口。');
    if (filter_var($host, FILTER_VALIDATE_IP)) {
        $addresses = [$host];
    } else {
        $overrides = json_decode(getenv('BOOKSTORE_DNS_OVERRIDES') ?: '{}', true);
        if (!is_array($overrides)) throw new RuntimeException('BOOKSTORE_DNS_OVERRIDES 必须是域名与真实公网 IP 对应的 JSON 对象。');
        $override = $overrides[strtolower($host)] ?? null;
        if ($override !== null) {
            $addresses = is_string($override) ? [$override] : $override;
            if (!is_array($addresses)) throw new RuntimeException('域名解析覆盖值必须是公网 IP 或 IP 数组。');
        } else {
            $addresses = gethostbynamel($host) ?: [];
            if (function_exists('dns_get_record')) {
                foreach (@dns_get_record($host, DNS_AAAA) ?: [] as $record) if (isset($record['ipv6'])) $addresses[] = $record['ipv6'];
            }
        }
    }
    if (!$addresses) throw new RuntimeException('无法解析 RSS 域名，请检查地址和服务器网络。');
    foreach ($addresses as $ip) if (!is_string($ip) || !bb_public_ip($ip)) throw new RuntimeException('RSS 必须来自公共网站，不能使用本机或内网地址。');
    return [$host, $port, reset($addresses)];
}
function bb_redirect(string $location, string $base): string
{
    $location = trim($location);
    if (preg_match('~^https?://~i', $location)) return bb_url($location, false);
    $p = parse_url($base);
    $origin = $p['scheme'] . '://' . $p['host'] . (isset($p['port']) ? ':' . $p['port'] : '');
    if (strpos($location, '//') === 0) return bb_url($p['scheme'] . ':' . $location, false);
    $relative = parse_url($location);
    if (!is_array($relative) || isset($relative['scheme']) || strpos($location, '\\') !== false) throw new RuntimeException('RSS 跳转地址无效。');
    $basePath = $p['path'] ?? '/';
    $relativePath = $relative['path'] ?? '';
    if ($relativePath === '') {
        $path = $basePath;
    } else {
        $path = strpos($relativePath, '/') === 0 ? $relativePath : substr($basePath, 0, (int) strrpos($basePath, '/') + 1) . $relativePath;
    }
    $segments = [];
    foreach (explode('/', substr($path, 1)) as $part) {
        if ($part === '..') array_pop($segments);
        elseif ($part !== '.') $segments[] = $part;
    }
    if (preg_match('~/(?:\.|\.\.)$~', $path)) $segments[] = '';
    $query = isset($relative['query']) ? '?' . $relative['query'] : ($relativePath === '' && isset($p['query']) ? '?' . $p['query'] : '');
    return bb_url($origin . '/' . implode('/', $segments) . $query, false);
}
function bb_feed_info(string $xml): array
{
    if (!class_exists('DOMDocument')) throw new RuntimeException('请在 PHP 中启用 DOM / XML 扩展。');
    if (stripos($xml, '<!DOCTYPE') !== false || stripos($xml, '<!ENTITY') !== false) throw new RuntimeException('RSS 不能包含外部实体。');
    $previous = libxml_use_internal_errors(true);
    $doc = new DOMDocument();
    $valid = $doc->loadXML($xml, LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING);
    libxml_clear_errors(); libxml_use_internal_errors($previous);
    if (!$valid || !$doc->documentElement || !in_array(strtolower($doc->documentElement->localName), ['rss','feed','rdf'], true)) throw new RuntimeException('地址返回的不是有效的 RSS / Atom 订阅，请填写订阅地址而不是博客首页。');
    $xpath = new DOMXPath($doc);
    $items = $xpath->query('//*[local-name()="item" or local-name()="entry"]');
    $title = $xpath->evaluate('string((/*[local-name()="feed"]/*[local-name()="title"] | /*/*[local-name()="channel"]/*[local-name()="title"])[1])');
    $titles = [];
    foreach ($items as $item) { if (count($titles) >= 5) break; $titles[] = $xpath->evaluate('string(./*[local-name()="title"][1])', $item); }
    return ['title'=>$title,'count'=>$items->length,'titles'=>$titles];
}
function bb_fetch_document(string $url, int $limit = 4194304, string $label = 'RSS'): array
{
    if (!function_exists('curl_init')) throw new RuntimeException('请在 PHP 中启用 cURL 扩展。');
    for ($hop = 0; $hop <= 3; $hop++) {
        [$host,$port,$ip] = bb_feed_target($url);
        $body = ''; $location = ''; $tooLarge = false;
        $curl = curl_init($url);
        curl_setopt_array($curl, [
            CURLOPT_FOLLOWLOCATION=>false, CURLOPT_CONNECTTIMEOUT=>5, CURLOPT_TIMEOUT=>10,
            CURLOPT_USERAGENT=>'BlogBookstore/1.4 (+https://github.com/LLLimit)',
            CURLOPT_PROTOCOLS=>CURLPROTO_HTTP | CURLPROTO_HTTPS,
            CURLOPT_PROXY=>'', CURLOPT_ENCODING=>'',
            CURLOPT_RESOLVE=>[$host . ':' . $port . ':' . (strpos($ip, ':') !== false ? '[' . $ip . ']' : $ip)],
            CURLOPT_WRITEFUNCTION=>static function ($handle, string $chunk) use (&$body,&$tooLarge,$limit): int {
                if (strlen($body) + strlen($chunk) > $limit) { $tooLarge = true; return 0; }
                $body .= $chunk; return strlen($chunk);
            },
            CURLOPT_HEADERFUNCTION=>static function ($handle, string $line) use (&$location): int {
                if (stripos($line, 'Location:') === 0) $location = trim(substr($line, 9));
                return strlen($line);
            },
        ]);
        $ok = curl_exec($curl); $status = curl_getinfo($curl, CURLINFO_HTTP_CODE); $error = curl_error($curl); curl_close($curl);
        if ($tooLarge) throw new RuntimeException($label . '超过大小限制（' . ($limit / 1024 / 1024) . ' MB）。');
        if ($ok === false) { error_log('[BlogBookstore ' . $label . '] ' . $error); throw new RuntimeException($label . '连接失败，请检查网络、HTTPS 证书和地址。'); }
        if (in_array($status, [301,302,303,307,308], true) && $location !== '') { $url = bb_redirect($location, $url); continue; }
        if ($status !== 200) throw new RuntimeException($label . '返回 HTTP ' . $status . '。');
        return ['body'=>$body,'fetchedAt'=>time(),'sourceUrl'=>$url];
    }
    throw new RuntimeException($label . '跳转次数过多。');
}
function bb_fetch_feed(string $url): array
{
    $document = bb_fetch_document($url);
    return ['xml'=>$document['body'],'fetchedAt'=>$document['fetchedAt'],'sourceUrl'=>$document['sourceUrl'],'info'=>bb_feed_info($document['body'])];
}
function bb_cached_feed(array $settings, bool $refresh = false): array
{
    $url = bb_url($settings['feedUrl'], false);
    $name = 'feed-' . hash('sha256', $url);
    $cached = bb_read($name);
    $fresh = static function ($record) use ($settings): bool { return is_array($record) && time() - $record['fetchedAt'] < $settings['cacheMinutes'] * 60; };
    if (!$refresh && $fresh($cached)) return $cached;
    $lock = bb_lock($name, $refresh);
    if (!$lock) { if ($cached) return $cached + ['stale'=>true]; throw new RuntimeException('订阅正在更新，请稍后刷新。'); }
    try {
        $cached = bb_read($name);
        if (!$refresh && $fresh($cached)) return $cached;
        try { $record = bb_fetch_feed($url); bb_write($name, $record); return $record; }
        catch (Throwable $error) { if ($cached && !$refresh) return $cached + ['stale'=>true]; throw $error; }
    } finally { flock($lock, LOCK_UN); fclose($lock); }
}
