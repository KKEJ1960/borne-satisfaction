# 🔄 Guide de Redémarrage Fiable

## 🚨 Problème courant
Après avoir éteint votre PC/IDE, les serveurs peuvent ne plus fonctionner correctement.

## 🛠️ Solution en 2 étapes

### ÉTAPE 1 : Nettoyage (Obligatoire)
```bash
# Double-cliquez sur ce fichier :
cleanup.sh
```

### ÉTAPE 2 : Démarrage
```bash
# Double-cliquez sur ce fichier :
start-servers.bat
```

## 🔧 Si ça ne marche toujours pas

### 1. Vérifier MySQL
- Ouvrir "Services Windows"
- Chercher "MySQL" ou "MySQL80"
- Assurez-vous qu'il est "En cours d'exécution"

### 2. Ports bloqués
```bash
# Vérifier les ports utilisés :
netstat -ano | findstr :5001
netstat -ano | findstr :5173

# Tuer les processus si nécessaire :
taskkill /f /im node.exe
```

### 3. Réinstaller les dépendances (dernier recours)
```bash
cd backend && npm install
cd ../frontend && npm install
```

## 📱 Accès depuis votre téléphone
- Frontend : `http://11.11.5.60:5173`
- Backend : `http://11.11.5.60:5001`

## ⚡ Astuce de pro
Créez un raccourci sur votre bureau pour `start-servers.bat` pour un démarrage rapide !
