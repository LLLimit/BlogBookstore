<?php
declare(strict_types=1);define('BOOKSTORE_API',true);require dirname(__DIR__).'/api/bookstore.php';require dirname(__DIR__).'/api/gallery-lib.php';
header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');
try{
 bb_session();$state=bb_state();if(!bb_authenticated($state)){http_response_code(401);throw new RuntimeException('请先登录书店后台。');}$_SESSION['seen']=time();
 if($_SERVER['REQUEST_METHOD']!=='POST'){http_response_code(405);throw new RuntimeException('请使用 POST。');}bb_csrf();session_write_close();
 $action=$_POST['operation']??'';$settings=bb_settings();
 if($action==='catalog'){$settings['galleryUrl']=bb_url($_POST['galleryUrl']??'',false);$settings['galleryType']=($_POST['galleryType']??'')==='json'?'json':'smart-gallery';$source=bb_gallery_source($settings,true);$result=['albums'=>array_map(fn($a)=>['id'=>$a['id'],'title'=>$a['title']],$source['albums'])];}
 elseif($action==='start')$result=bb_gallery_sync($settings,true,1);
 elseif($action==='step')$result=bb_gallery_sync($settings,false,2);
 elseif($action==='status'){bb_gallery_import_seed($settings);$result=bb_gallery_status($settings);}
 elseif($action==='optimize-start')$result=bb_gallery_optimize($settings,true,1);
 elseif($action==='optimize-step')$result=bb_gallery_optimize($settings,false,1);
 elseif($action==='optimize-status')$result=bb_gallery_optimizer_status($settings);
 else throw new RuntimeException('无效操作。');
 echo json_encode($result,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
}catch(Throwable $e){if(http_response_code()<400)http_response_code(400);echo json_encode(['error'=>$e->getMessage()],JSON_UNESCAPED_UNICODE);}
