# === Путь к проекту ===
$projectPath = "C:\Users\User\Desktop\boop-ru-miniapp"

# === Окно №1: сервер статики (dist) ===
Start-Process powershell.exe -ArgumentList "-NoExit", "cd `"$projectPath`"; npx serve -s dist -l 4173" -WindowStyle Normal

Start-Sleep -Seconds 2

# === Окно №2: ngrok (порт 4173) ===
Start-Process powershell.exe -ArgumentList "-NoExit", "cd `"$projectPath`"; ./ngrok.exe http 4173" -WindowStyle Normal

Start-Sleep -Seconds 2

# === Окно №3: Telegram bot ===
Start-Process powershell.exe -ArgumentList "-NoExit", "cd `"$projectPath`"; python bot.py" -WindowStyle Normal
