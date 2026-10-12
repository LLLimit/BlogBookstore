<?php
declare(strict_types=1);define('BOOKSTORE_API',true);require dirname(__DIR__).'/api/bookstore.php';require dirname(__DIR__).'/api/gallery-lib.php';
header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');
try{
    bb_session();if(!bb_authenticated(bb_state())){http_response_code(401);throw new RuntimeException('请先登录书店后台。');}$_SESSION['seen']=time();
    if($_SERVER['REQUEST_METHOD']!=='POST'){http_response_code(405);throw new RuntimeException('请使用 POST。');}bb_csrf();session_write_close();$settings=bb_settings();
    $action=$_POST['operation']??'';
    if($action==='photos')$result=bb_gallery($settings);
    elseif($action==='album-save'){$payload=$_POST['payload']??'';if(!is_string($payload)||strlen($payload)>2097152)throw new InvalidArgumentException('旅游册编辑数据超过大小限制。');$input=json_decode($payload,true,32,JSON_THROW_ON_ERROR);if(!is_array($input))throw new InvalidArgumentException('旅游册编辑格式无效。');bb_gallery_save_album($settings,$input);$result=['saved'=>true];}
    elseif($action==='save'){$note=bb_gallery_validate_note($_POST['takenAt']??'',$_POST['story']??'');$key=$_POST['photoKey']??'';if(!is_string($key))throw new InvalidArgumentException('照片编号无效。');bb_gallery_save_note($settings,$key,$note);$result=['saved'=>true];}
    else throw new InvalidArgumentException('无效操作。');
    echo json_encode($result,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
}catch(Throwable $e){if(http_response_code()<400)http_response_code($e->getCode()===409?409:400);error_log('[Bookstore album save] '.$e->getMessage());echo json_encode(['error'=>$e->getMessage()],JSON_UNESCAPED_UNICODE);}
