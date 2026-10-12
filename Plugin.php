<?php
namespace TypechoPlugin\BlogBookstore;

use Typecho\Common;
use Typecho\Plugin\PluginInterface;
use Typecho\Router;
use Typecho\Widget\Helper\Form;
use Typecho\Widget\Helper\Form\Element\Text;
use Typecho\Widget\Helper\Form\Element\Textarea;
use Utils\Helper;

if (!defined('__TYPECHO_ROOT_DIR__')) exit;

/**
 * 把博客文章变成可以走进去阅读的 3D 书店。
 * @package BlogBookstore
 * @author LLLimit
 * @link https://github.com/LLLimit
 * @version 1.8.1
 * @since 1.3.0
 */
class Plugin implements PluginInterface
{
    public static function activate()
    {
        if (!is_file(__DIR__ . '/dist/index.html')) {
            throw new \Typecho\Plugin\Exception('缺少书店页面，请安装完整的 BlogBookstore 发布包（包含 dist 目录）。');
        }
        Helper::addAction('blog-bookstore', __NAMESPACE__ . '\\Action');
        Helper::addRoute('blog_bookstore', '/bookstore/', __NAMESPACE__ . '\\Action', 'action', 'index');
        return '书店已开放。进入插件设置即可打开书店。';
    }

    public static function deactivate()
    {
        Helper::removeAction('blog-bookstore');
        Helper::removeRoute('blog_bookstore');
    }

    public static function config(Form $form)
    {
        $options = Helper::options();
        $url = htmlspecialchars(Router::url('blog_bookstore', [], $options->index), ENT_QUOTES, 'UTF-8');
        $fallback = htmlspecialchars(Common::url('action/blog-bookstore', $options->index), ENT_QUOTES, 'UTF-8');
        $form->addInput(new Text('bookshopName', null, '博客书店', '书店名称',
            '书架自动读取本博客的公开文章，无需手动导入。<br><a href="' . $url . '" target="_blank" rel="noopener">打开 3D 书店</a>'
            . ' · <a href="' . $fallback . '" target="_blank" rel="noopener">备用入口</a>'));
        $form->addInput(new Text('coverAuthor', null, (string) $options->title, '默认封面作者', '文章封面与馆藏目录使用的作者署名。'));
        $form->addInput(new Text('galleryUrl', null, '', '照片画册 JSON 地址', '可启用 BookstoreGallery 后填写其接口地址；也支持通用画册 JSON。来源需允许跨域。独立站版本可以在书店后台直接填写 Smart-Gallery 相册页面。'));
        $form->addInput(new Textarea('musicPlaylists', null, '[]', '音乐歌单（JSON）', '使用 README 中的 musicPlaylists 格式，支持直链、JSON/M3U 和兼容 Meting API 的歌单。插件模式由浏览器获取远程歌单，来源需允许跨域访问。'));
    }

    public static function personalConfig(Form $form) {}
}
