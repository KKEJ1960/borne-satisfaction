@echo off
echo ====================================
echo   TEST DE CHANGEMENT D'IP AUTOMATIQUE
echo ====================================
echo.

echo 🔍 ÉTAPE 1: Arrêt des serveurs actuels
taskkill /F /IM node.exe >nul 2>&1
echo.

echo 🔄 ÉTAPE 2: Simulation redémarrage
echo Attente de 5 secondes...
timeout /t 5 /nobreak >nul

echo 🚀 ÉTAPE 3: Démarrage automatique
echo Démarrage du backend...
cd backend
start "Backend" cmd /c "npm start"

echo Attente du démarrage...
timeout /t 5 /nobreak >nul

echo Démarrage du frontend...
cd ../frontend
start "Frontend" cmd /c "npm run dev"

echo ⏳ Attente finale...
timeout /t 8 /nobreak >nul

echo 🔍 ÉTAPE 4: Vérification IP
echo IP actuelle:
ipconfig | findstr "IPv4"

echo.
echo ====================================
echo   ✅ TEST TERMINÉ !
echo ====================================
echo.
echo 📱 Testez maintenant sur votre téléphone:
echo   1. Allez sur l'IP affichée ci-dessus:5173
echo   2. Testez l'enregistrement client
echo   3. Ça devrait fonctionner automatiquement !
echo.
pause
