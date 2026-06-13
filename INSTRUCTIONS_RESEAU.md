# 🌐 CONFIGURATION RÉSEAU WiFi - TESTS SUR TÉLÉPHONE

## 📱 ADRESSES IP CONFIGURÉES

### **🔧 Backend**
- **IP Locale** : `http://11.11.9.131:5001`
- **Écoute** : `0.0.0.0:5001` (toutes les interfaces)

### **🔧 Frontend**
- **IP Locale** : `http://11.11.9.131:5173`
- **Variable** : `VITE_API_URL=http://11.11.9.131:5001`

---

## 🚀 DÉMARRAGE POUR TESTS RÉSEAU

### **Étape 1 : Démarrer le backend**
```bash
cd c:/Users/HP/Desktop/soundageclient/borne-satisfaction/backend
npm start
```
*Devrait afficher :*
```
🚀 Serveur backend lancé sur http://0.0.0.0:5001
🌐 Réseau local: http://11.11.9.131:5001
```

### **Étape 2 : Démarrer le frontend**
```bash
cd c:/Users/HP/Desktop/soundageclient/borne-satisfaction/frontend
npm run dev
```
*Devrait afficher :*
```
Local:   http://localhost:5173/
Network: http://11.11.9.131:5173/
```

---

## 📱 ACCÈS DEPUIS VOTRE TÉLÉPHONE

### **🔗 URL à utiliser**
1. **Ouvrez le navigateur de votre téléphone**
2. **Connectez-vous au même WiFi** que votre PC
3. **Allez sur** : `http://11.11.9.131:5173`

### **📋 Tests à effectuer**
1. **✅ Enregistrement client**
   - Remplir le formulaire sur téléphone
   - Vérifier "Merci [Prénom] !" s'affiche

2. **✅ Questionnaires**
   - Les 5 questionnaires s'enchaînent
   - Pas d'erreur réseau

3. **✅ Base de données**
   - Les avis s'enregistrent
   - Vérifiable dans le dashboard admin

---

## 🔧 VÉRIFICATION RÉSEAU

### **Windows - Vérifier l'IP**
```bash
ipconfig
```
*Chercher "Carte réseau sans fil Wi-Fi" → "Adresse IPv4"*

### **Téléphone - Tester la connexion**
```bash
# Depuis le navigateur téléphone
http://11.11.9.131:5001
```
*Devrait afficher :* `{"message": "Backend API is running!"}`

---

## 🛠️ DÉPANNAGE

### **❌ Si le téléphone n'accède pas au backend**
1. **Vérifier le firewall Windows**
   - Autoriser les ports 5001 et 5173
   - "Autoriser les applications via le pare-feu Windows"

2. **Vérifier que les deux serveurs tournent**
   - Backend : `http://11.11.9.131:5001`
   - Frontend : `http://11.11.9.131:5173`

3. **Même WiFi**
   - PC et téléphone sur le même réseau

### **❌ Si erreur "Network Error"**
1. **Vérifier la variable d'environnement**
   - `frontend/.env` doit contenir : `VITE_API_URL=http://11.11.9.131:5001`

2. **Redémarrer le frontend**
   - Arrêter avec Ctrl+C
   - Relancer `npm run dev`

---

## 🔄 POUR REVENIR EN LOCAL

### **Modifier frontend/.env**
```env
VITE_API_URL=http://localhost:5001
```

### **Modifier backend/server.js**
```javascript
app.listen(PORT, () => {
    console.log(`🚀 Serveur backend lancé sur http://localhost:${PORT}`);
```

---

**🎯 Prêt pour les tests sur téléphone ! Lancez les deux serveurs et accédez via http://11.11.9.131:5173**
