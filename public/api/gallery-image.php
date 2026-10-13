<?php
declare(strict_types=1);define('BOOKSTORE_API',true);require __DIR__.'/bookstore.php';
$file=$_GET['file']??'';
if(!is_string($file)||!preg_match('/^[a-f0-9]{64}(?:-preview|-thumb-v2|-lossless-v2|-hd-3200-q90-v3)?\.(jpg|png|gif|webp|avif)$/D',$file)){http_response_code(404);exit;}
$path=bb_dir().'/gallery-images/'.$file;if(!is_file($path)){http_response_code(404);exit;}
$types=['jpg'=>'image/jpeg','png'=>'image/png','gif'=>'image/gif','webp'=>'image/webp','avif'=>'image/avif'];header('Content-Type: '.$types[pathinfo($file,PATHINFO_EXTENSION)]);header('X-Content-Type-Options: nosniff');header('Cache-Control: public, max-age=31536000, immutable');header('ETag: "'.$file.'"');
if(($_SERVER['HTTP_IF_NONE_MATCH']??'')==='"'.$file.'"'){http_response_code(304);exit;}
header('Content-Length: '.filesize($path));if($_SERVER['REQUEST_METHOD']!=='HEAD')readfile($path);
