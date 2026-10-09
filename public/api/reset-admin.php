<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
define('BOOKSTORE_API', true);
require __DIR__ . '/bookstore.php';
try {
    $state = bb_state();
    if (!$state) throw new RuntimeException('后台尚未初始化，请先打开 /admin/index.php。');
    fwrite(STDOUT, "输入新的管理员密码（输入会显示，仅在服务器终端操作）：\n");
    $password = bb_password(rtrim((string) fgets(STDIN), "\r\n"));
    $lock = bb_lock('state');
    try { $state = bb_state(); $state['passwordHash'] = password_hash($password, PASSWORD_DEFAULT); $state['sessionVersion'] = bin2hex(random_bytes(24)); bb_write('state', $state); }
    finally { flock($lock, LOCK_UN); fclose($lock); }
    fwrite(STDOUT, "密码已重置，所有旧登录已失效。\n");
} catch (Throwable $error) { fwrite(STDERR, $error->getMessage() . "\n"); exit(1); }
