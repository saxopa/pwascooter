# Fiche Technique : ScootSafe (pwascooter)

Ce document détaille les spécificités techniques et le contexte du projet "ScootSafe", une application web (PWA) permettant de trouver et de réserver des emplacements de stationnement sécurisés pour trottinettes électriques.

## 1. Vue d'Ensemble
- **But** : Plateforme de mise en relation entre des hôtes proposant des espaces de stockage et des utilisateurs de trottinettes.
- **Localisation cible** : Toulouse, France (centre-ville).
- **Stack Technique** :
    - **Frontend** : React 19, Vite, TypeScript.
    - **Style** : Tailwind CSS, Glassmorphism UI.
    - **Cartographie** : Leaflet & React-Leaflet (Tuiles CARTO Dark).
    - **Backend/Base de données** : Supabase (PostgreSQL + Auth).
    - **Paiement** : Stripe JS (Simulation implémentée).
    - **Icônes** : Lucide-React.

## 2. Structure du Projet
```text
pwascooter/
├── src/
│   ├── components/
│   │   └── MapView.tsx       # Composant principal (Carte + Logique métier)
│   ├── lib/
│   │   └── supabaseClient.ts # Configuration du client Supabase
│   ├── types/
│   │   └── supabase.ts       # Types générés depuis la base de données
│   ├── App.tsx               # Point d'entrée React
│   ├── main.tsx              # Initialisation Vite
│   └── index.css             # Design System & Variables CSS
├── public/                   # Assets statiques
├── .env                      # Variables d'environnement (URL/Clés Supabase)
└── package.json              # Dépendances et scripts
```

## 3. Modèle de Données (Supabase)

### Table `hosts` (Points de stationnement)
| Colonne | Type | Description |
| :--- | :--- | :--- |
| `id` | uuid (PK) | Identifiant unique de l'hôte. |
| `name` | text | Nom du lieu ou de l'hôte. |
| `latitude` | float8 | Position géographique (Y). |
| `longitude` | float8 | Position géographique (X). |
| `price_per_hour` | numeric | Tarif horaire en euros. |
| `capacity` | int4 | Nombre de places disponibles. |
| `has_charging` | bool | Si la recharge électrique est disponible. |

### Table `bookings` (Réservations)
| Colonne | Type | Description |
| :--- | :--- | :--- |
| `id` | uuid (PK) | Identifiant de la réservation. |
| `user_id` | uuid (FK) | Référence vers `profiles.id`. |
| `host_id` | uuid (FK) | Référence vers `hosts.id`. |
| `start_time` | timestamptz | Début de la réservation. |
| `end_time` | timestamptz | Fin prévue. |
| `total_price` | numeric | Prix total payé. |
| `status` | enum | `pending`, `active`, `completed`. |

### Table `profiles` (Utilisateurs)
| Colonne | Type | Description |
| :--- | :--- | :--- |
| `id` | uuid (PK) | Identifiant utilisateur (Auth UID). |
| `email` | text | Adresse email. |
| `nom` | text | Nom complet. |

## 4. Logique et Fonctions Clés

### Authentification
L'application utilise l'authentification **Anonyme** de Supabase pour permettre des tests rapides sans création de compte complexe.
- **Pseudo-code** :
```typescript
async function handleAnonymousLogin() {
    const { user, error } = await supabase.auth.signInAnonymously();
    if (user) { /* Update UI state */ }
}
```

### Chargement des Données
Les hôtes sont récupérés au chargement de la [MapView](file:///Users/alexis/Desktop/pwascooter/src/components/MapView.tsx#325-469).
- **Requête Supabase** : `supabase.from('hosts').select('*')`

### Flux de Réservation ([handleBook](file:///Users/alexis/Desktop/pwascooter/src/components/MapView.tsx#103-141))
Situé dans le composant [BottomSheet](file:///Users/alexis/Desktop/pwascooter/src/components/MapView.tsx#95-324), ce flux simule un paiement avant l'écriture en base.
1. **Simulation Paiement** : `await timeout(2000)` (Simule Stripe).
2. **Calcul Dates** : `startTime = now`, `endTime = startTime + selectedHours`.
3. **Insertion DB** :
```typescript
const { error } = await supabase.from('bookings').insert({
    user_id: user.id,
    host_id: host.id,
    status: 'active',
    total_price: host.price_per_hour * selectedHours,
    // ... dates
});
```

### Visualisation (Carte)
- Utilise des **DivIcons** personnalisées (Leaflet) contenant du markup React (SVG via Lucide).
- Effet "Fly-to" lors de la sélection d'un hôte pour centrer la vue à un niveau de zoom 16.

## 5. Spécificités UI/UX
- **Thème Sombre** : Fond `#0F0F1A`, accents violets (`#6C5CE7`) et turquoises (`#00CEC9`).
- **Glassmorphism** : Utilisation intensive de `backdrop-filter: blur()` et de bordures semi-transparentes.
- **Réactivité** : Conçu en "Mobile-First" avec support des `safe-area-inset` pour les terminaux mobiles (PWA).
