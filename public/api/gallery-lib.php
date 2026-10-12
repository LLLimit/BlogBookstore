<?php
declare(strict_types=1);
function bb_gallery_text(string $value, int $limit): string { preg_match_all('/./us', $value, $matches); return implode('', array_slice($matches[0] ?? [],0,$limit)); }
function bb_gallery_image_url(string $file, string $site = ''): string {
    $file=trim($file);
    if($file===''||preg_match('/[\x00-\x1f\x7f]/',$file)||strpos($file,'\\')!==false)throw new InvalidArgumentException('相册图片路径无效。');
    if(strpos($file,'//')===0){$scheme=parse_url($site,PHP_URL_SCHEME);if(!in_array($scheme,['http','https'],true))throw new InvalidArgumentException('相册来源网址无效。');$file=$scheme.':'.$file;}
    $parts=parse_url($file);
    if(!is_array($parts)||isset($parts['user'])||isset($parts['pass'])||isset($parts['scheme'])&&!in_array(strtolower($parts['scheme']),['http','https'],true))throw new InvalidArgumentException('相册图片网址格式无效。');
    $absolute=isset($parts['scheme']);
    if($absolute&&empty($parts['host']))throw new InvalidArgumentException('相册图片网址缺少域名。');
    $path=$parts['path']??'';
    if(!$absolute&&strpos($path,'/')!==0&&strpos($path,'usr/uploads/')!==0)$path='usr/uploads/'.$path;
    $segments=[];
    foreach(explode('/',$path) as $segment){
        $decoded=rawurldecode($segment);
        if($decoded==='.'||$decoded==='..'||preg_match('/[\x00-\x1f\x7f\\\\]/',$decoded))throw new InvalidArgumentException('相册图片路径包含无效目录。');
        // Encode each path component, preserving slashes and existing escapes.
        $segments[]=rawurlencode($decoded);
    }
    $url=($absolute?strtolower($parts['scheme']).'://'.$parts['host'].(isset($parts['port'])?':'.$parts['port']:''):'').implode('/',$segments);
    if(isset($parts['query']))$url.='?'.preg_replace_callback('/[^\x21-\x7e]/',static function($match){return rawurlencode($match[0]);},$parts['query']);
    return $absolute?bb_url($url,false):bb_redirect($url,bb_url($site,false));
}
function bb_gallery_normalize(array $data, int $maximum = 800): array {
    $albums = []; $remaining = $maximum;
    foreach (array_slice($data['albums'] ?? [], 0, 60) as $index=>$album) {
        if (!is_array($album) || !empty($album['private']) || !empty($album['password'])) continue;
        $photos = [];
        foreach (array_slice(is_array($album['photos'] ?? null) ? $album['photos'] : [], 0, min(300,$remaining)) as $photo) {
            if (!is_array($photo)) continue;
            if(!is_string($photo['url']??null))continue;
            try { $url = bb_gallery_image_url($photo['url']); } catch (Throwable $e) { continue; }
            $photos[] = ['url'=>$url,'caption'=>bb_gallery_text((string)($photo['caption'] ?? ''),255)];
        }
        $remaining -= count($photos);
        if ($photos) $albums[] = ['id'=>(string)($album['id'] ?? $index),'title'=>bb_gallery_text((string)($album['title'] ?? '照片画册'),100),'description'=>bb_gallery_text((string)($album['description'] ?? ''),255),'photos'=>$photos];
        if ($remaining <= 0) break;
    }
    return ['albums'=>$albums];
}
function bb_gallery_selected(array $album, array $settings): bool {
    $ids = $settings['galleryAlbums'] ?? [];
    return !$ids || in_array((string)($album['id'] ?? ''), $ids, true) || in_array((string)($album['title'] ?? '照片画册'), $ids, true);
}
function bb_gallery_source(array $settings, bool $catalogOnly = false): array {
    $url = $settings['galleryUrl'] ?? '';
    if ($url === '') return ['albums'=>[]];
    if (($settings['galleryType'] ?? '') === 'json') {
        $data = json_decode(bb_fetch_document($url,2097152,'画册数据')['body'],true,32,JSON_THROW_ON_ERROR);
        if (!is_array($data) || !is_array($data['albums'] ?? null)) throw new RuntimeException('画册 JSON 格式无效。');
        // Discover every public album before applying the selected albums' photo budget.
        if (!$catalogOnly) $data['albums'] = array_values(array_filter($data['albums'], fn($a)=>is_array($a) && bb_gallery_selected($a,$settings)));
        return bb_gallery_normalize($data, $catalogOnly ? 18000 : 800);
    }
    return bb_gallery_page($url,$settings,$catalogOnly);
}
function bb_gallery_album_images(array $album): array {
    $images=json_decode(bb_fetch_document($album['_endpoint'],2097152,'相册图片')['body'],true,32,JSON_THROW_ON_ERROR);$photos=[];$invalid=0;
    foreach(array_slice(is_array($images)?$images:[],0,300) as $image){
        if(!is_array($image)||($image['type']??'image')!=='image')continue;if(!is_string($image['filename']??null)){$invalid++;continue;}$file=trim($image['filename']);if($file==='')continue;
        try{$url=bb_gallery_image_url($file,$album['_siteUrl']);}catch(Throwable $e){$invalid++;continue;}
        $photos[]=['url'=>$url,'caption'=>bb_gallery_text((string)($image['description']??''),255)];
    }
    if(!$photos&&$invalid)throw new RuntimeException('相册包含图片，但图片路径全部无效；请检查相册记录中的文件名。');
    return $photos;
}
function bb_gallery_page(string $url, array $settings = [], bool $catalogOnly = false): array {
    $record = bb_fetch_document($url, 2097152, '相册页面');
    $dom = new DOMDocument(); $prior = libxml_use_internal_errors(true);
    try { $dom->loadHTML('<?xml encoding="UTF-8">' . $record['body'], LIBXML_NONET); }
    finally { libxml_clear_errors(); libxml_use_internal_errors($prior); }
    $xp = new DOMXPath($dom); $albums = [];
    // The page declares its Typecho index URL; require it to stay on the page's host.
    if (!preg_match('/indexUrl\s*:\s*"([^"\r\n]+)"/', $record['body'], $match)) throw new RuntimeException('未找到 SmartGallery 数据，请使用插件相册页面或 BookstoreGallery JSON 接口。');
    $index = bb_url(str_replace('\\/', '/', $match[1]), false);
    if (strtolower((string)parse_url($index, PHP_URL_HOST)) !== strtolower((string)parse_url($url, PHP_URL_HOST))) throw new RuntimeException('相册接口与页面域名不一致。');
    $site = preg_match('/siteUrl\s*:\s*"([^"\r\n]+)"/', $record['body'], $siteMatch) ? str_replace('\\/','/',$siteMatch[1]) : $url;
    foreach ($xp->query('//*[starts-with(@id,"sg-album-") and @data-private="0"]') as $modal) {
        if (count($albums) >= ($catalogOnly ? 60 : 12)) break;
        $id = substr($modal->getAttribute('id'), 9); if (!ctype_digit($id)) continue;
        $album = ['id'=>$id,'title'=>$xp->evaluate('string(.//h2[1])',$modal),'description'=>'','photos'=>[],'_endpoint'=>rtrim($index,'/').'/action/smart-gallery?do=fetch-images&album_id='.$id,'_siteUrl'=>$site];
        if ($catalogOnly) { $albums[]=$album; continue; }
        if (!bb_gallery_selected($album,$settings)) continue;
        $album['photos']=bb_gallery_album_images($album);$albums[]=$album;
    }
    return $catalogOnly ? ['albums'=>$albums] : bb_gallery_normalize(['albums'=>$albums]);
}
require_once __DIR__ . '/gallery-sync-lib.php';
