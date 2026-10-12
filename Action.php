<?php
namespace TypechoPlugin\BlogBookstore;

use Typecho\Common;
use Typecho\Db;
use Widget\ActionInterface;
use Widget\Base\Contents;

if (!defined('__TYPECHO_ROOT_DIR__')) exit;

class Action extends Contents implements ActionInterface
{
    public function execute() {}

    public function action()
    {
        $this->response->setHeader('X-Content-Type-Options', 'nosniff');
        $this->response->setHeader('Cache-Control', 'no-store');
        if (!$this->request->isGet()) {
            $this->response->setHeader('Allow', 'GET');
            return $this->fail(405, '书店仅接受 GET 请求。');
        }

        $route = $this->request->get('route', '');
        if (!is_string($route)) return $this->fail(400, '请求参数无效。');
        try {
            if ($route === '') return $this->page();
            if ($route === 'articles') return $this->articles();
            if ($route === 'article') return $this->article();
            return $this->fail(404, '没有这个书店接口。');
        } catch (\Throwable $error) {
            error_log('[BlogBookstore] ' . $error->getMessage());
            return $this->fail(500, '书店暂时无法载入，请稍后重试。');
        }
    }

    private function storeTitle(): string
    {
        $name = trim((string) $this->options->plugin('BlogBookstore')->bookshopName);
        return $name !== '' ? $name : (string) $this->options->title;
    }

    private function page()
    {
        $path = __DIR__ . '/dist/index.html';
        if (!is_file($path)) return $this->fail(503, '缺少书店页面，请重新安装包含 dist 目录的完整发布包。');
        $html = file_get_contents($path);
        if ($html === false) return $this->fail(503, '无法读取书店页面。');
        $assetBase = rtrim(Common::url('BlogBookstore/dist/', $this->options->pluginUrl), '/') . '/';
        $playlists = json_decode((string) $this->options->plugin('BlogBookstore')->musicPlaylists, true);
        $config = json_encode([
            'apiUrl' => Common::url('action/blog-bookstore', $this->options->index),
            'blogUrl' => (string) $this->options->siteUrl,
            'title' => $this->storeTitle(),
            'author' => trim((string) $this->options->plugin('BlogBookstore')->coverAuthor) ?: (string) $this->options->title,
            'adminUrl' => '',
            'galleryUrl' => trim((string) $this->options->plugin('BlogBookstore')->galleryUrl),
            'musicPlaylists' => is_array($playlists) ? array_values(array_filter($playlists, 'is_array')) : [],
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
        // Vite is built with base './'; only generated asset attributes are rebased.
        $html = preg_replace_callback('/\b(src|href)=("|\')\.\/(assets\/[^"\']+|favicon\.svg)\2/',
            static function ($match) use ($assetBase) {
                return $match[1] . '=' . $match[2] . htmlspecialchars($assetBase . $match[3], ENT_QUOTES, 'UTF-8') . $match[2];
            }, $html);
        $head = '<script>window.BOOKSTORE_CONFIG=' . $config . ';</script>';
        $html = preg_replace('/<head(?:\s[^>]*)?>/i', '$0' . $head, $html, 1);
        $this->response->setHeader('Content-Type', 'text/html; charset=UTF-8');
        echo $html;
    }

    private function publicQuery()
    {
        // Do not use a logged-in user's archive visibility: this API is always public.
        return $this->db->select()->from('table.contents')
            ->where('type = ?', 'post')
            ->where('status = ?', 'publish')
            ->where('(password IS NULL OR password = ?)', '')
            ->where('created <= ?', time());
    }

    private function positiveInteger(string $key, int $default, int $maximum): int
    {
        $value = $this->request->get($key, (string) $default);
        if (!is_scalar($value) || !preg_match('/^[1-9][0-9]{0,8}$/', (string) $value)) {
            return 0;
        }
        return min((int) $value, $maximum);
    }

    private function articles()
    {
        $page = $this->positiveInteger('page', 1, 1000000);
        $limit = $this->positiveInteger('limit', 60, 100);
        if (!$page || !$limit) return $this->fail(400, 'page 和 limit 必须是正整数。');
        $count = $this->db->fetchRow($this->publicQuery()->select(['COUNT(cid)' => 'total']));
        $total = (int) ($count['total'] ?? 0);
        $rows = $this->db->fetchAll($this->publicQuery()
            ->order('created', Db::SORT_DESC)->order('cid', Db::SORT_DESC)
            ->page($page, $limit));
        $articles = [];
        foreach ($rows as $row) $articles[] = $this->serializeArticle($row);
        return $this->response->throwJson([
            'title' => $this->storeTitle(),
            'articles' => $articles,
            'page' => $page,
            'total' => $total,
            'hasMore' => $page * $limit < $total,
        ]);
    }

    private function article()
    {
        $id = $this->positiveInteger('id', 0, 2147483647);
        if (!$id) return $this->fail(400, '文章编号无效。');
        $row = $this->db->fetchRow($this->publicQuery()->where('cid = ?', $id)->limit(1));
        if (!$row) return $this->fail(404, '这篇文章尚未公开或已经移走。');
        return $this->response->throwJson(['article' => $this->serializeArticle($row)]);
    }

    private function serializeArticle(array $row): array
    {
        // Contents supplies Typecho's configured permalink rules and Markdown hooks.
        $this->push($row);
        $content = (string) $this->content;
        $plain = html_entity_decode(strip_tags($content), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $plain = trim(preg_replace('/\s+/u', ' ', $plain) ?? '');
        $categories = $this->categories;
        return [
            'id' => (int) $row['cid'],
            'title' => html_entity_decode(strip_tags((string) $this->title), ENT_QUOTES | ENT_HTML5, 'UTF-8'),
            'url' => (string) $this->permalink,
            'date' => gmdate('c', (int) $row['created']),
            'category' => $categories ? (string) $categories[0]['name'] : '随笔',
            'excerpt' => Common::subStr($plain, 0, 160, '…'),
            'content' => $content,
        ];
    }

    private function fail(int $status, string $message)
    {
        return $this->response->setStatus($status)->throwJson(['error' => $message]);
    }
}
