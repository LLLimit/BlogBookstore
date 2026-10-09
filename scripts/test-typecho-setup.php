<?php
// Integration fixture: uses only a copied local test database in ignored test-results/.
$root = dirname(__DIR__) . '/test-results/typecho-site';
$db = new PDO('sqlite:' . $root . '/usr/test.db');
function option(PDO $db, string $name, string $value): void {
    $db->prepare('DELETE FROM typecho_options WHERE name = ? AND user = 0')->execute([$name]);
    $db->prepare('INSERT INTO typecho_options (name, user, value) VALUES (?,0,?)')->execute([$name,$value]);
}
option($db,'siteUrl','http://127.0.0.1:8794/');
option($db,'rewrite','0');
option($db,'plugins',json_encode(['activated'=>[],'handles'=>[]]));
option($db,'plugin:BlogBookstore',json_encode(['bookshopName'=>"测试书店"]));
$row=$db->query("SELECT * FROM typecho_contents WHERE type='post' AND status='publish' LIMIT 1")->fetch(PDO::FETCH_ASSOC);
if(!$row)throw new RuntimeException('Local fixture needs one public post.');
unset($row['cid']);
$cases=['public'=>['status'=>'publish','password'=>'','type'=>'post','created'=>time()-60], 'draft'=>['status'=>'draft'], 'private'=>['status'=>'private'], 'password'=>['status'=>'publish','password'=>'fixture-only'], 'future'=>['status'=>'publish','created'=>time()+3600], 'page'=>['status'=>'publish','type'=>'page']];
$ids=[];
foreach($cases as $case=>$change){
    $data=array_merge($row,['title'=>'Bookstore fixture '.$case,'slug'=>'bookstore-fixture-'.$case,'text'=>"<!--markdown-->\n# 公开测试\n\n这是一段**粗体**。",'password'=>'','created'=>time()-60,'type'=>'post'],$change);
    $columns=array_keys($data);$sql='INSERT INTO typecho_contents ('.implode(',',array_map(fn($column)=>'"'.$column.'"',$columns)).') VALUES ('.implode(',',array_fill(0,count($columns),'?')).')';
    $db->prepare($sql)->execute(array_values($data));$ids[$case]=(int)$db->lastInsertId();
}
file_put_contents(dirname($root).'/expected.json',json_encode($ids));
require $root.'/config.inc.php';
\TypechoPlugin\BlogBookstore\Plugin::activate();
echo "Created isolated fixture and activated BlogBookstore.\n";
