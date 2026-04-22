# EduSchedule Pro

**Système Intégré de Gestion de l'Emploi du Temps et de Suivi Pédagogique des Séances de Cours**

Projet réalisé dans le cadre du cours de Développement Web — ISGE-BF, Année Universitaire 2025-2026.

🌐 **Site hébergé** : [https://eduschedule.infinityfreeapp.com](https://eduschedule.infinityfreeapp.com)

---

## Fonctionnalités

- **Module Emploi du Temps** : CRUD classes/matières/enseignants/salles, grille hebdomadaire, détection de conflits, publication
- **Module QR-Code & Pointage** : Génération QR sécurisé, scan via caméra mobile, validation temporelle, détection des retards
- **Module Cahier de Texte** : Saisie en temps réel par le délégué, double signature numérique, verrouillage automatique après signature enseignant
- **Module Vacation** : Calcul automatique des montants, chaîne de validation (enseignant → surveillant → comptable)
- **Tableau de Bord** : KPIs, graphiques Recharts, alertes temps réel, vues personnalisées par rôle

## Stack Technique

| Couche      | Technologie                                     |
|-------------|-------------------------------------------------|
| Frontend    | React 18, React Router 6, Bootstrap 5, Recharts |
| Backend     | PHP 8+ (API REST), JWT natif                    |
| Base        | MySQL 8 (InnoDB, utf8mb4)                       |
| QR-Code     | qrcode.react (génération), html5-qrcode (scan)  |
| Signatures  | signature_pad (npm)                             |
| Hébergement | InfinityFree (PHP + MySQL) via FTP FileZilla     |

---

## Installation locale (WAMP)

### 1. Base de données

Dans phpMyAdmin, créer une base `eduschedule_pro` puis importer :
```
database/eduschedule_pro.sql
```

### 2. Backend PHP

Copier le projet dans `C:\wamp64\www\eduschedule-pro\`

Créer `backend/.env` (ne pas le committer — gitignored) :
```env
DB_HOST=localhost
DB_NAME=eduschedule_pro
DB_USER=root
DB_PASS=
JWT_SECRET=eduschedule_jwt_secret_2025
QR_SECRET=eduschedule_qr_secret_2025
APP_URL=http://localhost/eduschedule-pro
APP_ENV=local
```

### 3. Frontend React

```bash
cd frontend/
npm install
npm start
```

> `npm start` utilise automatiquement `frontend/.env.development` → pointe vers WAMP.

L'application est accessible sur `http://localhost:3000`

---

## Déploiement sur InfinityFree

### Prérequis
- Compte InfinityFree : domaine `eduschedule.infinityfreeapp.com`
- Base MySQL sur `sql100.infinityfree.com`
- FileZilla : host `ftpupload.net`, port `21`

### 1. Base de données

Dans phpMyAdmin InfinityFree, importer `database/eduschedule_pro.sql` puis réinitialiser les mots de passe :
```sql
UPDATE utilisateurs SET mot_de_passe_hash = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
```

### 2. Fichier .env sur le serveur

Créer `htdocs/.env` via FileZilla :
```env
DB_HOST=sql100.infinityfree.com
DB_NAME=if0_41721665_eduschedule
DB_USER=if0_41721665
DB_PASS=VOTRE_MOT_DE_PASSE
JWT_SECRET=eduschedule_jwt_secret_2025
QR_SECRET=eduschedule_qr_secret_2025
APP_URL=https://eduschedule.infinityfreeapp.com
APP_ENV=production
```

### 3. Build et Upload FTP

```bash
cd frontend/
npm run build
```

> `npm run build` utilise automatiquement `frontend/.env.production` → URL InfinityFree.

Via FileZilla, uploader dans `htdocs/` :
- `frontend/build/static/` → `htdocs/static/`
- `frontend/build/index.html` → `htdocs/index.html`
- `backend/` → `htdocs/backend/`
- `frontend/public/.htaccess` → `htdocs/.htaccess`

---

## Travailler en local ET sur le site hébergé simultanément

Le projet utilise deux fichiers d'environnement séparés :

| Fichier | Commande | URL API |
|---|---|---|
| `frontend/.env.development` | `npm start` | `http://localhost/eduschedule-pro/backend` |
| `frontend/.env.production`  | `npm run build` | `https://eduschedule.infinityfreeapp.com/backend` |

**Workflow recommandé :**
1. Développer et tester en local avec `npm start`
2. Quand c'est prêt → `npm run build` puis upload via FileZilla
3. Aucune modification de configuration nécessaire entre les deux environnements

---

## Workflow Cahier de Texte

1. **Enseignant** scanne le QR code → pointage enregistré (ouverture de la séance)
2. **Délégué** accède au formulaire depuis son tableau de bord → crée le cahier
3. **Pendant la séance**, le délégué saisit les points abordés en temps réel (bouton "Modifier")
4. **Fin de séance** : le délégué appose sa signature numérique
5. **Enseignant** vérifie le contenu, confirme l'heure de fin réelle et signe
6. La fiche est **verrouillée automatiquement** — plus aucune modification sans déverrouillage admin
7. **Surveillant** consulte les fiches en lecture seule pour contrôle

---

## Comptes de démonstration

| Rôle        | Email                          | Mot de passe |
|-------------|--------------------------------|--------------|
| Admin       | admin@eduschedule.pro          | password     |
| Enseignant  | cedric.bere@isge.edu           | password     |
| Enseignant  | aminata.ouedraogo@isge.edu     | password     |
| Enseignant  | ibrahim.kabore@isge.edu        | password     |
| Enseignant  | moussa.traore@isge.edu         | password     |
| Enseignant  | marie.sanou@isge.edu           | password     |
| Enseignant  | patricia.zongo@isge.edu        | password     |
| Délégué L1  | delegue.l1@isge.edu            | password     |
| Délégué L2  | delegue.l2@isge.edu            | password     |
| Délégué L3  | delegue.l3@isge.edu            | password     |
| Surveillant | surveillant@isge.edu           | password     |
| Comptable   | comptable@isge.edu             | password     |

---

## Arborescence du projet

```
eduschedule-pro/
├── backend/
│   ├── api/               # Endpoints REST (auth, pointages, cahiers, vacations…)
│   ├── config/            # Configuration BDD et CORS
│   ├── middleware/        # Authentification JWT
│   ├── models/            # Modèles de données
│   └── .htaccess          # Réécriture d'URL Apache
├── frontend/
│   ├── public/
│   │   └── .htaccess      # Redirection React Router (Apache)
│   ├── src/
│   │   ├── assets/        # Images (photo ISGE…)
│   │   ├── components/    # Composants réutilisables
│   │   ├── context/       # Contextes React (Auth, Notifications)
│   │   ├── pages/         # Pages de l'application
│   │   └── utils/         # Services API et helpers
│   ├── .env.development   # URL API locale (WAMP) — npm start
│   └── .env.production    # URL API production (InfinityFree) — npm run build
├── database/
│   └── eduschedule_pro.sql
├── .env.example
└── README.md
```

---

## Rôles et permissions

| Fonctionnalité          | Admin | Enseignant | Délégué | Surveillant | Comptable |
|-------------------------|:-----:|:----------:|:-------:|:-----------:|:---------:|
| CRUD Référentiels       |  ✓    |            |         |             |           |
| Emploi du temps         |  ✓    |            |         |             |           |
| Voir emploi du temps    |  ✓    |    ✓       |   ✓     |     ✓       |    ✓      |
| Générer QR-Code         |  ✓    |            |         |     ✓       |           |
| Scanner QR (pointage)   |       |    ✓       |         |             |           |
| Saisir cahier de texte  |       |            |   ✓     |             |           |
| Signer cahier de texte  |       |    ✓       |   ✓     |             |           |
| Consulter cahiers       |  ✓    |    ✓       |   ✓     |     ✓       |           |
| Générer fiche vacation  |  ✓    |            |         |             |    ✓      |
| Valider vacation        |       |    ✓       |         |     ✓       |    ✓      |
| Rapports / logs         |  ✓    |            |         |             |           |

---

## Test sur smartphone (réseau local)

Pour tester le scan QR depuis un téléphone sur le même WiFi :

1. `ipconfig` → noter l'**Adresse IPv4** (ex: `192.168.1.15`)
2. Dans `frontend/.env.development` :
   ```
   REACT_APP_API_URL=http://192.168.1.15/eduschedule-pro/backend
   ```
3. WAMP → Apache → `httpd-vhosts.conf` : `Require local` → `Require all granted`
4. Redémarrer WAMP, relancer `npm start`
5. Téléphone : `http://192.168.1.15:3000`

---

## Auteurs

- **TRAORE Abd-Ar-Rahim Ada Christ Rayan**
- **DOUSSA Oceane Benedicte**
- **TA-ASNAN Succes**

**INSTITUT SUPÉRIEUR DE GÉNIE ÉLECTRIQUE DU BURKINA FASO (ISGE-BF)** — Année Universitaire 2025-2026
