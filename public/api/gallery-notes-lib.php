<?php
declare(strict_types=1);
function bb_gallery_notes_name(array $settings): string {
    return 'gallery-notes-'.hash('sha256',json_encode([$settings['galleryUrl']??'',$settings['galleryType']??'smart-gallery']));
}
function bb_gallery_photo_key(string $album,array $photo): string {
    parse_str((string)parse_url($photo['originalUrl']??$photo['url'],PHP_URL_QUERY),$query);
    return hash('sha256',$album."\n".($query['file']??($photo['originalUrl']??$photo['url'])));
}
function bb_gallery_with_notes(array $settings,array $data): array {
    $notes=bb_read(bb_gallery_notes_name($settings))??[];
    foreach($data['albums'] as &$album){
        $editor=$notes['_albums'][(string)$album['id']]??[];
        $album['editor']=['coverPhotoKey'=>$editor['coverPhotoKey']??'','chapterOrder'=>$editor['chapterOrder']??[],'wideLayout'=>$editor['wideLayout']??'spread-full'];
        $positions=array_flip($editor['order']??[]);
        foreach($album['photos'] as $index=>&$photo){
            $key=bb_gallery_photo_key((string)$album['id'],$photo);$photo['photoKey']=$key;$note=$notes[$key]??[];
            foreach(['takenAt'=>'','story'=>'','chapter'=>'','layout'=>'auto','pageText'=>'','leftPageText'=>'','rightPageText'=>'','textCorner'=>'outer','storySide'=>'outer'] as $field=>$default)$photo[$field]=$note[$field]??$default;
            $photo['_rank']=$positions[$key]??(count($positions)+$index);
        }unset($photo);
        usort($album['photos'],static function($a,$b){return $a['_rank']<=>$b['_rank'];});
        foreach($album['photos'] as &$photo)unset($photo['_rank']);unset($photo);
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
    $name=bb_gallery_notes_name($settings);$lock=bb_lock($name,false);if(!$lock)throw new RuntimeException('另一个任务正在保存旅游册，请稍后重试。',409);
    try{$notes=bb_read($name)??[];$notes[$key]=array_merge($notes[$key]??[],$note,['updatedAt'=>time()]);bb_write($name,$notes);}
    finally{flock($lock,LOCK_UN);fclose($lock);}
}
function bb_gallery_choice($value,array $choices,string $label): string {
    if(!is_string($value)||!in_array($value,$choices,true))throw new InvalidArgumentException($label.'无效。');return $value;
}
function bb_gallery_save_album(array $settings,array $input): void {
    $albumId=bb_text($input['albumId']??'',100,'旅游册编号',true);$current=null;
    foreach(bb_gallery($settings)['albums'] as $candidate)if((string)$candidate['id']===$albumId)$current=$candidate;
    if(!$current)throw new InvalidArgumentException('旅游册尚未同步，请先检查更新。');
    $known=array_fill_keys(array_column($current['photos'],'photoKey'),true);
    $order=$input['order']??[];$patches=$input['photos']??[];$chapters=$input['chapterOrder']??[];
    if(!is_array($order)||!is_array($patches)||!is_array($chapters)||count($order)>800||count($patches)>800||count($chapters)>60)throw new InvalidArgumentException('旅游册编辑数据过多或格式无效。');
    $ordered=[];foreach($order as $key){if(!is_string($key)||!isset($known[$key]))throw new InvalidArgumentException('排序包含无效照片。');$ordered[$key]=true;}
    $chapterOrder=[];foreach($chapters as $chapter){$chapter=bb_text($chapter,80,'章节名称',true);if(!in_array($chapter,$chapterOrder,true))$chapterOrder[]=$chapter;}
    $validated=[];
    foreach($patches as $patch){
        if(!is_array($patch)||!is_string($patch['photoKey']??null)||!isset($known[$patch['photoKey']]))throw new InvalidArgumentException('编辑包含无效照片。');
        $note=bb_gallery_validate_note($patch['takenAt']??'',$patch['story']??'');
        $note['chapter']=bb_text($patch['chapter']??'',80,'章节名称');$note['pageText']=bb_text($patch['pageText']??'',240,'页角文案');
        $note['leftPageText']=bb_text($patch['leftPageText']??'',240,'跨页左页文案');$note['rightPageText']=bb_text($patch['rightPageText']??'',240,'跨页右页文案');
        $note['layout']=bb_gallery_choice($patch['layout']??'auto',['auto','spread-full','spread-contain','page-full','page-contain'],'照片版式');
        $note['textCorner']=bb_gallery_choice($patch['textCorner']??'outer',['outer','left','right'],'页角位置');
        $note['storySide']=bb_gallery_choice($patch['storySide']??'outer',['outer','left','right'],'故事位置');
        if($note['chapter']!==''&&!in_array($note['chapter'],$chapterOrder,true))$chapterOrder[]=$note['chapter'];
        $validated[$patch['photoKey']]=$note;
    }
    if(count($chapterOrder)>60)throw new InvalidArgumentException('最多设置 60 个章节。');
    $cover=$input['coverPhotoKey']??'';if(!is_string($cover)||$cover!==''&&!isset($known[$cover]))throw new InvalidArgumentException('封面照片无效。');
    $editor=['order'=>array_keys($ordered),'chapterOrder'=>$chapterOrder,'coverPhotoKey'=>$cover,'wideLayout'=>bb_gallery_choice($input['wideLayout']??'spread-full',['spread-full','spread-contain'],'横幅默认版式')];
    $name=bb_gallery_notes_name($settings);$lock=bb_lock($name,false);if(!$lock)throw new RuntimeException('另一个任务正在保存旅游册，请稍后重试。',409);
    try{$notes=bb_read($name)??[];foreach($validated as $key=>$note)$notes[$key]=array_merge($notes[$key]??[],$note,['updatedAt'=>time()]);$notes['_albums'][$albumId]=$editor;bb_write($name,$notes);}
    finally{flock($lock,LOCK_UN);fclose($lock);}
}
