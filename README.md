# SIOTUM — Antananarivo

Systeme Intelligent d'Optimisation des Transports Urbains a Madagascar.

## Structure

| Dossier | Description |
|---------|-------------|
| `backend/` | API Flask + PostgreSQL + algorithmes (Dijkstra, Yen) |
| `frontend/` | Interface web React (Vite) |
| `mobile/` | Application mobile Expo (React Native) |

## Demarrage rapide (web)

### 1. Base de donnees

PostgreSQL avec la base `siotum`. Executer une fois :

```bash
psql -U postgres -d siotum -f backend/init_db.sql
```

Configurer `backend/.env` (voir les valeurs par defaut dans `database.py`).

**Corriger les coordonnees GPS** (quartiers connus + OSM, puis regenerer le graphe) :

```powershell
cd backend
.\venv\Scripts\python.exe geocode_quartiers.py --fast
.\venv\Scripts\python.exe regenerate_connexions_db.py
# Redemarrer main.py ensuite
```

Pour un geocodage complet (Nominatim, lent ~1 req/s) : `geocode_quartiers.py` sans `--fast`.

### 2. Backend

```powershell
cd backend
.\venv\Scripts\python.exe main.py
```

API : http://127.0.0.1:5000 — test : http://127.0.0.1:5000/health

### 3. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Ouvrir http://localhost:5173

**Compte demo** : `admin@admin.com` / `admin123`

## Mobile

Voir [mobile/README.md](mobile/README.md).

## Endpoints utiles

- `GET /health` — etat du serveur
- `GET /stats` — nombre de quartiers et connexions
- `GET /nodes` — liste des quartiers
- `POST /login` — authentification JWT
