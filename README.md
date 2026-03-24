<div>

# 🛴 ScootSafe

### **La marketplace de stationnement sécurisé pour trottinettes électriques**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)](https://vitejs.dev)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase)](https://supabase.com)
[![Playwright](https://img.shields.io/badge/Playwright-E2E-2EAD33?logo=playwright)](https://playwright.dev)

**🌐 [Voir la démo en ligne](https://saxopa.github.io/pwascooter/)**

<img src="https://img.shields.io/badge/Status-Beta%20Fermée-orange" alt="Status">
<img src="https://img.shields.io/badge/Localisation-Toulouse-FF6B6B" alt="Toulouse">

</div>

---

## 🎯 Le Concept

**ScootSafe** révolutionne le stationnement des trottinettes électriques en ville.

### Le Problème
🔴 **Les trottinettes électriques sont volées ou dégradées** lorsqu'elles sont laissées dans la rue  
🔴 **Les commerçants ont des espaces inutilisés** (arrière-boutique, parking, cave)  
🔴 **Aucune solution fiable** de mise en relation entre les deux

### Notre Solution
🟢 **Une marketplace B2C2B** qui connecte :
- **🏪 Les Hôtes** : Commerçants, bureaux, parkings avec espaces libres
- **🛴 Les Utilisateurs** : Propriétaires de trottinettes cherchant un parking sécurisé

### Comment ça marche ?

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   COMMERÇANT    │────▶│   SCOOTSAFE     │◀────│   UTILISATEUR   │
│   (Host)        │     │   (Marketplace) │     │   (Rider)       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
   Crée un compte           Landing + carte          Réserve une place
   Ajoute sa place          avec filtres             Paiement simulé
   Définit le prix          OAuth + rôles            Reçoit un code dépôt
   Valide un dépôt          Géolocalisation          Dépose en sécurité
```

### 💰 Modèle Économique

| Acteur | Action | Gain |
|--------|--------|------|
| **Host** | Loue son espace inutilisé | Revenus passifs 💶 |
| **User** | Stationne en sécurité | Tranquillité d'esprit 🛡️ |
| **ScootSafe** | Commission sur transactions | Viabilité du service 🚀 |

---

## ✨ Fonctionnalités Clés

### Pour les Utilisateurs 🛴
- 🏠 **Landing page mobile-first** avec CTA vers la carte
- 🗺️ **Carte interactive** avec géolocalisation (Leaflet)
- 🔍 **Filtres intelligents** : prix, recharge électrique, disponibilité
- 📅 **Réservation en temps réel** avec calendrier
- 💳 **Paiement sécurisé** via Stripe (simulation)
- 🎫 **Code de dépôt / code-barres** affiché après réservation
- 📱 **PWA** : Fonctionne hors-ligne, installable sur mobile

### Pour les Commerçants 🏪
- 📊 **Dashboard Host** avec statistiques (revenus, réservations)
- ➕ **CRUD complet** des places de parking
- 🔔 **Gestion des disponibilités** en temps réel
- ✅ **Validation des dépôts** via code saisi côté dashboard
- 🛡️ **Authentification sécurisée** (email + Google OAuth + choix de rôle)

### Sécurité & Fiabilité 🔒
- ✅ **Anti-surbooking** : Vérification capacité en temps réel
- ✅ **RLS Supabase** : Chaque utilisateur voit uniquement SES données
- ✅ **Validation serveur** : RPC Supabase pour activer un dépôt à partir d'un code
- ✅ **Reload stable** sur GitHub Pages avec routage hash + restauration de session
- ✅ **Tests E2E** : 12 scénarios Playwright pour garantir la qualité

---

## 🛠️ Stack Technique

### Frontend
| Technologie | Usage |
|-------------|-------|
| **React 19** | UI moderne avec hooks et concurrent features |
| **TypeScript** | Typage strict, zéro `any` |
| **Vite** | Build ultra-rapide, HMR instantané |
| **CSS custom + design tokens** | UI glassmorphism mobile-first |
| **React Router v7** | Navigation SPA via `HashRouter` pour GitHub Pages |
| **Leaflet** | Cartographie interactive avec tuiles CARTO Dark |
| **Lucide React** | Icônes modernes et cohérentes |

### Backend & Infrastructure
| Technologie | Usage |
|-------------|-------|
| **Supabase** | PostgreSQL + Auth + Realtime |
| **Row Level Security** | Isolation des données par utilisateur |
| **PostgreSQL Functions / RPC** | Anti-surbooking + validation dépôt par code |
| **GitHub Actions** | CI/CD automatique vers GitHub Pages |

### Testing & Qualité
| Technologie | Usage |
|-------------|-------|
| **Playwright** | Tests E2E sur 12 scénarios critiques |
| **ESLint** | Linting TypeScript strict |
| **GitHub Actions** | Build + Deploy automatique |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ LandingPage │  │   MapView   │  │  HostDashboard      │  │
│  │   (CTA)     │  │  (Leaflet)  │  │ CRUD + Validation   │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         └─────────────────┼────────────────────┘             │
│                           │                                  │
│  ┌────────────────────────┴────────────────────────┐         │
│  │              React Router (SPA)                  │         │
│  └────────────────────────┬────────────────────────┘         │
└───────────────────────────┼───────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────┼───────────────────────────────────┐
│                      SUPABASE (Cloud)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐    │
│  │   Auth      │  │ PostgreSQL  │  │   RPC / Functions    │    │
│  │ (Email/OAuth│  │  (RLS)      │  │ booking + validation │    │
│  │  + roles)   │  │             │  │                      │    │
│  └─────────────┘  └──────┬──────┘  └─────────────────────┘    │
│                          │                                     │
│  ┌───────────────────────┴────────────────────────┐            │
│  │        Tables: profiles | hosts | bookings     │            │
│  └────────────────────────────────────────────────┘            │
└────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Installation & Développement

### Prérequis
- Node.js 20+
- npm ou yarn
- Compte Supabase (gratuit)

### 1. Cloner le projet

```bash
git clone https://github.com/saxopa/pwascooter.git
cd pwascooter
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer les variables d'environnement

Créer un fichier `.env` à la racine :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon
```

### 3bis. Appliquer la migration Supabase

Exécuter dans Supabase SQL Editor :

[`supabase/migrations/20260324_add_pickup_code_and_validation_rpc.sql`](/Users/alexis/Desktop/pwascooter/supabase/migrations/20260324_add_pickup_code_and_validation_rpc.sql)

Cette migration :
- ajoute `bookings.pickup_code`
- backfill les réservations existantes
- génère automatiquement un code sur les nouvelles réservations
- crée la RPC `validate_booking_by_code`

### 4. Lancer le serveur de développement

```bash
npm run dev
```

L'application est accessible sur `http://localhost:5173/pwascooter/`

### Routes principales

| Route | Usage |
|-------|-------|
| `/#/` | Landing page |
| `/#/map` | Carte et réservation |
| `/#/bookings` | Réservations utilisateur |
| `/#/host/dashboard` | Dashboard commerçant |

---

## 🧪 Tests

### Lancer tous les tests E2E

```bash
# Mode UI (recommandé pour déboguer)
npm run test:e2e:ui

# Mode headless (rapide)
npm run test:e2e

# Mode navigateur visible
npm run test:e2e:headed
```

### Scénarios de test

| Fichier | Tests | Description |
|---------|-------|-------------|
| `auth.spec.ts` | 5 | Inscription/connexion email + Google OAuth |
| `host.spec.ts` | 4 | Dashboard, CRUD places, protection routes |
| `booking.spec.ts` | 3 | Réservation, liste, anti-surbooking |

---

## 📦 Déploiement

Le projet est configuré pour un déploiement automatique sur **GitHub Pages** via GitHub Actions.

### Workflow

1. Push sur `main` → Déclenche le workflow
2. Build Vite avec `base: '/pwascooter/'`
3. Déploiement sur `gh-pages`
4. Site live sur `https://saxopa.github.io/pwascooter/`

### Notes GitHub Pages

- l’application utilise `HashRouter` pour éviter les erreurs `404` au refresh
- le retour Google OAuth est restauré côté app avant redirection vers `#/map`
- un bootstrap de session protège les reloads sur `/map`, `/bookings` et `/host/dashboard`

### Configuration GitHub Actions

Voir `.github/workflows/deploy.yml`

---

## 🗺️ Schéma de Base de Données

```sql
-- Table des utilisateurs (RLS activé)
profiles
├── id: uuid (PK)
├── email: text
├── nom: text
├── role: text ('user' | 'host' | 'admin' | null)
└── company_name: text

-- Table des places de parking (RLS activé)
hosts
├── id: uuid (PK)
├── owner_id: uuid → profiles.id
├── name: text
├── latitude: float8
├── longitude: float8
├── capacity: int4
├── price_per_hour: numeric
├── has_charging: boolean
└── is_active: boolean

-- Table des réservations (RLS activé)
bookings
├── id: uuid (PK)
├── user_id: uuid → profiles.id
├── host_id: uuid → hosts.id
├── start_time: timestamptz
├── end_time: timestamptz
├── total_price: numeric
├── pickup_code: text unique
└── status: enum ('pending', 'active', 'cancelled', 'completed')
```

### Fonctions PostgreSQL / RPC

| Fonction | Rôle |
|----------|------|
| `book_parking_spot` | Crée une réservation en évitant le surbooking |
| `validate_booking_by_code` | Valide le dépôt d’un client côté commerçant à partir du `pickup_code` |

---

## 🎯 Roadmap

- [x] **Phase 1** : MVP avec carte et réservation
- [x] **Phase 2** : Interface Host complète
- [x] **Phase 3** : Tests E2E Playwright
- [x] **Phase 4** : Landing page + Google OAuth + choix de rôle
- [x] **Phase 5** : Code de dépôt + validation commerçant via RPC
- [x] **Phase 6** : Stabilisation du reload GitHub Pages
- [ ] **Phase 7** : Intégration Stripe réelle
- [ ] **Phase 8** : Scanner caméra pour lecture du code-barres
- [ ] **Phase 9** : Feedback et historique avancé

---

## 🤝 Contribuer

Les contributions sont les bienvenues ! Voici comment participer :

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit tes changements (`git commit -m 'Add some AmazingFeature'`)
4. Push sur la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

---

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

---

<div align="center">

**[🌐 Voir la démo](https://saxopa.github.io/pwascooter/)** • **[🐛 Signaler un bug](https://github.com/saxopa/pwascooter/issues)** • **[💡 Proposer une idée](https://github.com/saxopa/pwascooter/discussions)**

Made with ❤️ in Toulouse

</div>
