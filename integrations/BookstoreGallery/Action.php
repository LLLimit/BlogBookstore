<?php
namespace TypechoPlugin\BookstoreGallery;
use Typecho\Db;
use Typecho\Widget;
use Widget\ActionInterface;
if (!defined('__TYPECHO_ROOT_DIR__')) exit;
class Action extends Widget implements ActionInterface {
    public function execute() {}
    private function imageUrl($filename): string {
        $value = trim((string) $filename);
        if (preg_match('~^https?://~i', $value)) {
            $parts = parse_url($value);
            return $parts && empty($parts['user']) && empty($parts['pass']) ? $value : '';
        }
        if ($value === '' || strpos($value, '..') !== false || strpos($value, '\\') !== false || $value[0] === '/' || preg_match('/[\x00-\x1f]/', $value)) return '';
        return \Typecho\Common::url('usr/uploads/' . implode('/', array_map('rawurlencode', explode('/', $value))), \Widget\Options::alloc()->siteUrl);
    }
    public function action() {
        $this->response->setHeader('Content-Type', 'application/json; charset=utf-8');
        $this->response->setHeader('X-Content-Type-Options', 'nosniff');
        $this->response->setHeader('Access-Control-Allow-Origin', '*');
        $this->response->setHeader('Cache-Control', 'public, max-age=300');
        if (!$this->request->isGet()) { http_response_code(405); echo '{"error":"GET only"}'; return; }
        try {
            $db = Db::get(); $prefix = $db->getPrefix(); $albums = [];
            $rows = $db->fetchAll($db->select()->from($prefix . 'smart_gallery_albums')->where('(password IS NULL OR password = ?)', '')->order('sort_order', Db::SORT_ASC)->order('created', Db::SORT_DESC)->limit(60));
            foreach ($rows as $row) {
                $photos = [];
                $images = $db->fetchAll($db->select()->from($prefix . 'smart_gallery_images')->where('album_id = ?', $row['id'])->where('type = ?', 'image')->order('sort_order', Db::SORT_ASC)->order('created', Db::SORT_DESC)->limit(300));
                foreach ($images as $image) {
                    $url = $this->imageUrl($image['filename']);
                    if ($url !== '') $photos[] = ['id'=>(string)$image['id'], 'url'=>$url, 'caption'=>(string)$image['description']];
                }
                if ($photos) $albums[] = ['id'=>(string)$row['id'], 'title'=>(string)$row['name'], 'description'=>(string)$row['description'], 'photos'=>$photos];
            }
            echo json_encode(['version'=>1, 'albums'=>$albums], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
        } catch (\Throwable $error) {
            error_log('[BookstoreGallery] ' . $error->getMessage()); http_response_code(503);
            echo '{"error":"请先启用 SmartGallery，并创建公开相册。"}';
        }
    }
}
