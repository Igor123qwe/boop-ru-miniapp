import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.filters import CommandStart
from aiogram.types import (
    Message,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    WebAppInfo,
)

# === НАСТРОЙКИ ===
# URL твоего Mini App
WEBAPP_URL = "https://pseudomilitary-nonconcluding-jerold.ngrok-free.dev"

# Токен твоего бота
BOT_TOKEN = "8487290988:AAFhvkoPF-nus3hx_d_X3J0SvNSq9AOXehs"

# === ЛОГИ ===
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
)
logger = logging.getLogger(__name__)


# === ХЕНДЛЕРЫ ===
async def cmd_start(message: Message):
    """
    /start — приветствие + кнопка Mini App
    """
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="Открыть приложение 🌍",
                    web_app=WebAppInfo(url=WEBAPP_URL),
                )
            ]
        ]
    )

    text = (
        "Привет! 👋\n\n"
        "Это твой тревел-сервис на основе реальных маршрутов.\n"
        "Нажми кнопку ниже, чтобы открыть мини-приложение."
    )

    await message.answer(text, reply_markup=kb)


async def echo(message: Message):
    """Ответ на любое сообщение"""
    await message.answer("Нажми /start, чтобы открыть приложение 🌍")


# === ИНИЦИАЛИЗАЦИЯ ===
def create_dispatcher() -> Dispatcher:
    dp = Dispatcher()
    dp.message.register(cmd_start, CommandStart())
    dp.message.register(echo)
    return dp


async def main():
    bot = Bot(token=BOT_TOKEN)
    dp = create_dispatcher()

    logger.info("🚀 Бот запускается…")
    await dp.start_polling(bot)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Бот остановлен.")
