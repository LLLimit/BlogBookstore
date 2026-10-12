<?php
declare(strict_types=1);
define('BOOKSTORE_API', true);
require __DIR__ . '/bookstore.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
if ($_SERVER['REQUEST_METHOD'] !== 'GET') { http_response_code(405); header('Allow: GET'); exit; }
try {
    $id = $_GET['playlist'] ?? '';
    if (!is_string($id)) throw new RuntimeException('歌单标识无效。');
    $playlist = null;
    foreach (bb_settings()['musicPlaylists'] as $item) if ($item['id'] === $id && bb_playlist_enabled($item)) $playlist = $item;
    if (!$playlist) { http_response_code(404); echo '{"error":"歌单不存在，请刷新页面。"}'; exit; }
    echo json_encode(bb_cached_music($playlist), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $error) { http_response_code(502); echo json_encode(['error'=>$error->getMessage()], JSON_UNESCAPED_UNICODE); }
