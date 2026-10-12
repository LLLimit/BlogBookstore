<?php
declare(strict_types=1);
define('BOOKSTORE_API', true);
require __DIR__ . '/bookstore.php';
require __DIR__ . '/gallery-lib.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
if ($_SERVER['REQUEST_METHOD'] !== 'GET') { http_response_code(405); exit; }
try { echo json_encode(bb_gallery(bb_settings()),JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR); }
catch (Throwable $error) { error_log('[Bookstore gallery] '.$error->getMessage()); http_response_code(502); echo json_encode(['error'=>'相册暂时无法读取，请检查后台相册地址和来源类型。'],JSON_UNESCAPED_UNICODE); }
