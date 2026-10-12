<?php
if (!defined('BOOKSTORE_API') || !$authenticated) { http_response_code(404); exit; }
$accent = preg_match('/^#[0-9a-f]{6}$/i', (string)($settings['uiAccent'] ?? '')) ? $settings['uiAccent'] : '#83baff';
?>
<section class="card appearance-settings">
<h3>界面高亮配色</h3><p class="hint">用于天气按钮、进入书店按钮、进度条和阅读链接。保存后刷新书店生效。</p>
<div class="accent-fields"><label>自选高亮颜色<input type="color" name="uiAccent" id="ui-accent" value="<?=h($accent)?>"></label><label>颜色代码<input id="ui-accent-hex" value="<?=h($accent)?>" maxlength="7" pattern="#[0-9a-fA-F]{6}" aria-describedby="accent-note"></label></div>
<div class="accent-presets" role="group" aria-label="配色预设">
<?php foreach (['blue'=>['#83baff','晴空蓝'],'teal'=>['#79c9ba','湖水绿'],'lavender'=>['#b7a2e8','雾紫'],'rose'=>['#e9a6bb','樱花粉'],'gold'=>['#edc77a','暖金']] as $class=>$preset): ?>
<button type="button" class="accent-preset <?=$class?>" data-accent="<?=$preset[0]?>"><span aria-hidden="true"></span><?=h($preset[1])?></button>
<?php endforeach ?>
</div><p class="hint" id="accent-note">支持六位 HEX 颜色；按钮文字会根据颜色深浅自动调整。</p>
</section><script src="./appearance-settings.js" defer></script>
