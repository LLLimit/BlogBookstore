<?php
declare(strict_types=1);define('BOOKSTORE_API',true);require __DIR__.'/bookstore.php';require __DIR__.'/gallery-lib.php';
header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');
// Public maintenance obeys the daily interval; visitors cannot force upstream fetches.
if($_SERVER['REQUEST_METHOD']!=='POST'){http_response_code(405);exit;}
try{bb_gallery_sync(bb_settings(),false,1);echo json_encode(bb_gallery(bb_settings()),JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);}
catch(Throwable $e){http_response_code(503);echo json_encode(['error'=>'相册正在整理，请稍后重试。'],JSON_UNESCAPED_UNICODE);}
