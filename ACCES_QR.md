# Porte d'entrée — QR Code & lien direct

Les clients peuvent accéder à l'application de deux façons :

1. **Scanner le QR code** affiché à l'hôtel
2. **Saisir le lien** dans le navigateur du téléphone

## Page pour générer / imprimer le QR

1. Démarrez l'application : `npm start`
2. Dans le terminal, notez la ligne **Network** (Wi‑Fi) et le **port** (5173, 5174, 5175…)
3. Sur le PC serveur, ouvrez :

   **http://VOTRE_IP:PORT/acces.html**

   Exemple : `http://11.11.83.23:5175/acces.html`

4. Cliquez **Mettre à jour le QR** puis **Imprimer l'affiche**

### IP qui change chaque jour (Wi‑Fi hôtel)

Chaque matin :

1. `ipconfig` → adresse **Wi‑Fi** (pas VirtualBox / VMware)
2. `npm start` → noter le port Vite
3. Ouvrir `/acces.html` avec la nouvelle URL → régénérer le QR → réimprimer

Le QR est généré **localement** (sans Internet) via `frontend/public/vendor/qrcode.min.js`.

## Lien direct pour les clients (sans QR)

C'est la même adresse que celle encodée dans le QR :

**http://VOTRE_IP:5173**

Le client arrive directement sur le formulaire d'enregistrement.

## Générer une image PNG (affiche, flyer)

```bash
cd frontend
npm install
npm run qr -- http://11.11.9.131:5173
```

Le fichier est créé : `frontend/public/qr-acces-hotel-president.png`

## Important — réseau

- Le **téléphone** et le **PC serveur** doivent être sur le **même WiFi**
- Le backend doit tourner (port **5001**)
- Le frontend doit tourner (port **5173**)
- Autoriser les ports dans le pare-feu Windows si besoin

## Trouver l'adresse IP du PC

```powershell
ipconfig
```

Repérez **Adresse IPv4** sur la carte Wi-Fi.
