@echo off
echo 🚀 DÉMARRAGE AUTOMATIQUE DES SERVEURS
echo.

echo 1️⃣ Vérification MySQL...
sc query mysql 2>nul | findstr RUNNING >nul
if %errorlevel% neq 0 (
    echo ❌ MySQL n'est pas démarré ! Veuillez démarrer MySQL dans les services Windows
    pause
    exit /b 1
)
echo ✅ MySQL est bien démarré

echo.
echo 2️⃣ Démarrage du Backend...
cd /d "%~dp0backend"
start "Backend Server" cmd /k "echo Backend en cours de démarrage... && node server.js"

echo 3️⃣ Attente du Backend (5 secondes)...
timeout /t 5 /nobreak >nul

echo.
echo 4️⃣ Démarrage du Frontend...
cd /d "%~dp0frontend"
start "Frontend Server" cmd /k "echo Frontend en cours de démarrage... && npm run dev"

echo.
echo ✅ Serveurs démarrés !
echo.
echo 🌐 Frontend : http://localhost:5173
echo 🌐 Réseau   : http://11.11.5.60:5173
echo 🔧 Backend  : http://11.11.5.60:5001
echo.
echo Appuyez sur une touche pour ouvrir le navigateur...
pause >nul
start http://localhost:5173
