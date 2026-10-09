<?php
declare(strict_types=1);
define('BOOKSTORE_API', true);
require __DIR__ . '/bookstore.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
if ($_SERVER['REQUEST_METHOD'] !== 'GET') { http_response_code(405); header('Allow: GET'); exit; }
try { echo json_encode(bb_public_config(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR); }
catch (Throwable $error) { error_log('[BlogBookstore config] ' . $error->getMessage()); http_response_code(500); echo '{"error":"配置暂时无法读取，请检查目录权限。"}'; }
