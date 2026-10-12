<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
define('BOOKSTORE_API',true);require __DIR__.'/bookstore.php';require __DIR__.'/gallery-lib.php';
$force=in_array('--force',$argv,true);$started=time();
do{$status=bb_gallery_sync(bb_settings(),$force,5);$force=false;echo json_encode($status,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES).PHP_EOL;if(!empty($status['busy']))exit(2);}while($status['pending']>0&&time()-$started<240);
if(!$status['pending'])do{$assets=bb_gallery_optimize(bb_settings(),false,1);echo json_encode(['images'=>$assets],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES).PHP_EOL;if(!empty($assets['busy']))break;}while($assets['pending']>0&&time()-$started<240);
exit($status['pending']||$status['failures']||$status['error']||!empty($assets['pending'])||!empty($assets['warnings'])?1:0);
