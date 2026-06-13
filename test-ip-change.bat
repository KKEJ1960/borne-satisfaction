@echo off
echo ====================================
echo   TEST DE CHANGEMENT D'IP AUTOMATIQUE
echo ====================================
echo.

echo 🔍 ÉTAPE 1: État actuel
echo IP actuelle: 
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr "IPv4"') do (
    echo   %%a
)
echo.

echo 🔄 ÉTAPE 2: Simulation arrêt/démarrage
echo Les serveurs vont s'arrêter et redémarrer...
echo Ceci simule votre PC qui s'éteint et se rallume
echo.

echo ⏳ ÉTAPE 3: Attente de 10 secondes...
timeout /t 10 /nobreak >nul

echo 🚀 ÉTAPE 4: Redémarrage automatique
echo Démarrage du backend avec détection IP...
cd /d "%~dp0backend"
start "Backend Test" cmd /c "npm start"

echo Attente du démarrage du backend...
timeout /t 5 /nobreak >nul

echo Démarrage du frontend...
start "Frontend Test" cmd /c "cd ../frontend && npm run dev"

echo ⏳ Attente du démarrage complet...
timeout /t 8 /nobreak >nul

echo 🔍 ÉTAPE 5: Vérification nouvelle IP
echo Nouvelle IP détectée:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr "IPv4"') do (
    echo   %%a
)

echo.
echo ====================================
echo   ✅ TEST PRÊT !
echo ====================================
echo.
echo 📱 Accès depuis les téléphones:
echo   Frontend: http://[NOUVELLE_IP]:5173
echo   Backend:  http://[NOUVELLE_IP]:5001
echo.
echo 💡 Instructions:
echo   1. Ouvrez votre téléphone sur l'URL du frontend
echo   2. Testez l'enregistrement d'un client
echo   3. Vérifiez si ça fonctionne avec la nouvelle IP
echo.
pause
