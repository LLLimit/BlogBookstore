<?php
declare(strict_types=1);
function bb_gallery_key(array $settings): string { $ids=$settings['galleryAlbums']??[];sort($ids);return hash('sha256',json_encode([$settings['galleryUrl']??'',$settings['galleryType']??'smart-gallery',$ids])); }
function bb_gallery_image_dir(): string { $path=bb_dir().'/gallery-images';if(!is_dir($path)&&!mkdir($path,0750,true))throw new RuntimeException('无法创建画册图片目录。');return $path; }
function bb_gallery_image_fetch(string $url, array $previous, string $source = ''): array {
    // Some image hosts require the gallery site's origin as the Referer.
    // Do not forward its query string or any credentials to image hosts.
    $origin=parse_url($source);$referer=is_array($origin)&&isset($origin['scheme'],$origin['host'])?$origin['scheme'].'://'.$origin['host'].(isset($origin['port'])?':'.$origin['port']:'').'/':'';
    for($hop=0;$hop<4;$hop++) {
        [$host,$port,$ip]=bb_feed_target(bb_url($url,false)); $body='';$headers=[];$large=false;
        $curl=curl_init($url);$conditional=[];
        foreach(['etag'=>'If-None-Match','modified'=>'If-Modified-Since'] as $key=>$header)if(!empty($previous[$key])&&!preg_match('/[\r\n]/',$previous[$key]))$conditional[]=$header.': '.$previous[$key];
        curl_setopt_array($curl,[CURLOPT_FOLLOWLOCATION=>false,CURLOPT_CONNECTTIMEOUT=>4,CURLOPT_TIMEOUT=>12,CURLOPT_USERAGENT=>'BlogBookstore Gallery/1.7',CURLOPT_PROTOCOLS=>CURLPROTO_HTTP|CURLPROTO_HTTPS,CURLOPT_PROXY=>'',CURLOPT_REFERER=>$referer,CURLOPT_RESOLVE=>[$host.':'.$port.':'.(strpos($ip,':')!==false?'['.$ip.']':$ip)],CURLOPT_HTTPHEADER=>$conditional,
            CURLOPT_WRITEFUNCTION=>static function($c,string $chunk)use(&$body,&$large):int{if(strlen($body)+strlen($chunk)>12582912){$large=true;return 0;}$body.=$chunk;return strlen($chunk);},
            CURLOPT_HEADERFUNCTION=>static function($c,string $line)use(&$headers):int{$pos=strpos($line,':');if($pos!==false)$headers[strtolower(trim(substr($line,0,$pos)))]=trim(substr($line,$pos+1));return strlen($line);}]);
        $ok=curl_exec($curl);$status=curl_getinfo($curl,CURLINFO_HTTP_CODE);$errno=curl_errno($curl);curl_close($curl);
        if($large)throw new RuntimeException('图片超过 12 MB。');
        if($ok===false){
            $messages=[
                6=>'图片域名解析失败，请检查服务器 DNS。',
                7=>'服务器无法连接图片来源，请检查出站网络。',
                28=>'图片下载超时，请检查服务器到博客的连接后手动重试。',
                60=>'图片 HTTPS 证书校验失败，请配置 PHP cURL 的 CA 证书。',
                77=>'图片 HTTPS 证书校验失败，请配置 PHP cURL 的 CA 证书。',
            ];
            throw new RuntimeException($messages[$errno]??('图片连接失败（cURL '.$errno.'），请检查服务器网络。'));
        }
        if($status===304&&!empty($previous['file'])&&is_file(bb_gallery_image_dir().'/'.$previous['file']))return $previous+['unchanged'=>true];
        if(in_array($status,[301,302,303,307,308],true)&&isset($headers['location'])){$url=bb_redirect($headers['location'],$url);continue;}
        if($status!==200)throw new RuntimeException('图片返回 HTTP '.$status.'。');
        $info=@getimagesizefromstring($body);$extensions=[IMAGETYPE_JPEG=>'jpg',IMAGETYPE_PNG=>'png',IMAGETYPE_GIF=>'gif',IMAGETYPE_WEBP=>'webp'];if(defined('IMAGETYPE_AVIF'))$extensions[IMAGETYPE_AVIF]='avif';
        if(!$info||!isset($extensions[$info[2]])||$info[0]*$info[1]>40000000)throw new RuntimeException('图片格式或尺寸不支持。');
        return ['body'=>$body,'ext'=>$extensions[$info[2]],'width'=>$info[0],'height'=>$info[1],'etag'=>substr($headers['etag']??'',0,300),'modified'=>substr($headers['last-modified']??'',0,100)];
    }
    throw new RuntimeException('图片重定向过多。');
}
function bb_gallery_store(array $image, int $maximumMB): array {
    $dir=bb_gallery_image_dir();$hash=hash('sha256',$image['body']);$file=$hash.'.'.$image['ext'];$path=$dir.'/'.$file;
    if(!is_file($path)) {
        $bytes=0;foreach(glob($dir.'/*')?:[] as $existing)$bytes+=is_file($existing)?filesize($existing):0;
        if($bytes+strlen($image['body'])>$maximumMB*1048576)throw new RuntimeException('画册本地存储已到上限，请增加后台存储限额。');
        $tmp=$dir.'/tmp-'.bin2hex(random_bytes(8));if(file_put_contents($tmp,$image['body'],LOCK_EX)===false){@unlink($tmp);throw new RuntimeException('图片无法写入。');}if(!rename($tmp,$path)){@unlink($tmp);throw new RuntimeException('图片无法保存。');}
    }
    // Conversion is a separate resumable job; never delay a visitor's image request.
    return ['file'=>$file,'preview'=>$file,'etag'=>$image['etag'],'modified'=>$image['modified'],'width'=>$image['width'],'height'=>$image['height'],'bytes'=>filesize($path),'downloadedAt'=>time()];
}
function bb_gallery_status(array $settings): array {
    $key=bb_gallery_key($settings);$job=bb_read('gallery-job-'.$key);$data=bb_read('gallery-local-'.$key);
    $pendingPhotos=$job?max(0,count($job['queue'])-$job['cursor']):0;$pendingAlbums=count($job['metadataPending']??[]);
    return ['albums'=>array_map(fn($a)=>['id'=>$a['id'],'title'=>$a['title'],'photos'=>count($a['photos'])],$data['albums']??[]),'checkedAt'=>$job['checkedAt']??0,'syncedAt'=>$data['syncedAt']??0,'pending'=>$pendingPhotos+$pendingAlbums,'pendingPhotos'=>$pendingPhotos,'pendingAlbums'=>$pendingAlbums,'total'=>$job?count($job['queue']):0,'done'=>$job['cursor']??0,'failures'=>count($job['errors']??[]),'errors'=>array_slice($job['errors']??[],0,5),'error'=>$job['error']??'','optimized'=>class_exists('Imagick')||function_exists('imagecreatetruecolor')];
}
function bb_gallery_publish(string $key,array $job): void {
    $albums=[];$previous=bb_read('gallery-local-'.$key);$failed=array_column($job['errors']??[],'url');
    foreach($job['albums'] as $album){
        // A failed update must not replace an already readable album with missing photos.
        $albumFailed=in_array($album['_endpoint']??'', $failed, true)||array_intersect(array_column($album['photos'],'url'),$failed);
        if($albumFailed){$old=null;foreach($previous['albums']??[] as $candidate)if($candidate['id']===$album['id']){$old=$candidate;break;}if($old){$albums[]=$old;continue;}}
        $photos=[];
        foreach($album['photos'] as $photo){
            $asset=$job['assets'][hash('sha256',$photo['url'])]??null;
            if(!$asset||!is_file(bb_gallery_image_dir().'/'.$asset['file']))continue;
            $preview=$asset['preview']??$asset['file'];if(!is_file(bb_gallery_image_dir().'/'.$preview))$preview=$asset['file'];
            $photos[]=['url'=>'./api/gallery-image.php?file='.$preview,'originalUrl'=>'./api/gallery-image.php?file='.$asset['file'],'caption'=>$photo['caption'],'width'=>$asset['width'],'height'=>$asset['height']];
        }
        if($photos)$albums[]=['id'=>$album['id'],'title'=>$album['title'],'description'=>$album['description'],'photos'=>$photos];
    }
    bb_write('gallery-local-'.$key,['albums'=>$albums,'syncedAt'=>time(),'checkedAt'=>$job['checkedAt']]);
}
function bb_gallery_sync(array $settings,bool $force=false,int $batch=2): array {
    if(empty($settings['galleryUrl']))return bb_gallery_status($settings);
    $key=bb_gallery_key($settings);$lock=bb_lock('gallery-sync-'.$key,false);if(!$lock)return bb_gallery_status($settings)+['busy'=>true];
    try {
        $job=bb_read('gallery-job-'.$key);$pending=$job&&($job['cursor']<count($job['queue'])||!empty($job['metadataPending']));
        if($force||(!$pending&&(!$job||time()-$job['checkedAt']>=86400))) {
            // Persist the attempt first so failed sources are retried daily, not by every visitor.
            $previous=$job;$job=['checkedAt'=>time(),'queue'=>[],'cursor'=>0,'albums'=>[],'assets'=>$previous['assets']??[],'previousAlbums'=>!empty($previous['error'])?($previous['previousAlbums']??[]):($previous['albums']??[]),'metadataPending'=>[],'errors'=>[],'error'=>''];bb_write('gallery-job-'.$key,$job);
            try{$source=bb_gallery_source($settings,true);$albums=array_values(array_filter($source['albums'],fn($a)=>bb_gallery_selected($a,$settings)));$albums=array_slice($albums,0,($settings['galleryType']??'')==='json'?60:12);$queue=[];$remaining=800;foreach($albums as $index=>&$album){if(isset($album['_endpoint']))$job['metadataPending'][]=$index;else{$album['photos']=array_slice($album['photos'],0,$remaining);$remaining-=count($album['photos']);foreach($album['photos'] as $photo)$queue[hash('sha256',$photo['url'])]=$photo['url'];}}unset($album);$job['albums']=$albums;$job['queue']=array_values($queue);}
            catch(Throwable $e){$job['error']=$e->getMessage();bb_write('gallery-job-'.$key,$job);return bb_gallery_status($settings);}
        }
        if(!$job)return bb_gallery_status($settings);
        if($job['error']!=='')return bb_gallery_status($settings);
        if(!empty($job['metadataPending'])){
            $index=array_shift($job['metadataPending']);
            try{$job['albums'][$index]['photos']=bb_gallery_album_images($job['albums'][$index]);}
            catch(Throwable $e){$job['errors'][]=['url'=>$job['albums'][$index]['_endpoint'],'message'=>$e->getMessage()];foreach($job['previousAlbums']??[] as $old)if($old['id']===$job['albums'][$index]['id'])$job['albums'][$index]['photos']=$old['photos'];}
            if(!$job['metadataPending']){$queue=[];$remaining=800;foreach($job['albums'] as &$album){$album['photos']=array_slice($album['photos'],0,$remaining);$remaining-=count($album['photos']);foreach($album['photos'] as $photo)$queue[hash('sha256',$photo['url'])]=$photo['url'];}unset($album);$job['queue']=array_values($queue);}
            bb_write('gallery-job-'.$key,$job);return bb_gallery_status($settings);
        }
        for($n=0;$n<max(1,min(10,$batch))&&$job['cursor']<count($job['queue']);$n++) {
            $url=$job['queue'][$job['cursor']++];$id=hash('sha256',$url);$old=$job['assets'][$id]??[];
            try{$image=bb_gallery_image_fetch($url,$old,(string)($settings['galleryUrl']??''));$job['assets'][$id]=isset($image['body'])?bb_gallery_store($image,(int)($settings['galleryMaxMB']??512)):$old;}
            catch(Throwable $e){$job['errors'][]=['url'=>$url,'message'=>$e->getMessage()];}
        }
        bb_write('gallery-job-'.$key,$job);bb_gallery_publish($key,$job);return bb_gallery_status($settings);
    } finally {flock($lock,LOCK_UN);fclose($lock);}
}
function bb_gallery(array $settings): array {
    if(empty($settings['galleryUrl']))return ['albums'=>[]];
    bb_gallery_import_seed($settings);
    $key=bb_gallery_key($settings);$data=bb_gallery_with_notes($settings,bb_gallery_variant_urls(bb_read('gallery-local-'.$key)??['albums'=>[]],$settings));$status=bb_gallery_status($settings);
    return array_merge($data,['syncPending'=>$status['pending']>0||!$status['checkedAt']||time()-$status['checkedAt']>=86400,'syncStatus'=>['checkedAt'=>$status['checkedAt'],'pending'=>$status['pending'],'failures'=>$status['failures'],'error'=>$status['error']]]);
}
require_once __DIR__.'/gallery-notes-lib.php';
require_once __DIR__.'/gallery-variants-lib.php';
function bb_gallery_import_seed(array $settings): void {
    $key=bb_gallery_key($settings);$existing=bb_read('gallery-local-'.$key);$job=bb_read('gallery-job-'.$key);
    // An older failed download can leave an empty manifest. It must not block
    // the matching package's readable seed; successful empty updates stay empty.
    if($existing&&(!empty($existing['albums'])||empty($job['errors'])&&empty($job['error'])))return;
    $root=dirname(__DIR__).'/gallery-seed';$path=$root.'/seed.php';if(!is_file($path))return;
    $seed=require $path;if(!is_array($seed)||($seed['key']??'')!==$key)return;
    $lock=bb_lock('gallery-sync-'.$key,false);if(!$lock)return;
    try{
        $existing=bb_read('gallery-local-'.$key);$job=bb_read('gallery-job-'.$key);
        if($existing&&(!empty($existing['albums'])||empty($job['errors'])&&empty($job['error'])))return;
        foreach($seed['files']??[] as $file){if(!is_string($file)||!preg_match('/^[a-f0-9]{64}(?:-preview)?\.(jpg|png|gif|webp|avif)$/D',$file))throw new RuntimeException('预置画册图片名称无效。');$source=$root.'/images/'.$file;$target=bb_gallery_image_dir().'/'.$file;if(!is_file($target)&&(!is_file($source)||!copy($source,$target)))throw new RuntimeException('预置画册图片无法导入，请完整上传 gallery-seed 目录并检查数据目录权限。');}
        bb_write('gallery-local-'.$key,$seed['data']);
        if($job){$job['assets']=array_merge($seed['job']['assets']??[],$job['assets']??[]);bb_write('gallery-job-'.$key,$job);}
        else bb_write('gallery-job-'.$key,$seed['job']);
    }finally{flock($lock,LOCK_UN);fclose($lock);}
}
