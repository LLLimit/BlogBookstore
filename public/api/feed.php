<?php
declare(strict_types=1);
define('BOOKSTORE_API', true);
require __DIR__ . '/bookstore.php';
header('X-Content-Type-Options: nosniff');
if ($_SERVER['REQUEST_METHOD'] !== 'GET') { http_response_code(405); header('Allow: GET'); exit; }
try {
    $settings = bb_settings();
    if ($settings['feedUrl'] === '') { http_response_code(422); header('Content-Type: application/json; charset=utf-8'); echo '{"error":"请先在书店后台设置 RSS 地址。"}'; exit; }
    $record = bb_cached_feed($settings);
    header('Content-Type: application/xml; charset=utf-8');
    header('Cache-Control: public, max-age=60');
    header('X-Bookstore-Cache: ' . (!empty($record['stale']) ? 'stale' : 'fresh'));
    header('X-Bookstore-Feed-Url: ' . ($record['sourceUrl'] ?? $settings['feedUrl']));
    echo $record['xml'];
} catch (Throwable $error) {
    error_log('[BlogBookstore RSS] ' . $error->getMessage());
    http_response_code(502); header('Content-Type: application/json; charset=utf-8'); header('Cache-Control: no-store');
    echo json_encode(['error'=>$error->getMessage()], JSON_UNESCAPED_UNICODE);
}
