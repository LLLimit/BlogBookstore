<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
define('BOOKSTORE_API',true);require __DIR__.'/bookstore.php';require __DIR__.'/gallery-lib.php';
$started=time();$force=in_array('--retry',$argv,true);
do{$status=bb_gallery_optimize(bb_settings(),$force,1);$force=false;echo json_encode($status,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES).PHP_EOL;if(!empty($status['busy']))exit(2);}while($status['pending']>0&&time()-$started<240);
exit($status['pending']||$status['warnings']?1:0);
