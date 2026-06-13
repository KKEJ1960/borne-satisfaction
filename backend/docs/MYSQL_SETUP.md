# Configuration MySQL sécurisée — Hôtel Président Borne Satisfaction

## Pourquoi un utilisateur dédié ?

Le fichier `backend/.env` utilise actuellement `root` sans mot de passe.
En production, cela signifie que si l'application est compromise, l'attaquant
a un accès total à **toutes** les bases de données du serveur MySQL.

Un utilisateur dédié avec droits limités confine les dégâts à la seule base
`hotel_satisfaction`.

---

## Étape 1 — Créer la base et l'utilisateur dédié

Connectez-vous à MySQL en tant que root :

```bash
mysql -u root -p
```

Exécutez les instructions suivantes (remplacez `MOT_DE_PASSE_FORT` par un
vrai mot de passe — min 16 caractères, majuscules, chiffres, symboles) :

```sql
-- Créer la base si elle n'existe pas encore
CREATE DATABASE IF NOT EXISTS hotel_satisfaction
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Créer l'utilisateur applicatif
-- Remplacez 'MOT_DE_PASSE_FORT' par votre mot de passe réel
CREATE USER 'hotel_app'@'localhost' IDENTIFIED BY 'MOT_DE_PASSE_FORT';

-- Accorder uniquement les droits nécessaires à l'application
GRANT SELECT, INSERT, UPDATE, DELETE ON hotel_satisfaction.* TO 'hotel_app'@'localhost';

-- Appliquer immédiatement
FLUSH PRIVILEGES;

-- Vérifier les droits accordés
SHOW GRANTS FOR 'hotel_app'@'localhost';
```

Sortie attendue de `SHOW GRANTS` :
```
GRANT SELECT, INSERT, UPDATE, DELETE ON `hotel_satisfaction`.* TO `hotel_app`@`localhost`
```

---

## Étape 2 — Mettre à jour backend/.env

```dotenv
DB_HOST=localhost
DB_USER=hotel_app
DB_PASSWORD=MOT_DE_PASSE_FORT
DB_NAME=hotel_satisfaction
```

---

## Étape 3 — Tester la connexion

```bash
mysql -u hotel_app -p hotel_satisfaction
```

Vérifiez que vous pouvez vous connecter mais que vous n'avez PAS accès
aux autres bases :

```sql
-- Doit réussir
SELECT COUNT(*) FROM avis;

-- Doit échouer avec "Access denied"
SHOW DATABASES;
CREATE TABLE test (id INT);
DROP TABLE clients;
```

---

## Révoquer l'accès root de l'application (bonne pratique)

Une fois l'utilisateur `hotel_app` fonctionnel, assurez-vous que le compte
`root` MySQL a un mot de passe fort et n'est accessible que localement :

```sql
-- Sécuriser root (si pas déjà fait)
ALTER USER 'root'@'localhost' IDENTIFIED BY 'VOTRE_MOT_DE_PASSE_ROOT_FORT';
FLUSH PRIVILEGES;
```

---

## En cas de besoin de migrations

Les migrations (`npm run migrate`) nécessitent `CREATE TABLE` et `ALTER TABLE`.
Pour les exécuter une seule fois, vous pouvez :

1. Accorder temporairement des droits DDL :
   ```sql
   GRANT CREATE, ALTER, INDEX ON hotel_satisfaction.* TO 'hotel_app'@'localhost';
   FLUSH PRIVILEGES;
   ```

2. Exécuter `npm run migrate`

3. **Révoquer immédiatement** les droits DDL :
   ```sql
   REVOKE CREATE, ALTER, INDEX ON hotel_satisfaction.* FROM 'hotel_app'@'localhost';
   FLUSH PRIVILEGES;
   ```

---

## Sécurité supplémentaire — bind-address

Dans `/etc/mysql/mysql.conf.d/mysqld.cnf` (Linux), assurez-vous que MySQL
n'écoute que sur localhost (pas exposé sur le réseau) :

```ini
[mysqld]
bind-address = 127.0.0.1
```

Redémarrez MySQL après modification : `sudo systemctl restart mysql`
