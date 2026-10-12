<?php
declare(strict_types=1);
function bb_gallery_notes_name(array $settings): string {
    return 'gallery-notes-'.hash('sha256',json_encode([$settings['galleryUrl']??'',$settings['galleryType']??'smart-gallery']));
}
function bb_gallery_with_notes(array $settings,array $data): array {
    $notes=bb_read(bb_gallery_notes_name($settings))??[];
    foreach($data['albums'] as &$album){
        foreach($album['photos'] as &$photo){
            parse_str((string)parse_url($photo['originalUrl']??$photo['url'],PHP_URL_QUERY),$query);
            $identity=$query['file']??($photo['originalUrl']??$photo['url']);
            $key=hash('sha256',$album['id']."\n".$identity);$photo['photoKey']=$key;
            $photo['takenAt']=$notes[$key]['takenAt']??'';$photo['story']=$notes[$key]['story']??'';
        }unset($photo);
    }unset($album);
    return $data;
}
function bb_gallery_validate_note($takenAt,$story): array {
    if(!is_string($takenAt)||!is_string($story))throw new InvalidArgumentException('照片日期或故事格式无效。');
    $takenAt=trim($takenAt);$story=trim(str_replace(["\r\n","\r"],"\n",$story));
    if($takenAt!==''){$date=DateTimeImmutable::createFromFormat('!Y-m-d\TH:i',$takenAt);if(!$date||$date->format('Y-m-d\TH:i')!==$takenAt)throw new InvalidArgumentException('请填写有效的照片日期和时间。');}
    $length=preg_match_all('/./us',$story);
    if($length===false||$length>2000||strlen($story)>8000||preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/',$story))throw new InvalidArgumentException('照片故事最多 2000 字，不能包含无效字符。');
    return ['takenAt'=>$takenAt,'story'=>$story];
}
function bb_gallery_save_note(array $settings,string $key,array $note): void {
    if(!preg_match('/^[a-f0-9]{64}$/D',$key))throw new InvalidArgumentException('照片编号无效。');
    $found=false;foreach(bb_gallery($settings)['albums'] as $album)foreach($album['photos'] as $photo)if($photo['photoKey']===$key)$found=true;
    if(!$found)throw new InvalidArgumentException('这张照片尚未同步或已不在展示画册中，请重新读取照片。');
    $name=bb_gallery_notes_name($settings);$lock=bb_lock($name);
    try{$notes=bb_read($name)??[];if($note['takenAt']===''&&$note['story']==='')unset($notes[$key]);else $notes[$key]=$note+['updatedAt'=>time()];bb_write($name,$notes);}
    finally{flock($lock,LOCK_UN);fclose($lock);}
}
