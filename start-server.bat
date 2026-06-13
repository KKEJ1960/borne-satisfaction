@echo off
echo ====================================
echo   DEMARRAGE AUTOMATIQUE HÔTEL PRÉSIDENT
echo ====================================
echo.

:: Vérifier si Node.js est installé
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js n'est pas installé!
    echo Veuillez installer Node.js depuis https://nodejs.org
    pause
    exit /b 1
)

:: Aller dans le dossier backend
cd /d "%~dp0backend"

:: Vérifier si le dossier existe
if not exist "%~dp0backend" (
    echo ❌ Dossier backend introuvable!
    echo Vérifiez que vous êtes dans le bon dossier
    pause
    exit /b 1
)

:: Afficher l'IP actuelle
echo 🔍 Détection de votre configuration réseau...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr "IPv4"') do (
    set IP_ADDRESS=%%a
)

if defined IP_ADDRESS (
    echo ✅ Adresse IP détectée: %IP_ADDRESS%
    echo 🌐 Frontend accessible sur: http://%IP_ADDRESS:5173
    echo 📊 Backend accessible sur: http://%IP_ADDRESS:5001
) else (
    echo ⚠️  IP non détectée, utilisation de localhost
    set IP_ADDRESS=localhost
)

echo.
echo 🚀 Démarrage du backend...
echo.

:: Démarrer le backend en arrière-plan
start "Backend Hôtel Président" cmd /c "npm start"

:: Attendre 3 secondes pour le démarrage
timeout /t 3 /nobreak >nul

:: Démarrer le frontend en arrière-plan
echo 🌐 Démarrage du frontend...
start "Frontend Hôtel Président" cmd /c "cd ../frontend && npm run dev"

echo.
echo ====================================
echo   ✅ SERVEURS DÉMARRÉS!
echo ====================================
echo.
echo 📱 Accès depuis les téléphones:
if defined IP_ADDRESS (
    echo    Frontend: http://%IP_ADDRESS:5173
    echo    Backend:  http://%IP_ADDRESS:5001
) else (
    echo    Frontend: http://localhost:5173
    echo    Backend:  http://localhost:5001
)
echo.
echo 💡 Pour arrêter: Fermez les fenêtres ouvertes
echo 💡 Logs: Consultez les fenêtres de commande
echo.
pause
