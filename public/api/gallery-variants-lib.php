<?php
/** Pre-generated gallery assets. Author: LLLimit https://github.com/LLLimit */
declare(strict_types=1);
function bb_gallery_original_file(array $photo): string {
    parse_str((string)parse_url($photo['originalUrl']??$photo['url']??'',PHP_URL_QUERY),$query);
    $file=$query['file']??'';
    return is_string($file)&&preg_match('/^[a-f0-9]{64}\.(jpg|png|gif|webp|avif)$/D',$file)?$file:'';
}
function bb_gallery_variant_urls(array $data): array {
    $items=(bb_read('gallery-variants-v2')??[])['items']??[];$dir=bb_gallery_image_dir();
    foreach($data['albums'] as &$album)foreach($album['photos'] as &$photo){
        $file=bb_gallery_original_file($photo);if(!$file)continue;$item=$items[$file]??[];
        // Old 1600px previews belong only in management; reading keeps full resolution.
        $original='./api/gallery-image.php?file='.$file;$photo['originalUrl']=$original;$photo['url']=$original;
        if(!empty($item['lossless'])&&is_file($dir.'/'.$item['lossless']))$photo['url']='./api/gallery-image.php?file='.$item['lossless'];
        $photo['thumbnailUrl']=!empty($item['thumb'])&&is_file($dir.'/'.$item['thumb'])?'./api/gallery-image.php?file='.$item['thumb']:'';
        if(!empty($item['width'])&&!empty($item['height'])){$photo['width']=$item['width'];$photo['height']=$item['height'];}
    }unset($photo,$album);return $data;
}
function bb_gallery_variant_files(array $settings): array {
    $files=[];foreach((bb_read('gallery-local-'.bb_gallery_key($settings))??[])['albums']??[] as $album)foreach($album['photos'] as $photo){$file=bb_gallery_original_file($photo);if($file&&is_file(bb_gallery_image_dir().'/'.$file))$files[$file]=true;}return array_keys($files);
}
function bb_gallery_optimizer_status(array $settings): array {
    $files=bb_gallery_variant_files($settings);$items=(bb_read('gallery-variants-v2')??[])['items']??[];$done=0;$thumbs=0;$lossless=0;$warnings=[];
    foreach($files as $file){$item=$items[$file]??[];if(!empty($item['complete']))$done++;if(!empty($item['thumb']))$thumbs++;if(!empty($item['lossless']))$lossless++;if(!empty($item['warning']))$warnings[]=$item['warning'];}
    return ['total'=>count($files),'done'=>$done,'pending'=>count($files)-$done,'thumbnails'=>$thumbs,'lossless'=>$lossless,'warnings'=>array_slice(array_values(array_unique($warnings)),0,3),'engine'=>class_exists('Imagick')?'Imagick':(function_exists('imagecreatetruecolor')?'GD':'none')];
}
function bb_gallery_variant_accept(string $tmp,string $destination,int $maximumMB,bool $smaller=false,string $original=''): bool {
    clearstatcache(true,$tmp);if(!is_file($tmp)||filesize($tmp)<1||!@getimagesize($tmp)){@unlink($tmp);return false;}
    if($smaller&&filesize($tmp)>=filesize($original)){@unlink($tmp);return false;}
    $bytes=0;foreach(glob(bb_gallery_image_dir().'/*')?:[] as $path)if(is_file($path))$bytes+=filesize($path);
    if($bytes>$maximumMB*1048576){@unlink($tmp);throw new RuntimeException('图片存储限额不足，生成已暂停；原图不受影响。');}
    if(!rename($tmp,$destination)){@unlink($tmp);throw new RuntimeException('图片衍生文件无法保存。');}return true;
}
function bb_gallery_gd_room(int $pixels,int $factor): bool {
    $value=trim((string)ini_get('memory_limit'));$limit=(int)$value;$suffix=strtolower(substr($value,-1));if($suffix==='g')$limit*=1073741824;elseif($suffix==='m')$limit*=1048576;elseif($suffix==='k')$limit*=1024;
    return $limit<0||memory_get_usage(true)+$pixels*$factor+25165824<$limit;
}
function bb_gallery_orientation(string $path): int {
    if(function_exists('exif_read_data')){$exif=@exif_read_data($path);return (int)($exif['Orientation']??1);}
    // Read only JPEG marker segments, so EXIF orientation also works without php-exif.
    $stream=@fopen($path,'rb');if(!$stream)return 0;
    try{if(fread($stream,2)!=="\xff\xd8")return 1;$scanned=2;
        while($scanned<1048576&&!feof($stream)){$marker=fread($stream,2);$scanned+=2;if(strlen($marker)!==2||ord($marker[0])!==255)return 0;$code=ord($marker[1]);if($code===218||$code===217)return 1;if($code===0||$code===255)continue;
            $raw=fread($stream,2);if(strlen($raw)!==2)return 0;$length=unpack('n',$raw)[1]-2;if($length<0)return 0;$scanned+=$length+2;
            if($code!==225){fseek($stream,$length,SEEK_CUR);continue;}$segment=fread($stream,$length);if(substr($segment,0,6)!=="Exif\0\0")continue;$tiff=substr($segment,6);$little=substr($tiff,0,2)==='II';if(!$little&&substr($tiff,0,2)!=='MM')return 0;
            $read=static function(int $offset,int $size)use($tiff,$little):int{if($offset<0||$offset+$size>strlen($tiff))return -1;return unpack($size===2?($little?'v':'n'):($little?'V':'N'),substr($tiff,$offset,$size))[1];};
            $offset=$read(4,4);$count=$read($offset,2);if($count<0||$count>512)return 0;for($i=0;$i<$count;$i++){$at=$offset+2+$i*12;if($read($at,2)===274&&$read($at+2,2)===3&&$read($at+4,4)===1){$value=$read($at+8,2);return $value>=1&&$value<=8?$value:0;}}return 1;
        }return 0;
    }finally{fclose($stream);}
}
function bb_gallery_make_variants(string $file,int $maximumMB): array {
    $dir=bb_gallery_image_dir();$path=$dir.'/'.$file;$info=@getimagesize($path);if(!$info||$info[0]*$info[1]>40000000)throw new RuntimeException('本地照片尺寸无效。');
    $hash=substr($file,0,64);$webp=function_exists('imagewebp')&&(imagetypes()&IMG_WEBP);$imagickWebp=class_exists('Imagick')&&(bool)Imagick::queryFormats('WEBP');$thumb=$hash.'-thumb-v2.'.((class_exists('Imagick')?$imagickWebp:$webp)?'webp':'jpg');$lossless=$hash.'-lossless-v2.webp';
    $result=['complete'=>true,'width'=>$info[0],'height'=>$info[1],'thumb'=>is_file($dir.'/'.$thumb)?$thumb:'','lossless'=>is_file($dir.'/'.$lossless)?$lossless:'','warning'=>''];$tmp='';
    // GIF / animated formats retain their original playback and frames.
    $still=in_array(strtolower(pathinfo($file,PATHINFO_EXTENSION)),['jpg','png'],true);if($info[2]===IMAGETYPE_PNG&&strpos((string)file_get_contents($path),'acTL')!==false)$still=false;
    if(class_exists('Imagick')){
        $limits=[Imagick::RESOURCETYPE_MEMORY=>33554432,Imagick::RESOURCETYPE_MAP=>33554432,Imagick::RESOURCETYPE_DISK=>268435456];$old=[];$image=null;
        if(defined('Imagick::RESOURCETYPE_THREAD'))$limits[Imagick::RESOURCETYPE_THREAD]=1;
        try{foreach($limits as $type=>$limit){$old[$type]=Imagick::getResourceLimit($type);Imagick::setResourceLimit($type,min($old[$type]?:$limit,$limit));}
            $image=new Imagick();$image->readImage($path.'[0]');if(method_exists($image,'autoOrientImage'))$image->autoOrientImage();
            $result['width']=$image->getImageWidth();$result['height']=$image->getImageHeight();
            if(!$result['thumb']){$small=clone $image;try{$small->thumbnailImage(400,400,true,true);$small->setImageFormat($imagickWebp?'webp':'jpeg');$small->setOption('webp:lossless','false');$small->setImageCompressionQuality(72);$tmp=$dir.'/'.$thumb.'.'.bin2hex(random_bytes(4)).'.tmp';$small->writeImage($tmp);if(bb_gallery_variant_accept($tmp,$dir.'/'.$thumb,$maximumMB))$result['thumb']=$thumb;}finally{$small->clear();$small->destroy();}}
            if($still&&$imagickWebp&&!$result['lossless']&&$image->getImageColorspace()!==Imagick::COLORSPACE_CMYK){$image->setImageFormat('webp');$image->setOption('webp:lossless','true');$image->setOption('webp:method','4');$image->setImageCompressionQuality(100);$tmp=$dir.'/'.$lossless.'.'.bin2hex(random_bytes(4)).'.tmp';$image->writeImage($tmp);if(bb_gallery_variant_accept($tmp,$dir.'/'.$lossless,$maximumMB,true,$path))$result['lossless']=$lossless;}
        }catch(Throwable $e){$result['warning']=$e->getMessage();}finally{if($tmp&&is_file($tmp))@unlink($tmp);if($image){$image->clear();$image->destroy();}foreach($old as $type=>$limit)Imagick::setResourceLimit($type,$limit);}
        return $result;
    }
    if(!function_exists('imagecreatefromstring')){$result['warning']='未启用 GD / Imagick，无法生成缩略图。';return $result;}
    if($result['thumb']&&($result['lossless']||!$still||!defined('IMG_WEBP_LOSSLESS')))return $result;
    if(!bb_gallery_gd_room($info[0]*$info[1],6)){$result['warning']='GD 内存不足以处理部分照片；建议启用支持磁盘缓存的 Imagick。';return $result;}
    $source=@imagecreatefromstring((string)file_get_contents($path));if(!$source)throw new RuntimeException('GD 无法读取此照片格式。');
    try{
        $orientation=$info[2]===IMAGETYPE_JPEG?bb_gallery_orientation($path):1;
        if(in_array($orientation,[2,4,5,7],true))imageflip($source,in_array($orientation,[2,5,7],true)?IMG_FLIP_HORIZONTAL:IMG_FLIP_VERTICAL);
        $angle=[3=>180,5=>90,6=>-90,7=>-90,8=>90][$orientation]??0;if($angle){$rotated=imagerotate($source,$angle,0);if(!$rotated)throw new RuntimeException('照片方向处理失败。');imagedestroy($source);$source=$rotated;}
        $result['width']=imagesx($source);$result['height']=imagesy($source);imagealphablending($source,false);imagesavealpha($source,true);
        if(!$result['thumb']){$scale=min(1,400/max(imagesx($source),imagesy($source)));$small=imagecreatetruecolor(max(1,(int)round(imagesx($source)*$scale)),max(1,(int)round(imagesy($source)*$scale)));try{imagealphablending($small,false);imagesavealpha($small,true);imagecopyresampled($small,$source,0,0,0,0,imagesx($small),imagesy($small),imagesx($source),imagesy($source));$tmp=$dir.'/'.$thumb.'.'.bin2hex(random_bytes(4)).'.tmp';$webp?imagewebp($small,$tmp,72):imagejpeg($small,$tmp,72);if(bb_gallery_variant_accept($tmp,$dir.'/'.$thumb,$maximumMB))$result['thumb']=$thumb;}finally{imagedestroy($small);}}
        // GD cannot retain embedded colour profiles. Use the original when unsure.
        $body=(string)file_get_contents($path);$profile=strpos($body,'ICC_PROFILE')!==false||strpos($body,'iCCP')!==false||strpos($body,'gAMA')!==false||strpos($body,'sRGB')!==false;
        $orientationSafe=$orientation>=1&&$orientation<=8;
        if($still&&!$result['lossless']&&$webp&&defined('IMG_WEBP_LOSSLESS')&&!$profile&&$orientationSafe){
            if(bb_gallery_gd_room($info[0]*$info[1],8)){$tmp=$dir.'/'.$lossless.'.'.bin2hex(random_bytes(4)).'.tmp';imagewebp($source,$tmp,IMG_WEBP_LOSSLESS);if(bb_gallery_variant_accept($tmp,$dir.'/'.$lossless,$maximumMB,true,$path))$result['lossless']=$lossless;}
            else $result['warning']='部分原图不做无损转码：GD 内存不足，前台保留原画质。';
        }
    }catch(Throwable $e){$result['warning']=$e->getMessage();}finally{if($tmp&&is_file($tmp))@unlink($tmp);imagedestroy($source);}return $result;
}
function bb_gallery_optimize(array $settings,bool $force=false,int $batch=1): array {
    $lock=bb_lock('gallery-variants-v2',false);if(!$lock)return bb_gallery_optimizer_status($settings)+['busy'=>true];
    try{$state=bb_read('gallery-variants-v2')??['items'=>[]];$files=bb_gallery_variant_files($settings);
        if($force)foreach($files as $file)unset($state['items'][$file]['complete']);
        $count=0;foreach($files as $file){if(!empty($state['items'][$file]['complete']))continue;
            try{$state['items'][$file]=bb_gallery_make_variants($file,(int)($settings['galleryMaxMB']??512));}
            catch(Throwable $e){$state['items'][$file]=array_merge($state['items'][$file]??[],['complete'=>true,'warning'=>$e->getMessage()]);error_log('[Bookstore gallery optimize] '.$e->getMessage());}
            bb_write('gallery-variants-v2',$state);if(++$count>=max(1,min(2,$batch)))break;
        }if($force&&!$count)bb_write('gallery-variants-v2',$state);return bb_gallery_optimizer_status($settings);
    }finally{flock($lock,LOCK_UN);fclose($lock);}
}
