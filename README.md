# EduSchedule Pro

**Système Intégré de Gestion de l'Emploi du Temps et de Suivi Pédagogique des Séances de Cours**

Projet réalisé dans le cadre du cours de Développement Web — ITRST, Année Universitaire 2025-2026.

---

## Fonctionnalités

- **Module Emploi du Temps** : CRUD classes/matières/enseignants/salles, grille hebdomadaire, détection de conflits, publication, export PDF
- **Module QR-Code & Pointage** : Génération QR sécurisé par créneau, scan via caméra mobile, validation temporelle, détection des retards
- **Module Cahier de Texte** : Saisie par le délégué, signatures numériques (délégué + enseignant), workflow de validation, historique
- **Module Vacation** : Calcul automatique des montants, chaîne de validation (enseignant → surveillant → comptable), export PDF
- **Tableau de Bord** : KPIs, graphiques Recharts, alertes temps réel, vues par rôle

## Stack Technique

| Couche     | Technologie                          |
|------------|--------------------------------------|
| Frontend   | React 18, React Router 6, Bootstrap 5, Recharts |
| Backend    | PHP 8+ (API REST), JWT natif         |
| Base       | MySQL 8 (InnoDB, utf8mb4)            |
| QR-Code    | qrcode.react (génération), html5-qrcode (scan) |
| Signatures | signature_pad (npm)                  |

## Prérequis

- **PHP 8.0+** avec extensions : pdo_mysql, openssl, json, mbstring
- **MySQL 8+** ou MariaDB 10.6+
- **Node.js 18+** et npm
- **XAMPP / WAMP / MAMP** ou serveur Apache/Nginx
- **Navigateur** : Chrome, Firefox, Edge (dernière version)

## Installation

### 1. Base de données

```bash
# Se connecter à MySQL
mysql -u root -p

# Exécuter le script SQL
source database/eduschedule_pro.sql
```

### 2. Backend PHP

```bash
# Copier le fichier d'environnement
cp .env.example .env

# Modifier les paramètres de connexion dans .env
# DB_HOST, DB_NAME, DB_USER, DB_PASS

# Placer le dossier backend/ dans le répertoire htdocs (XAMPP)
# ou www (WAMP) ou configurer un VirtualHost Apache
```

### 3. Frontend React

```bash
cd frontend/

# Installer les dépendances
npm install

# Configurer l'URL de l'API dans .env
# REACT_APP_API_URL=http://localhost/eduschedule-pro/backend

# Lancer le serveur de développement
npm start
```

L'application sera accessible sur `http://localhost:3000`

## Comptes de démonstration

| Rôle         | Email                         | Mot de passe |
|--------------|-------------------------------|--------------|
| Admin        | admin@eduschedule.pro         | password     |
| Enseignant   | cedric.bere@isge.edu          | password     |
| Enseignant   | aminata.ouedraogo@isge.edu    | password     |
| Délégué L1   | delegue.l1@isge.edu           | password     |
| Délégué L2   | delegue.l2@isge.edu           | password     |
| Surveillant  | surveillant@isge.edu          | password     |
| Comptable    | comptable@isge.edu            | password     |

## Arborescence du projet

```
eduschedule-pro/
├── backend/
│   ├── api/               # Endpoints REST (auth, classes, emploi_temps, etc.)
│   ├── config/            # Configuration BDD et CORS
│   ├── middleware/         # Authentification JWT
│   ├── models/            # Modèles de données (Seance, Enseignant, etc.)
│   └── .htaccess          # Réécriture d'URL Apache
├── frontend/
│   ├── public/            # Fichiers statiques
│   └── src/
│       ├── components/    # Composants réutilisables (Sidebar, Navbar, etc.)
│       ├── context/       # Contextes React (Auth, Notifications)
│       ├── hooks/         # Hooks personnalisés (useFetch)
│       ├── pages/         # Pages de l'application
│       └── utils/         # Services API et fonctions utilitaires
├── database/
│   └── eduschedule_pro.sql  # Script SQL complet
├── .env.example           # Modèle de configuration
└── README.md              # Documentation
```

## Rôles et permissions

| Fonctionnalité         | Admin | Enseignant | Délégué | Surveillant | Comptable | Étudiant |
|------------------------|:-----:|:----------:|:-------:|:-----------:|:---------:|:--------:|
| CRUD Référentiels      |  oui  |            |         |             |           |          |
| Gestion emploi du temps|  oui  |            |         |             |           |          |
| Voir emploi du temps   |  oui  |    oui     |   oui   |     oui     |    oui    |   oui    |
| Générer QR-Code        |  oui  |            |         |     oui     |           |          |
| Scanner QR (pointage)  |       |    oui     |         |             |           |          |
| Saisir cahier texte    |       |            |   oui   |             |           |          |
| Signer cahier texte    |       |    oui     |   oui   |             |           |          |
| Générer fiche vacation |  oui  |            |         |             |    oui    |          |
| Valider vacation       |       |    oui     |         |     oui     |    oui    |          |
| Voir rapports          |  oui  |            |         |             |           |          |
| Journal d'activité     |  oui  |            |         |             |           |          |

## Accès réseau local (test sur smartphone)

Pour tester le pointage QR depuis un smartphone :

1. Trouver l'IP du PC : `ipconfig` → **Adresse IPv4** (ex: `192.168.1.15`)
2. Dans `frontend/.env`, remplacer `localhost` par l'IP :
   ```
   REACT_APP_API_URL=http://192.168.1.15/eduschedule-pro/backend
   HOST=0.0.0.0
   ```
3. Dans WAMP → Apache → `httpd-vhosts.conf` : remplacer `Require local` par `Require all granted`
4. Redémarrer WAMP puis relancer `npm run build` et copier le build dans WAMP
5. Accéder depuis le téléphone (même WiFi) : `http://192.168.1.15`

## Auteurs

- **TRAORE Abd-Ar-Rahim Ada Christ Rayan**
- **DOUSSA Oceane Benedicte**
- **TA-ASNAN Succes**

ISGE-BF — Année Universitaire 2025-2026
