@echo off
echo 🧹 NETTOYAGE COMPLET DE L'APPLICATION
echo.

echo 1️⃣ Arrêt des processus Node.js...
taskkill /f /im node.exe 2>nul

echo 2️⃣ Libération des ports 5001 et 5173...
netstat -ano | findstr :5001
netstat -ano | findstr :5173

echo 3️⃣ Nettoyage des caches...
cd /d "%~dp0frontend"
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite"
if exist "dist" rmdir /s /q "dist"

cd /d "%~dp0backend"
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache"

echo 4️⃣ Vérification MySQL...
echo Vérifiez que MySQL est bien démarré dans les services Windows

echo.
echo ✅ Nettoyage terminé ! Vous pouvez maintenant redémarrer les serveurs.
echo.
echo Backend : cd backend && node server.js
echo Frontend : cd frontend && npm run dev
echo.
pause
