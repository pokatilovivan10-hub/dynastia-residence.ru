<?php
/**
 * ============================================================
 * ОБРАБОТЧИК ЗАЯВОК С САЙТА «ДИНАСТИЯ»
 * ============================================================
 *
 * Что делает этот файл:
 * 1. Принимает данные из формы на сайте (имя, телефон, кого рассматривают).
 * 2. Отправляет их в Telegram-чат (нужно один раз настроить бота — см. ниже).
 * 3. Дублирует заявку на почту.
 * 4. На всякий случай сохраняет копию каждой заявки в файл leads.log —
 *    если Telegram или почта не сработают, заявка всё равно не потеряется,
 *    её можно будет открыть и прочитать через файловый менеджер.
 *
 * ЧТО НУЖНО НАСТРОИТЬ ПЕРЕД ЗАГРУЗКОЙ НА ХОСТИНГ — см. блок ниже.
 * ============================================================
 */

// ================= НАСТРОЙКИ ЧЕРЕЗ ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ =================

// 1) Токен Telegram-бота задаётся в TELEGRAM_BOT_TOKEN.
$TELEGRAM_BOT_TOKEN = getenv('TELEGRAM_BOT_TOKEN') ?: '';

// 2) ID чата/группы задаётся в TELEGRAM_CHAT_ID.
$TELEGRAM_CHAT_ID = getenv('TELEGRAM_CHAT_ID') ?: '';

// 3) Почта для дублирования заявок задаётся в NOTIFY_EMAIL.
$NOTIFY_EMAIL = getenv('NOTIFY_EMAIL') ?: '';

// ================= НИЖЕ НИЧЕГО МЕНЯТЬ НЕ НУЖНО =================

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method_not_allowed']);
    exit;
}

function clean_input($value) {
    $clean = trim(strip_tags((string) $value));
    return function_exists('mb_substr') ? mb_substr($clean, 0, 500) : substr($clean, 0, 500);
}

$name     = clean_input($_POST['name'] ?? '');
$phone    = clean_input($_POST['phone'] ?? '');
$relation = clean_input($_POST['relation'] ?? '');
$intent   = clean_input($_POST['intent'] ?? 'Обращение с сайта');
$contact_method = clean_input($_POST['contact_method'] ?? 'Звонок');
$website  = clean_input($_POST['website'] ?? '');
$source   = clean_input($_POST['source'] ?? 'Сайт «Династия»');

// Невидимое поле заполняют только спам-боты. Им отвечаем нейтрально.
if ($website !== '') {
    echo json_encode(['ok' => true]);
    exit;
}

$phone_digits = preg_replace('/\D+/', '', $phone);
if ($name === '' || strlen($phone_digits) < 10 || strlen($phone_digits) > 11) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'invalid_fields']);
    exit;
}

$tracking_keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'yclid'];
$tracking = [];
foreach ($tracking_keys as $key) {
    $value = clean_input($_POST[$key] ?? '');
    if ($value !== '') {
        $tracking[$key] = $value;
    }
}

$date = date('d.m.Y H:i');

$message  = "🏡 Новая заявка с сайта «Династия»\n\n";
$message .= "Имя: {$name}\n";
$message .= "Телефон: {$phone}\n";
if ($relation !== '') {
    $message .= "Кого рассматривают: {$relation}\n";
}
$message .= "Запрос: {$intent}\n";
$message .= "Удобный способ связи: {$contact_method}\n";
$message .= "Источник: {$source}\n";
$message .= $tracking ? "Метки: " . http_build_query($tracking, '', ', ') . "\n" : '';
$message .= "Дата: {$date}";

// ---------- Отправка в Telegram ----------
$telegram_ok = false;
$telegram_configured = ($TELEGRAM_BOT_TOKEN !== '' && $TELEGRAM_CHAT_ID !== '');

if ($telegram_configured) {
    $telegram_url = "https://api.telegram.org/bot{$TELEGRAM_BOT_TOKEN}/sendMessage";
    $params = [
        'chat_id' => $TELEGRAM_CHAT_ID,
        'text'    => $message,
    ];

    if (function_exists('curl_init')) {
        $ch = curl_init($telegram_url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 8);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        $response = curl_exec($ch);
        $telegram_data = $response !== false ? json_decode($response, true) : null;
        $telegram_ok = is_array($telegram_data) && !empty($telegram_data['ok']);
        curl_close($ch);
    } else {
        // Fallback if cURL is unavailable on the hosting
        $opts = [
            'http' => [
                'method'  => 'POST',
                'header'  => 'Content-Type: application/x-www-form-urlencoded',
                'content' => http_build_query($params),
                'timeout' => 8,
            ],
        ];
        $context = stream_context_create($opts);
        $response = @file_get_contents($telegram_url, false, $context);
        $telegram_data = $response !== false ? json_decode($response, true) : null;
        $telegram_ok = is_array($telegram_data) && !empty($telegram_data['ok']);
    }
}

// ---------- Отправка на почту ----------
$email_ok = false;
if ($NOTIFY_EMAIL !== '') {
    $subject = "=?UTF-8?B?" . base64_encode('Новая заявка с сайта Династия') . "?=";
    $host = $_SERVER['HTTP_HOST'] ?? 'dynastia-residence.online';
    $headers  = "Content-Type: text/plain; charset=UTF-8\r\n";
    $headers .= "From: Сайт Династия <noreply@{$host}>\r\n";
    $email_ok = @mail($NOTIFY_EMAIL, $subject, $message, $headers);
}

// ---------- Резервная копия заявки в файл (на случай сбоя обоих каналов) ----------
$log_payload = json_encode([
    'date' => $date,
    'name' => $name,
    'phone' => $phone,
    'relation' => $relation,
    'intent' => $intent,
    'contact_method' => $contact_method,
    'source' => $source,
    'tracking' => $tracking,
    'telegram' => $telegram_ok,
    'email' => $email_ok,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
$log_ok = @file_put_contents(__DIR__ . '/leads.log', $log_payload . "\n", FILE_APPEND | LOCK_EX) !== false;

$delivery_ok = $telegram_ok || $email_ok || $log_ok;
if (!$delivery_ok) {
    http_response_code(500);
}

echo json_encode([
    'ok'       => $delivery_ok,
    'telegram' => $telegram_ok,
    'email'    => $email_ok,
    'logged'   => $log_ok,
]);
