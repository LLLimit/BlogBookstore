<?php
/** Playlist settings and metadata. Author: LLLimit https://github.com/LLLimit */
declare(strict_types=1);
if (!defined('BOOKSTORE_API')) { http_response_code(404); exit; }

function bb_music_url($value, string $base = ''): string
{
    if (!is_string($value) || trim($value) === '') return '';
    try { return $base !== '' ? bb_redirect(trim($value), $base) : bb_url(trim($value), false); }
    catch (Throwable $error) { return ''; }
}
function bb_music_tracks(array $input, string $base = ''): array
{
    $tracks = [];
    foreach (array_slice($input, 0, 300) as $track) {
        if (!is_array($track)) continue;
        $url = bb_music_url($track['url'] ?? $track['src'] ?? '', $base);
        if ($url === '') continue;
        $name = $track['name'] ?? $track['title'] ?? '未命名音乐';
        $artist = $track['artist'] ?? $track['author'] ?? '';
        if (is_array($artist)) $artist = implode(' / ', array_filter($artist, 'is_string'));
        $tracks[] = ['name'=>bb_text(is_string($name) ? $name : '未命名音乐', 120, '歌曲名称'), 'artist'=>bb_text(is_string($artist) ? $artist : '', 120, '歌手'), 'url'=>$url];
    }
    return $tracks;
}
function bb_playlist_id($value): string
{
    $value = bb_text($value, 2000, '歌单编号或链接', true);
    if (preg_match('~(?:playlist/|[?&#]id=)(\d+)~', $value, $match)) $value = $match[1];
    if (!preg_match('/^[a-zA-Z0-9]{1,80}$/', $value)) throw new InvalidArgumentException('请填写有效的歌单编号，或完整的网易云／QQ 歌单链接。');
    return $value;
}
function bb_playlist_enabled(array $playlist): bool
{
    // Old configurations predate this switch and remain enabled.
    return !array_key_exists('enabled', $playlist) || in_array($playlist['enabled'], [true, 1, '1'], true);
}
function bb_validate_playlists($input): array
{
    if (!is_array($input) || count($input) > 20) throw new InvalidArgumentException('最多配置 20 个歌单。');
    $result = []; $ids = [];
    foreach ($input as $row) {
        if (!is_array($row)) throw new InvalidArgumentException('歌单设置格式无效。');
        if (trim((string) ($row['name'] ?? '')) === '') continue;
        $id = $row['id'] ?? '';
        if (!is_string($id) || !preg_match('/^[a-zA-Z0-9_-]{1,64}$/', $id) || in_array($id, ['builtin','local'], true) || isset($ids[$id])) throw new InvalidArgumentException('歌单标识重复或无效，请重新添加该歌单。');
        $ids[$id] = true;
        $type = $row['type'] ?? 'tracks';
        if (!in_array($type, ['tracks','json','m3u','meting'], true)) throw new InvalidArgumentException('请选择有效的音乐来源。');
        $playlist = ['id'=>$id, 'name'=>bb_text($row['name'], 60, '歌单名称', true), 'type'=>$type, 'enabled'=>bb_playlist_enabled($row)];
        if ($type === 'tracks') {
            $tracks = $row['tracks'] ?? [];
            if (isset($row['trackText'])) {
                $text = $row['trackText']; $tracks = [];
                if (!is_string($text) || strlen($text)>360000 || !preg_match('//u', $text) || preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/', $text)) throw new InvalidArgumentException('音频列表长度或文本格式无效。');
                foreach (preg_split('/\R/u', $text) as $line) {
                    if (trim($line) === '') continue;
                    $parts = array_map('trim', explode('|', $line, 3));
                    if (count($parts) < 2 || bb_music_url($parts[1]) === '') throw new InvalidArgumentException('音频列表每行填写：歌曲名 | 完整音频地址 | 歌手（可省略）。');
                    $tracks[] = ['name'=>$parts[0], 'url'=>$parts[1], 'artist'=>$parts[2] ?? ''];
                }
            }
            if (!is_array($tracks) || count($tracks) > 300) throw new InvalidArgumentException('每个歌单最多配置 300 首歌曲。');
            $playlist['tracks'] = bb_music_tracks($tracks);
            if (!$playlist['tracks']) throw new InvalidArgumentException('请为直链歌单至少添加一首可用音频。');
        } else {
            $playlist['url'] = bb_url($row['url'] ?? '', false);
            if ($type === 'meting') {
                $server = $row['server'] ?? 'netease';
                if (!in_array($server, ['netease','tencent','kugou'], true)) throw new InvalidArgumentException('请选择支持的音乐平台。');
                $playlist['server'] = $server; $playlist['playlistId'] = bb_playlist_id($row['playlistId'] ?? '');
            }
        }
        $result[] = $playlist;
    }
    return $result;
}
function bb_music_source(array $playlist): string
{
    $url = $playlist['url'];
    if ($playlist['type'] !== 'meting') return $url;
    if (strpos($url, ':server') !== false || strpos($url, ':id') !== false) {
        return strtr($url, [':server'=>rawurlencode($playlist['server']), ':type'=>'playlist', ':id'=>rawurlencode($playlist['playlistId']), ':r'=>(string) time()]);
    }
    $parts = parse_url($url); $query = []; parse_str($parts['query'] ?? '', $query);
    $query = array_merge($query, ['server'=>$playlist['server'],'type'=>'playlist','id'=>$playlist['playlistId']]);
    return preg_replace('/[?#].*$/', '', $url) . '?' . http_build_query($query);
}
function bb_resolve_playlist(array $playlist): array
{
    if ($playlist['type'] === 'tracks') return ['tracks'=>$playlist['tracks'],'fetchedAt'=>time()];
    $document = bb_fetch_document(bb_music_source($playlist), 1024 * 1024, '歌单');
    $body = preg_replace('/^\xEF\xBB\xBF/', '', $document['body']);
    if ($playlist['type'] === 'm3u') {
        if (strpos($body, '#EXT-X-') !== false) throw new RuntimeException('这是媒体分片清单，请将流地址作为单曲直链配置。');
        $rows = []; $name = '未命名音乐';
        foreach (preg_split('/\R/u', $body) as $line) {
            $line = trim($line);
            if (strpos($line, '#EXTINF:') === 0) { $name = substr($line, (int) strpos($line, ',') + 1); continue; }
            if ($line === '' || $line[0] === '#') continue;
            $rows[] = ['name'=>$name,'url'=>$line]; $name = '未命名音乐';
            if (count($rows) >= 300) break;
        }
    } else {
        $rows = json_decode($body, true);
        if (!is_array($rows)) throw new RuntimeException('音乐来源返回的不是有效 JSON 歌单。');
        $rows = $rows['tracks'] ?? $rows['data'] ?? $rows;
        if (!is_array($rows)) throw new RuntimeException('歌单中缺少歌曲列表。');
    }
    $tracks = bb_music_tracks($rows, $document['sourceUrl']);
    if (!$tracks) throw new RuntimeException('歌单没有返回可用音频地址，请检查接口、歌单权限或音乐平台限制。');
    return ['tracks'=>$tracks,'fetchedAt'=>time()];
}
function bb_cached_music(array $playlist): array
{
    if ($playlist['type'] === 'tracks') return bb_resolve_playlist($playlist);
    $name = 'music-' . hash('sha256', json_encode($playlist)); $cached = bb_read($name);
    if ($cached && time() - $cached['fetchedAt'] < 300) return $cached;
    $lock = bb_lock($name, false);
    if (!$lock) { if ($cached && time()-$cached['fetchedAt']<1800) return $cached; throw new RuntimeException('歌单正在更新，请稍后重试。'); }
    try {
        $cached = bb_read($name);
        if ($cached && time()-$cached['fetchedAt']<300) return $cached;
        $record = bb_resolve_playlist($playlist); bb_write($name, $record); return $record;
    } finally { flock($lock, LOCK_UN); fclose($lock); }
}
