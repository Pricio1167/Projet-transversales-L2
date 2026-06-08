# SIOTUM Mobile

Application React Native (Expo) connectee au backend Flask du projet SIOTUM.

## Fonctionnalites

| Ecran | Description |
|-------|-------------|
| **Accueil** | Stats, historique, statut serveur, raccourcis |
| **Trajet** | Dijkstra + chemins alternatifs (Yen), alerte trafic |
| **Carte** | Itineraires OSRM + alternatives + trafic simule |
| **Graphe** | Chemin Dijkstra sur carte (reseau quartiers) |
| **Trafic** | Embouteillage sur rues voisines + impact trajet |
| **Performances** | Comparaison tas binaire vs Dijkstra simple |
| **Parametres** | URL API configurable (telephone physique) |

## Installation

```bash
cd mobile
npm install
```

## Configuration reseau

| Plateforme | URL par defaut |
|------------|----------------|
| Android emulateur | `http://10.0.2.2:5000` |
| iOS simulateur | `http://127.0.0.1:5000` |
| Telephone physique | IP du PC dans **Parametres** ou `.env` |

Copier `.env.example` vers `.env` sur telephone physique :

```
EXPO_PUBLIC_API_URL=http://192.168.1.42:5000
```

Ou configurer l'URL dans **Accueil → Parametres → Tester la connexion**.

Backend :

```bash
cd ../backend
.\venv\Scripts\python.exe main.py
```

## Lancement

```bash
npm start
```

- **Expo Go** : scanner le QR code
- **Android** : touche `a`
- **iOS** (Mac) : touche `i`

Compte demo : `admin@admin.com` / `admin123`

## Structure

```
mobile/
  App.js
  src/
    api.js              # Client API + stockage URL
    context/AuthContext.js
    navigation/RootNavigator.js
    components/         # QuartierPicker, CheminSteps, PrimaryButton
    screens/            # 8 ecrans
```
