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
   Crée un compte           Carte interactive        Réserve une place
   Ajoute sa place          avec filtres             Paiement sécurisé
   Définit le prix          (prix, recharge)         Stationne en sécurité
   Gagne de l'argent        Géolocalisation          Reçoit confirmation
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
- 🗺️ **Carte interactive** avec géolocalisation (Leaflet)
- 🔍 **Filtres intelligents** : prix, recharge électrique, disponibilité
- 📅 **Réservation en temps réel** avec calendrier
- 💳 **Paiement sécurisé** via Stripe (simulation)
- 📱 **PWA** : Fonctionne hors-ligne, installable sur mobile

### Pour les Commerçants 🏪
- 📊 **Dashboard Host** avec statistiques (revenus, réservations)
- ➕ **CRUD complet** des places de parking
- 🔔 **Gestion des disponibilités** en temps réel
- 🛡️ **Authentification sécurisée** (email + Google OAuth)

### Sécurité & Fiabilité 🔒
- ✅ **Anti-surbooking** : Vérification capacité en temps réel
- ✅ **RLS Supabase** : Chaque utilisateur voit uniquement SES données
- ✅ **Tests E2E** : 12 scénarios Playwright pour garantir la qualité

---

## 🛠️ Stack Technique

### Frontend
| Technologie | Usage |
|-------------|-------|
| **React 19** | UI moderne avec hooks et concurrent features |
| **TypeScript** | Typage strict, zéro `any` |
| **Vite** | Build ultra-rapide, HMR instantané |
| **TailwindCSS v4** | Styling utility-first, design glassmorphism |
| **React Router v7** | Navigation SPA avec basename pour GitHub Pages |
| **Leaflet** | Cartographie interactive avec tuiles CARTO Dark |
| **Lucide React** | Icônes modernes et cohérentes |

### Backend & Infrastructure
| Technologie | Usage |
|-------------|-------|
| **Supabase** | PostgreSQL + Auth + Realtime |
| **Row Level Security** | Isolation des données par utilisateur |
| **PostgreSQL Functions** | Logique métier côté BDD (anti-surbooking) |
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
│  │   MapView   │  │  HostDash   │  │    BookingsList     │  │
│  │  (Leaflet)  │  │   (CRUD)    │  │   (Réservations)    │  │
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
│  │   Auth      │  │ PostgreSQL  │  │   Realtime API      │    │
│  │ (Email/GOAuth)│  │  (RLS)      │  │  (Subscriptions)    │    │
│  └─────────────┘  └──────┬──────┘  └─────────────────────┘    │
│                          │                                     │
│  ┌───────────────────────┴────────────────────────┐            │
│  │  Tables: profiles | hosts | bookings | feedback│            │
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

### 4. Lancer le serveur de développement

```bash
npm run dev
```

L'application est accessible sur `http://localhost:5173/pwascooter/`

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

### Configuration GitHub Actions

Voir `.github/workflows/deploy.yml`

---

## 🗺️ Schéma de Base de Données

```sql
-- Table des utilisateurs (RLS activé)
profiles
├── id: uuid (PK)
├── email: text
├── full_name: text
├── role: text ('user' | 'host' | null)
└── company_name: text

-- Table des places de parking (RLS activé)
hosts
├── id: uuid (PK)
├── owner_id: uuid → profiles.id
├── name: text
├── address: text
├── latitude: float8
├── longitude: float8
├── capacity: int4
├── price_per_hour: int4
├── has_charging: boolean
└── is_active: boolean

-- Table des réservations (RLS activé)
bookings
├── id: uuid (PK)
├── user_id: uuid → profiles.id
├── host_id: uuid → hosts.id
├── start_time: timestamptz
├── end_time: timestamptz
├── total_price: int4
└── status: enum ('pending', 'confirmed', 'cancelled', 'completed')
```

---

## 🎯 Roadmap

- [x] **Phase 1** : MVP avec carte et réservation
- [x] **Phase 2** : Interface Host complète
- [x] **Phase 3** : Tests E2E Playwright (12 scénarios)
- [ ] **Phase 4** : Intégration Stripe (paiement réel)
- [ ] **Phase 5** : Système de feedback utilisateur
- [ ] **Phase 6** : Application mobile native (React Native)

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
