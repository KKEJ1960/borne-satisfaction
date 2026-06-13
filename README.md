# Borne de Satisfaction Hôtelière

Une application web complète pour la collecte et l'analyse des avis clients dans un établissement hôtelier.

## 🎯 Fonctionnalités

### Côté Client
- **Identification client** : Formulaire avec nom, prénom, téléphone, email
- **Sélection de département** : Accueil, Chambres, Restaurants, Loisirs, Propreté
- **Questionnaires détaillés** : Évaluation sur 5 points par département
- **Interface intuitive** : Design moderne et responsive
- **Remerciement animé** : Retour automatique après 4.5 secondes

### Côté Administration
- **Accès sécurisé** : 3 clics sur "Commencer l'évaluation" (champs vides) + login/mot de passe
- **Dashboard complet** :
  - Graphiques en barres (notes moyennes par département)
  - Graphique camembert (répartition des avis)
  - Liste détaillée des derniers avis avec infos clients
  - Statistiques générales (total avis, note moyenne, clients uniques, commentaires)
- **Données exportables** : Affichage des coordonnées clients et commentaires détaillés

## 🛠️ Architecture Technique

### Backend (Node.js/Express)
- **Base de données** : MySQL avec tables `clients` et `avis`
- **API REST** : 4 endpoints (client, avis, admin/login, dashboard)
- **Sécurité** : Variables d'environnement, authentification admin
- **Configuration** : Support ES6 modules

### Frontend (React/Vite)
- **Framework** : React 19 avec Vite
- **Styling** : CSS custom avec design moderne
- **Graphiques** : Chart.js avec react-chartjs-2
- **Icons** : Lucide React
- **HTTP Client** : Axios

## 🚀 Installation et Démarrage

### Prérequis
- Node.js (v18+)
- MySQL
- npm ou yarn

### 1. Cloner le projet
```bash
git clone <repository-url>
cd borne-satisfaction
```

### 2. Installer les dépendances
```bash
npm run install-deps
```

### 3. Configurer la base de données
1. Créer une base de données MySQL
2. Modifier le fichier `backend/.env` :
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=votre_mot_de_passe
   DB_NAME=hotel_satisfaction
   PORT=5000
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=admin123
   ```

### 4. Initialiser la base de données
```bash
npm run setup
```

### 5. Démarrer l'application
```bash
# Démarrer backend et frontend simultanément
npm start

# Ou séparément :
npm run backend  # Port 5000
npm run frontend # Port 5173
```

## 📱 Utilisation

### Pour les clients
1. Remplir le formulaire d'identification
2. Choisir un département à évaluer
3. Répondre au questionnaire (notes de 1 à 5)
4. Recevoir le message de remerciement

### Pour l'administration
1. Sur la page d'accueil, cliquer 3 fois sur "Commencer l'évaluation" avec les champs vides
2. Entrer les identifiants admin (par défaut : admin / admin123)
3. Consulter le dashboard avec les statistiques et avis

## 📊 Structure des données

### Table `clients`
- `id` : Identifiant unique
- `nom`, `prenom` : Informations client
- `telephone` : Téléphone (obligatoire)
- `email` : Email (optionnel)

### Table `avis`
- `id` : Identifiant unique
- `client_id` : Référence au client
- `departement` : Service évalué
- `note` : Note sur 3 (calculée automatiquement)
- `commentaire` : Détails des réponses
- `date` : Timestamp automatique

## 🔧 Scripts disponibles

- `npm start` : Démarrer backend + frontend
- `npm run backend` : Démarrer uniquement le backend
- `npm run frontend` : Démarrer uniquement le frontend
- `npm run setup` : Initialiser la base de données
- `npm run install-deps` : Installer toutes les dépendances

## 🎨 Personnalisation

### Modifier les identifiants admin
Éditer `backend/.env` :
```env
ADMIN_USERNAME=votre_username
ADMIN_PASSWORD=votre_password
```

### Ajouter des départements
1. Modifier les composants questionnaire correspondants
2. Mettre à jour `App.jsx` pour les nouvelles routes
3. Adapter les questions dans chaque composant département

### Personnaliser le design
- Modifier `frontend/src/style.css` pour le style global
- Adapter les couleurs dans les composants individuels

## 🐛 Dépannage

### Problèmes courants
- **Connexion MySQL** : Vérifier les identifiants dans `.env`
- **Port occupé** : Modifier `PORT=5000` dans `.env`
- **CORS** : Le backend est déjà configuré avec `cors()`

### Logs
- Backend : Console serveur (port 5000)
- Frontend : Console navigateur (port 5173)

## 📝 Notes de développement

- Les notes sur 5 sont automatiquement converties en notes sur 3 pour le dashboard
- L'accès admin est caché pour éviter les utilisations non autorisées
- Les données sont persistées en base de données MySQL
- Le frontend utilise Vite pour un développement rapide

---

**Développé avec ❤️ pour l'hôtellerie**
