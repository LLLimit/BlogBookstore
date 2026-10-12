<?php
if (!defined('BOOKSTORE_API') || !$authenticated) { http_response_code(404); exit; }
function music_card(array $row, int $i): void {
    $id = $row['id'] ?? 'new'; $type = $row['type'] ?? 'tracks'; $key = 'musicPlaylists[' . $i . ']';
    $trackText = implode("\n", array_map(static function ($track) { return $track['name'] . ' | ' . $track['url'] . (!empty($track['artist']) ? ' | ' . $track['artist'] : ''); }, $row['tracks'] ?? []));
?>
<div class="playlist-card" data-playlist-card>
<input type="hidden" data-playlist-id name="<?=$key?>[id]" value="<?=h($id)?>">
<div class="playlist-heading"><strong>音乐歌单</strong><button class="button subtle" type="button" data-remove-playlist>删除歌单</button></div>
<input type="hidden" name="<?=$key?>[enabled]" value="0">
<label class="playlist-toggle"><input type="checkbox" data-playlist-enabled name="<?=$key?>[enabled]" value="1" <?=bb_playlist_enabled($row)?'checked':''?>>在前端显示此歌单</label>
<p class="hint">关闭后保留配置，访客无法选择或读取此歌单。</p>
<div class="fields two"><label>歌单名称<input data-playlist-name name="<?=$key?>[name]" value="<?=h($row['name'] ?? '')?>" maxlength="60" placeholder="例如：阅读时光"></label><label>音乐来源<select aria-label="音乐来源" data-source-type name="<?=$key?>[type]">
<?php foreach (['tracks'=>'音频直链列表','json'=>'JSON 歌单地址','m3u'=>'M3U 歌单地址','meting'=>'网易云 / QQ / 酷狗 · Meting API'] as $value=>$label): ?><option value="<?=$value?>" <?=$type===$value?'selected':''?>><?=h($label)?></option><?php endforeach ?>
</select></label></div>
<div data-source-fields="tracks" <?=$type==='tracks'?'':'hidden'?>><label>歌曲列表<textarea name="<?=$key?>[trackText]" rows="5" placeholder="歌曲名 | https://你的域名/music/song.mp3 | 歌手"><?=h($trackText)?></textarea></label><p class="hint">每行一首，歌手可省略。支持网站自己的音频文件或可直接播放的外部音频地址。</p></div>
<div data-source-fields="json m3u meting" <?=$type==='tracks'?'hidden':''?>><label><span data-source-url-label><?=$type==='meting'?'Meting API 地址':'歌单文件地址'?></span><input name="<?=$key?>[url]" type="url" value="<?=h($row['url'] ?? '')?>" list="music-api-presets" placeholder="https://api.i-meto.com/meting/api"></label></div>
<div data-source-fields="meting" <?=$type==='meting'?'':'hidden'?>><div class="fields two"><label>音乐平台<select aria-label="音乐平台" name="<?=$key?>[server]"><?php foreach (['netease'=>'网易云音乐','tencent'=>'QQ 音乐','kugou'=>'酷狗音乐'] as $value=>$label): ?><option value="<?=$value?>" <?=($row['server']??'netease')===$value?'selected':''?>><?=h($label)?></option><?php endforeach ?></select></label><label>歌单编号或完整链接<input name="<?=$key?>[playlistId]" value="<?=h($row['playlistId'] ?? '')?>" maxlength="2000" placeholder="9777685166 或歌单链接"></label></div><p class="hint">API 地址可替换成你使用的兼容接口。会员歌曲、地区限制及播放地址有效期由音乐平台和接口决定。</p></div>
<button class="button secondary" name="musicTest" value="<?=h($id)?>" data-test-playlist>测试这个歌单</button>
</div>
<?php }
$musicRows = $settings['musicPlaylists'] ?? [];
?>
<section class="card" id="music-settings"><div class="card-heading"><span class="section-number">04</span><div><h2>音乐来源与歌单</h2><p>配置后，访客可以在播放器中选择歌单及歌曲。</p></div></div>
<label>默认歌单<select aria-label="默认歌单" name="defaultMusicPlaylist" id="default-music-playlist"><option value="builtin">书店原创</option><?php foreach ($musicRows as $row): if (!bb_playlist_enabled($row)) continue; ?><option value="<?=h($row['id'])?>" <?=($settings['defaultMusicPlaylist']??'builtin')===$row['id']?'selected':''?>><?=h($row['name'])?></option><?php endforeach ?></select></label>
<p class="hint">保留三首内置原创音乐。外部歌单只缓存歌曲信息五分钟，音频由访客浏览器从音频地址直接播放。</p>
<div id="playlist-cards"><?php foreach ($musicRows as $i=>$row) music_card($row, $i); ?></div>
<button class="button secondary" type="button" id="add-playlist">＋ 添加歌单</button>
<datalist id="music-api-presets"><option value="https://api.i-meto.com/meting/api"><option value="https://api.injahow.cn/meting/"></datalist>
<template id="playlist-template"><?php music_card([], 0); ?></template>
<p class="hint">测试只读取歌单信息，不保存设置。编辑后点击下方“保存设置”，再刷新书店。</p>
</section><script src="./music-settings.js" defer></script>
