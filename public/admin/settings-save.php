<?php
declare(strict_types=1);
define('BOOKSTORE_API',true);
require dirname(__DIR__).'/api/bookstore.php';
header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');
try{
    bb_session();if(!bb_authenticated(bb_state())){http_response_code(401);throw new RuntimeException('请先登录书店后台。');}
    if($_SERVER['REQUEST_METHOD']!=='POST'){http_response_code(405);throw new RuntimeException('请使用 POST。');}
    bb_csrf();$_SESSION['seen']=time();session_write_close();
    $settings=bb_validate_settings($_POST);
    $lock=bb_lock('state',false);if(!$lock)throw new RuntimeException('另一个任务正在保存设置，请稍后重试。',409);
    try{$state=bb_state();if(!bb_authenticated($state))throw new RuntimeException('登录已失效，请重新登录。',401);$state['settings']=$settings;bb_write('state',$state);}
    finally{flock($lock,LOCK_UN);fclose($lock);}
    echo json_encode(['saved'=>true],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
}catch(Throwable $e){if(http_response_code()<400)http_response_code(in_array($e->getCode(),[401,409],true)?$e->getCode():400);error_log('[Bookstore settings save] '.$e->getMessage());echo json_encode(['error'=>$e->getMessage()],JSON_UNESCAPED_UNICODE);}
