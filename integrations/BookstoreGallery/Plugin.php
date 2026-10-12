<?php
namespace TypechoPlugin\BookstoreGallery;
use Typecho\Plugin\PluginInterface;
use Typecho\Widget\Helper\Form;
use Utils\Helper;
if (!defined('__TYPECHO_ROOT_DIR__')) exit;
/**
 * 将 SmartGallery 的公开相册提供给独立博客书店画册。
 * @package BookstoreGallery
 * @author LLLimit
 * @link https://github.com/LLLimit
 * @version 1.0.0
 * @since 1.3.0
 */
class Plugin implements PluginInterface {
    public static function activate() { Helper::addAction('bookstore-gallery', __NAMESPACE__ . '\\Action'); return '画册接口已启用，仅提供无密码相册。'; }
    public static function deactivate() { Helper::removeAction('bookstore-gallery'); }
    public static function config(Form $form) {
        $url = \Typecho\Common::url('action/bookstore-gallery', Helper::options()->index);
        $form->addInput(new \Typecho\Widget\Helper\Form\Element\Text('endpointHint', null, $url, '公开相册接口', '将此地址填入独立书店后台的「画册数据地址」。本插件不改动 SmartGallery，也不导出密码相册。'));
    }
    public static function personalConfig(Form $form) {}
}
