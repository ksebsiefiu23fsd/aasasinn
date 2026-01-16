const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Получаем токен бота из переменных окружения
const BOT_TOKEN = process.env.BOT_TOKEN;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://ваш-сайт.netlify.app';

// Проверяем наличие токена
if (!BOT_TOKEN) {
    console.error('❌ ОШИБКА: BOT_TOKEN не установлен в переменных окружения');
    process.exit(1);
}

// Инициализируем бота
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Функция для создания ссылки на оплату
async function createInvoiceLink(userId, productTitle) {
    try {
        // Используем метод createInvoiceLink для создания ссылки на оплату[citation:9]
        // Для цифровых товаров в Telegram Stars валюта должна быть XTR[citation:4]
        const invoiceLink = await bot.createInvoiceLink({
            title: productTitle,
            description: 'Цифровой товар за 1 Telegram Star',
            payload: JSON.stringify({
                userId: userId,
                product: 'digital_item_1',
                timestamp: Date.now()
            }),
            provider_token: '', // Для цифровых товаров оставляем пустым[citation:4]
            currency: 'XTR', // Обязательно XTR для Telegram Stars[citation:4]
            prices: [
                {
                    label: 'Цифровой товар',
                    amount: 1 // 1 звезда
                }
            ],
            photo_url: 'https://img.icons8.com/color/96/000000/star.png',
            need_name: false,
            need_phone_number: false,
            need_email: false,
            need_shipping_address: false,
            is_flexible: false
        });
        
        return invoiceLink;
    } catch (error) {
        console.error('Ошибка при создании ссылки на оплату:', error);
        throw error;
    }
}

// Обработчик предварительной проверки платежа
bot.on('pre_checkout_query', (query) => {
    console.log('Предварительная проверка платежа:', query.id);
    // Автоматически подтверждаем платеж
    bot.answerPreCheckoutQuery(query.id, true)
        .then(() => console.log('✅ Платеж подтвержден'))
        .catch(err => console.error('❌ Ошибка подтверждения платежа:', err));
});

// Обработчик успешного платежа
bot.on('successful_payment', (msg) => {
    const payment = msg.successful_payment;
    const userId = msg.from.id;
    
    console.log('✅ Успешный платеж:', {
        userId: userId,
        telegram_payment_charge_id: payment.telegram_payment_charge_id,
        amount: payment.total_amount
    });
    
    // Здесь можно выдать цифровой товар пользователю
    // Например, сохранить в базу данных или отправить сообщение
    bot.sendMessage(userId, '🎉 Спасибо за покупку! Ваш цифровой товар активирован.');
});

// Маршрут для создания ссылки на оплату
app.post('/create-payment', async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ 
                error: 'Необходим userId' 
            });
        }
        
        const invoiceLink = await createInvoiceLink(
            userId, 
            'Цифровой товар за 1 звезду'
        );
        
        res.json({ 
            success: true, 
            invoiceLink: invoiceLink 
        });
        
    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).json({ 
            error: 'Ошибка при создании платежа' 
        });
    }
});

// Проверка работоспособности сервера
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'Telegram Stars Payment Backend',
        timestamp: new Date().toISOString()
    });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`🔗 Хост: ${FRONTEND_URL}`);
});