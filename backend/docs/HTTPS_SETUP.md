# Configuration HTTPS / Nginx — Hôtel Président Borne Satisfaction

## Architecture recommandée

```
[Tablette kiosk / Navigateur]
           │
           ▼ HTTPS :443
    [Nginx reverse proxy]  ←── certificat Let's Encrypt
           │
           ▼ HTTP :5001 (localhost uniquement)
    [Express backend]
           │
    [MySQL 127.0.0.1]
```

Le backend Express n'est jamais exposé directement sur Internet.
Nginx gère TLS, HSTS, et les redirections HTTP→HTTPS.

---

## Prérequis

- Serveur Linux (Ubuntu 22.04 LTS recommandé)
- Nom de domaine DNS pointant vers le serveur (ex: `borne.hotel-president.ci`)
- Nginx installé : `sudo apt install nginx`
- Certbot installé : `sudo apt install certbot python3-certbot-nginx`

---

## Étape 1 — Obtenir le certificat Let's Encrypt

```bash
sudo certbot --nginx -d borne.hotel-president.ci
```

Certbot modifie automatiquement votre config Nginx pour activer HTTPS.
Vérifiez le renouvellement automatique :

```bash
sudo systemctl status certbot.timer
# ou
sudo certbot renew --dry-run
```

---

## Étape 2 — Configuration Nginx complète

Créez le fichier `/etc/nginx/sites-available/borne-satisfaction` :

```nginx
# ── Redirection HTTP → HTTPS ──────────────────────────────────────────────────
server {
    listen 80;
    listen [::]:80;
    server_name borne.hotel-president.ci;

    # Let's Encrypt renouvellement
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# ── Serveur HTTPS principal ────────────────────────────────────────────────────
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name borne.hotel-president.ci;

    # ── Certificats TLS ───────────────────────────────────────────────────────
    ssl_certificate     /etc/letsencrypt/live/borne.hotel-president.ci/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/borne.hotel-president.ci/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # ── Sécurité TLS ─────────────────────────────────────────────────────────
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache   shared:MozSSL:10m;
    ssl_stapling        on;
    ssl_stapling_verify on;

    # ── Headers de sécurité ───────────────────────────────────────────────────
    # HSTS : force HTTPS pour 1 an + sous-domaines
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # ── Reverse proxy vers Express backend ───────────────────────────────────
    location /api/ {
        # Supprime le préfixe /api avant de transmettre à Express
        rewrite ^/api(/.*)$ $1 break;

        proxy_pass         http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        # Cookies HttpOnly transmis correctement
        proxy_cookie_path  / "/; SameSite=Strict";

        # Timeouts
        proxy_connect_timeout 10s;
        proxy_send_timeout    30s;
        proxy_read_timeout    30s;
    }

    # ── Frontend React (fichiers statiques après build) ───────────────────────
    root /var/www/borne-satisfaction/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache assets statiques
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # ── Logs ──────────────────────────────────────────────────────────────────
    access_log /var/log/nginx/borne-satisfaction.access.log;
    error_log  /var/log/nginx/borne-satisfaction.error.log warn;
}
```

Activez le site :

```bash
sudo ln -s /etc/nginx/sites-available/borne-satisfaction /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Étape 3 — Déployer le frontend (build)

```bash
cd /path/to/soundageclient/frontend
npm run build
sudo cp -r dist/ /var/www/borne-satisfaction/
```

---

## Étape 4 — Mettre à jour les variables d'environnement

**backend/.env** :
```dotenv
NODE_ENV=production
ALLOWED_ORIGINS=https://borne.hotel-president.ci
```

**frontend/.env** (avant le build) :
```dotenv
VITE_API_URL=https://borne.hotel-president.ci/api
```

---

## Étape 5 — Démarrer le backend avec PM2

```bash
npm install -g pm2
cd /path/to/soundageclient/backend
pm2 start server.js --name "borne-backend" --interpreter node
pm2 save
pm2 startup
```

Vérifier les logs en temps réel :
```bash
pm2 logs borne-backend
```

---

## Réseau hôtel sans Internet (WiFi local)

Si la borne fonctionne en réseau fermé sans accès Internet, Let's Encrypt
ne peut pas valider le domaine. Options :

1. **Certificat auto-signé** (moins recommandé — avertissement navigateur) :
   ```bash
   sudo openssl req -x509 -nodes -days 3650 -newkey rsa:4096 \
     -keyout /etc/ssl/private/borne.key \
     -out /etc/ssl/certs/borne.crt \
     -subj "/C=CI/ST=Yamoussoukro/O=Hotel President/CN=192.168.x.x"
   ```
   Puis remplacez les chemins `ssl_certificate` dans la config Nginx.

2. **IP locale en HTTPS** avec certificat auto-signé importé dans le
   navigateur de la borne (solution la plus propre en environnement fermé).

3. **HTTP sur réseau WiFi isolé** — acceptable uniquement si le réseau est
   physiquement sécurisé et sans accès Internet. Assurez-vous que
   `NODE_ENV=development` et que `ALLOWED_ORIGINS` contient l'IP de la borne.

---

## Vérification finale

```bash
# Test HTTPS
curl -I https://borne.hotel-president.ci/api/health

# Test redirection HTTP→HTTPS
curl -I http://borne.hotel-president.ci

# Test headers de sécurité
curl -s -I https://borne.hotel-president.ci | grep -E "Strict-Transport|X-Frame|X-Content"
```

Score SSL attendu après configuration : **A+** sur [ssllabs.com/ssltest](https://www.ssllabs.com/ssltest/)
