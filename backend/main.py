# main.py - Serveur Flask (API)

from flask import Flask, jsonify, request, Response
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, verify_jwt_in_request
from graph import create_antananarivo_graph, get_quartiers_with_coords
from dijkstra import dijkstra, comparer_performances
from yen import k_shortest_paths, verifier_route_dans_chemin, comparer_chemins
from routing_utils import classer_chemins_avec_trafic
from database import execute_query, execute_one
from database import test_connection
from auth import register_user, login_user
import json
import os
import requests
import csv
import io
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*", "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"], "allow_headers": ["Content-Type", "Authorization"]}}, supports_credentials=True)

app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "siotum_secret_key_2024")
jwt = JWTManager(app)

graph = create_antananarivo_graph()


def _ensure_db_schema():
    """Ajoute les colonnes role/blocked si la base a ete creee avant init_db.sql."""
    try:
        execute_query(
            "ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS blocked BOOLEAN DEFAULT FALSE"
        )
        execute_query(
            "ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'user'"
        )
    except Exception:
        pass


def _ensure_default_admin():
    try:
        _ensure_db_schema()
        existing = execute_one("SELECT id FROM utilisateurs WHERE email = %s", ("admin@admin.com",))
        if not existing:
            register_user("Administrateur", "admin@admin.com", "admin123", role="admin")
        else:
            execute_query(
                "UPDATE utilisateurs SET role = 'admin', blocked = FALSE WHERE email = %s",
                ("admin@admin.com",),
            )
    except Exception:
        pass


_ensure_default_admin()


def _is_user_blocked(user_id):
    try:
        row = execute_one("SELECT blocked FROM utilisateurs WHERE id = %s", (user_id,))
        return bool(row and row.get("blocked") is True)
    except Exception:
        return False


def _reset_trafic_edge(src, dest):
    """Restaure le poids d'une arete dans le graphe et desactive le trafic en base."""
    if graph.get_poids(src, dest) is None and graph.get_poids(dest, src) is not None:
        src, dest = dest, src
    graph.reset_edge_weight(src, dest)
    try:
        execute_query(
            "UPDATE trafic SET actif = FALSE WHERE src = %s AND dest = %s AND actif = TRUE",
            (src, dest),
        )
    except Exception:
        pass


@app.before_request
def _reject_blocked_users():
    if request.method == "OPTIONS":
        return None
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
        if user_id and _is_user_blocked(user_id):
            return jsonify({"erreur": "Compte bloque par l'administrateur"}), 403
    except Exception:
        pass
    return None


def _is_admin_user_id(user_id):
    """Vérifie si l'utilisateur a un rôle admin en base."""
    user = execute_one("SELECT role, email FROM utilisateurs WHERE id = %s", (user_id,))
    if not user:
        return False
    role = (user.get("role") or "").lower()
    if role:
        return role == "admin"
    return (user.get("email") or "").lower() == "admin@admin.com"

def _require_admin():
    user_id = get_jwt_identity()
    if not user_id or not _is_admin_user_id(user_id):
        return jsonify({"erreur": "Acces admin requis"}), 403
    return None

def _admin_id():
    return get_jwt_identity()

def _fetch_user_info(user_id):
    return execute_one(
        "SELECT id, nom, email, role FROM utilisateurs WHERE id = %s",
        (user_id,),
    )

def _audit(action, payload=None):
    """Enregistre une action admin (best effort)."""
    try:
        execute_query(
            "INSERT INTO admin_audit (admin_id, action, payload) VALUES (%s, %s, %s)",
            (_admin_id(), action, json.dumps(payload or {})),
        )
    except Exception:
        pass

def _csv_response(filename, rows, fieldnames):
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=fieldnames, extrasaction="ignore")
    w.writeheader()
    for r in rows:
        w.writerow({k: ("" if r.get(k) is None else r.get(k)) for k in fieldnames})
    data = buf.getvalue()
    return Response(
        data,
        mimetype="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def get_json():
    """Corps JSON de la requete (ou dict vide)."""
    return request.get_json(silent=True) or {}


# ==================== SANTE / STATS ====================

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "quartiers": len(graph.nodes),
        "connexions": len(graph.get_all_edges()),
    })


def _graph_connectivity_info():
    from collections import deque
    if not graph.nodes:
        return {"composantes": 0, "isoles": 0, "connexe": True}
    seen = set()
    components = 0
    isoles = 0
    for start in graph.nodes:
        if start in seen:
            continue
        components += 1
        stack = [start]
        comp_size = 0
        while stack:
            n = stack.pop()
            if n in seen:
                continue
            seen.add(n)
            comp_size += 1
            for nb, _ in graph.get_neighbors(n):
                if nb not in seen:
                    stack.append(nb)
        if comp_size == 1 and not graph.get_neighbors(start):
            isoles += 1
    return {
        "composantes": components,
        "isoles": isoles,
        "connexe": components == 1 and isoles == 0,
    }


@app.route('/stats', methods=['GET'])
def stats():
    conn_info = _graph_connectivity_info()
    return jsonify({
        "quartiers": len(graph.nodes),
        "connexions": len(graph.get_all_edges()),
        "graphe_connexe": conn_info["connexe"],
        "composantes": conn_info["composantes"],
        "quartiers_isoles": conn_info["isoles"],
    })


# ==================== AUTH ====================

@app.route('/register', methods=['POST'])
def register():
    data = get_json()
    nom = data.get('nom')
    email = data.get('email')
    password = data.get('password')
    if not nom or not email or not password:
        return jsonify({"erreur": "Tous les champs sont requis"}), 400
    user, erreur = register_user(nom, email, password)
    if erreur:
        return jsonify({"erreur": erreur}), 400
    token = create_access_token(identity=str(user['id']))
    return jsonify({"message": "Inscription réussie", "token": token, "user": user}), 201

@app.route('/login', methods=['POST'])
def login():
    data = get_json()
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({"erreur": "Email et mot de passe requis"}), 400
    user, erreur = login_user(email, password)
    if erreur:
        return jsonify({"erreur": erreur}), 401
    # Bloquage de compte (si la colonne existe)
    try:
        row = execute_one("SELECT blocked FROM utilisateurs WHERE id = %s", (user["id"],))
        if row and row.get("blocked") is True:
            return jsonify({"erreur": "Compte bloque par l'administrateur"}), 403
    except Exception:
        pass
    token = create_access_token(identity=str(user['id']))
    return jsonify({"message": "Connexion réussie", "token": token, "user": user}), 200

@app.route('/me', methods=['GET'])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = execute_one(
        "SELECT id, nom, email, role, created_at FROM utilisateurs WHERE id = %s",
        (user_id,)
    )
    if not user:
        return jsonify({"erreur": "Utilisateur introuvable"}), 404
    user['created_at'] = str(user['created_at'])
    user['role'] = (user.get('role') or 'user').lower()
    user['is_admin'] = user['role'] == 'admin' or (user.get('email') or '').lower() == 'admin@admin.com'
    return jsonify(user)

# ==================== ADMIN ====================

@app.route('/admin/overview', methods=['GET'])
@jwt_required()
def admin_overview():
    err = _require_admin()
    if err:
        return err

    users = execute_one("SELECT COUNT(*) AS n FROM utilisateurs") or {"n": 0}
    trajets = execute_one("SELECT COUNT(*) AS n FROM trajets") or {"n": 0}
    trafics = execute_one("SELECT COUNT(*) AS n FROM trafic WHERE actif = TRUE") or {"n": 0}
    stats_json = stats().get_json()

    return jsonify({
        "users": int(users.get("n", 0)),
        "trajets": int(trajets.get("n", 0)),
        "trafics_actifs": int(trafics.get("n", 0)),
        "stats": stats_json,
    })


@app.route('/admin/users', methods=['GET'])
@jwt_required()
def admin_users():
    err = _require_admin()
    if err:
        return err

    # Inclure "blocked" et "role" si disponibles
    try:
        rows = execute_query(
            "SELECT id, nom, email, role, blocked, created_at FROM utilisateurs ORDER BY created_at DESC LIMIT 200",
            fetch=True
        ) or []
    except Exception:
        rows = execute_query(
            "SELECT id, nom, email, created_at FROM utilisateurs ORDER BY created_at DESC LIMIT 200",
            fetch=True
        ) or []
    for r in rows:
        r["created_at"] = str(r.get("created_at"))
        role = (r.get("role") or "").lower()
        r["is_admin"] = role == "admin" or (r.get("email") or "").lower() == "admin@admin.com"
        r["blocked"] = bool(r.get("blocked")) if "blocked" in r else False
    return jsonify({"users": rows})


@app.route('/admin/trajets', methods=['GET'])
@jwt_required()
def admin_trajets():
    err = _require_admin()
    if err:
        return err

    rows = execute_query(
        """SELECT t.id, u.email, u.nom, t.depart, t.destination, t.distance, t.etapes, t.chemin, t.created_at
           FROM trajets t
           LEFT JOIN utilisateurs u ON u.id = t.utilisateur_id
           ORDER BY t.created_at DESC
           LIMIT 80""",
        fetch=True
    ) or []
    for r in rows:
        r["created_at"] = str(r.get("created_at"))
        if isinstance(r.get("chemin"), str):
            try:
                r["chemin"] = json.loads(r["chemin"])
            except Exception:
                pass
    return jsonify({"trajets": rows})


@app.route('/admin/trajets/<int:trajet_id>', methods=['DELETE'])
@jwt_required()
def admin_trajet_delete(trajet_id):
    """Annule/supprime un trajet enregistre."""
    err = _require_admin()
    if err:
        return err
    row = execute_one(
        "SELECT id, depart, destination FROM trajets WHERE id = %s",
        (trajet_id,),
    )
    if not row:
        return jsonify({"erreur": "Trajet introuvable"}), 404
    execute_query("DELETE FROM trajets WHERE id = %s", (trajet_id,))
    _audit(
        "trajet_delete",
        {"trajet_id": trajet_id, "depart": row["depart"], "destination": row["destination"]},
    )
    return jsonify({"message": "Trajet annule", "id": trajet_id})


@app.route('/admin/trafic', methods=['GET'])
@jwt_required()
def admin_trafic_list():
    err = _require_admin()
    if err:
        return err
    try:
        limit = int(request.args.get("limit", 100))
    except Exception:
        limit = 100
    limit = max(1, min(limit, 500))
    trafics = execute_query(
        """
        SELECT t.id, t.src, t.dest, t.poids_original, t.poids_actuel, t.actif, t.created_at,
               u.id AS utilisateur_id, u.nom AS utilisateur_nom, u.email AS utilisateur_email
        FROM trafic t
        LEFT JOIN utilisateurs u ON t.utilisateur_id = u.id
        WHERE t.actif = TRUE
        ORDER BY t.created_at DESC
        LIMIT %s
        """,
        (limit,),
        fetch=True,
    ) or []
    for t in trafics:
        t["created_at"] = str(t.get("created_at"))
    return jsonify({"trafics": trafics})


@app.route('/admin/trafic/clear', methods=['POST'])
@jwt_required()
def admin_trafic_clear():
    err = _require_admin()
    if err:
        return err

    try:
        active = execute_query(
            "SELECT id, src, dest FROM trafic WHERE actif = TRUE",
            fetch=True,
        ) or []
        for t in active:
            _reset_trafic_edge(t["src"], t["dest"])
        execute_query("UPDATE trafic SET actif = FALSE WHERE actif = TRUE")
    except Exception:
        pass
    _audit("trafic_clear_all", {})
    return jsonify({"message": "Tous les trafics ont ete desactives et le graphe restaure"})


@app.route('/admin/trafic/<int:id>', methods=['DELETE'])
@jwt_required()
def admin_trafic_delete(id):
    err = _require_admin()
    if err:
        return err

    try:
        row = execute_one("SELECT id, src, dest FROM trafic WHERE id = %s", (id,))
        if not row:
            return jsonify({"erreur": "Trafic introuvable"}), 404
        _reset_trafic_edge(row["src"], row["dest"])
        execute_query("DELETE FROM trafic WHERE id = %s", (id,))
        _audit("trafic_delete", {"trafic_id": id, "src": row["src"], "dest": row["dest"]})
        return jsonify({"message": "Trafic supprime et graphe restaure", "id": id})
    except Exception as e:
        return jsonify({"erreur": f"Erreur lors de la suppression: {str(e)}"}), 500

@app.route('/admin/graph/reload', methods=['POST'])
@jwt_required()
def admin_graph_reload():
    err = _require_admin()
    if err:
        return err

    global graph
    try:
        graph = create_antananarivo_graph()
        _audit("graph_reload", {"quartiers": len(graph.nodes), "connexions": len(graph.get_all_edges())})
        return jsonify({
            "message": "Graphe recharge",
            "quartiers": len(graph.nodes),
            "connexions": len(graph.get_all_edges()),
        })
    except Exception as e:
        return jsonify({"erreur": f"Impossible de recharger le graphe: {str(e)}"}), 500


@app.route('/admin/db/health', methods=['GET'])
@jwt_required()
def admin_db_health():
    err = _require_admin()
    if err:
        return err
    ok = False
    try:
        ok = test_connection()
    except Exception:
        ok = False
    return jsonify({"ok": bool(ok)})


@app.route('/admin/data/clear', methods=['POST'])
@jwt_required()
def admin_data_clear():
    """
    Nettoyage admin: efface des tables (optionnel) sans casser le schéma.
    Body: { tables: ["trajets","performances","trafic","recherches_alternatives"] }
    """
    err = _require_admin()
    if err:
        return err

    data = get_json()
    tables = data.get("tables") or []
    allowed = {
        "trajets": "trajets",
        "performances": "performances",
        "trafic": "trafic",
        "recherches_alternatives": "recherches_alternatives",
    }
    cleared = []
    for t in tables:
        name = allowed.get(t)
        if not name:
            continue
        try:
            if name == "trafic":
                active = execute_query(
                    "SELECT src, dest FROM trafic WHERE actif = TRUE",
                    fetch=True,
                ) or []
                for edge in active:
                    _reset_trafic_edge(edge["src"], edge["dest"])
            execute_query(f"DELETE FROM {name}")
            cleared.append(name)
        except Exception:
            pass
    if "trafic" in cleared:
        global graph
        graph = create_antananarivo_graph()
    _audit("data_clear", {"tables": cleared})
    return jsonify({"message": "Nettoyage termine", "cleared": cleared})


@app.route('/admin/users/<int:user_id>/purge', methods=['POST'])
@jwt_required()
def admin_user_purge(user_id):
    """Supprime les donnees (trajets/perfs/trafic) d'un utilisateur."""
    err = _require_admin()
    if err:
        return err

    # Empêche de purger un compte admin
    u = _fetch_user_info(user_id)
    role = (u.get("role") or "").lower() if u else ""
    if role == "admin" or (u and (u.get("email") or "").lower() == "admin@admin.com"):
        return jsonify({"erreur": "Operation interdite sur le compte admin"}), 400

    deleted = {"trajets": 0, "performances": 0, "trafic": 0, "recherches_alternatives": 0}
    try:
        r = execute_query("DELETE FROM trajets WHERE utilisateur_id = %s RETURNING id", (user_id,), fetch=True)
        deleted["trajets"] = len(r or [])
    except Exception:
        pass
    try:
        r = execute_query("DELETE FROM performances WHERE utilisateur_id = %s RETURNING id", (user_id,), fetch=True)
        deleted["performances"] = len(r or [])
    except Exception:
        pass
    try:
        r = execute_query("DELETE FROM trafic WHERE utilisateur_id = %s RETURNING id", (user_id,), fetch=True)
        deleted["trafic"] = len(r or [])
    except Exception:
        pass
    try:
        r = execute_query("DELETE FROM recherches_alternatives WHERE utilisateur_id = %s RETURNING id", (user_id,), fetch=True)
        deleted["recherches_alternatives"] = len(r or [])
    except Exception:
        pass

    _audit("user_purge", {"user_id": user_id, "deleted": deleted})
    return jsonify({"message": "Purge terminee", "deleted": deleted})


@app.route('/admin/users/<int:user_id>/block', methods=['POST'])
@jwt_required()
def admin_user_block(user_id):
    """Bloque/debloque un compte (nécessite colonne blocked)."""
    err = _require_admin()
    if err:
        return err
    data = get_json()
    blocked = bool(data.get("blocked"))

    u = execute_one("SELECT role, email FROM utilisateurs WHERE id = %s", (user_id,))
    role = (u.get("role") or "").lower() if u else ""
    if role == "admin" or (u and (u.get("email") or "").lower() == "admin@admin.com"):
        return jsonify({"erreur": "Operation interdite sur le compte admin"}), 400

    try:
        execute_query("UPDATE utilisateurs SET blocked = %s WHERE id = %s", (blocked, user_id))
        _audit("user_block", {"user_id": user_id, "blocked": blocked})
        return jsonify({"message": "Utilisateur mis a jour", "user_id": user_id, "blocked": blocked})
    except Exception:
        return jsonify({"erreur": "Colonne 'blocked' manquante. Rejoue init_db.sql ou ajoute la colonne."}), 500


@app.route('/admin/users/<int:user_id>/role', methods=['POST'])
@jwt_required()
def admin_user_role(user_id):
    err = _require_admin()
    if err:
        return err
    data = get_json()
    role = (data.get("role") or "").lower()
    if role not in ("user", "admin"):
        return jsonify({"erreur": "Role invalide. Utilisez 'user' ou 'admin'."}), 400

    current = _fetch_user_info(user_id)
    if not current:
        return jsonify({"erreur": "Utilisateur introuvable."}), 404
    if (current.get("email") or "").lower() == "admin@admin.com":
        return jsonify({"erreur": "Impossible de modifier le compte admin principal."}), 400
    if str(user_id) == get_jwt_identity():
        return jsonify({"erreur": "Impossible de changer votre propre role depuis cette page."}), 400

    try:
        execute_query("UPDATE utilisateurs SET role = %s WHERE id = %s", (role, user_id))
        _audit("user_role_change", {"user_id": user_id, "role": role})
        return jsonify({"message": "Role mis à jour", "user_id": user_id, "role": role})
    except Exception as e:
        return jsonify({"erreur": f"Impossible de mettre à jour le rôle: {str(e)}"}), 500


@app.route('/admin/audit', methods=['GET'])
@jwt_required()
def admin_audit():
    err = _require_admin()
    if err:
        return err
    try:
        limit = int(request.args.get("limit", 50))
    except Exception:
        limit = 50
    limit = max(1, min(limit, 200))
    rows = execute_query(
        """SELECT a.id, a.action, a.payload, a.created_at, u.email
           FROM admin_audit a
           LEFT JOIN utilisateurs u ON u.id = a.admin_id
           ORDER BY a.created_at DESC
           LIMIT %s""",
        (limit,),
        fetch=True,
    ) or []
    for r in rows:
        r["created_at"] = str(r.get("created_at"))
        # payload peut être dict (RealDictCursor) ou str selon driver/config
        try:
            if isinstance(r.get("payload"), str):
                r["payload"] = json.loads(r["payload"])
        except Exception:
            pass
    return jsonify({"events": rows})


@app.route('/admin/export/users.csv', methods=['GET'])
@jwt_required()
def admin_export_users():
    err = _require_admin()
    if err:
        return err
    try:
        rows = execute_query(
            "SELECT id, nom, email, role, blocked, created_at FROM utilisateurs ORDER BY created_at DESC",
            fetch=True,
        ) or []
    except Exception:
        rows = execute_query(
            "SELECT id, nom, email, blocked, created_at FROM utilisateurs ORDER BY created_at DESC",
            fetch=True,
        ) or []
    for r in rows:
        r["created_at"] = str(r.get("created_at"))
    fieldnames = ["id", "nom", "email", "blocked", "created_at"]
    if rows and "role" in rows[0]:
        fieldnames.insert(3, "role")
    _audit("export_csv", {"type": "users", "rows": len(rows)})
    return _csv_response("users.csv", rows, fieldnames)


@app.route('/admin/export/trajets.csv', methods=['GET'])
@jwt_required()
def admin_export_trajets():
    err = _require_admin()
    if err:
        return err
    rows = execute_query(
        """SELECT t.id, u.email, u.nom, t.depart, t.destination, t.distance, t.etapes, t.created_at
           FROM trajets t
           LEFT JOIN utilisateurs u ON u.id = t.utilisateur_id
           ORDER BY t.created_at DESC""",
        fetch=True,
    ) or []
    for r in rows:
        r["created_at"] = str(r.get("created_at"))
    _audit("export_csv", {"type": "trajets", "rows": len(rows)})
    return _csv_response(
        "trajets.csv",
        rows,
        ["id", "email", "nom", "depart", "destination", "distance", "etapes", "created_at"],
    )


@app.route('/admin/export/trafic.csv', methods=['GET'])
@jwt_required()
def admin_export_trafic():
    err = _require_admin()
    if err:
        return err
    rows = execute_query(
        """SELECT id, utilisateur_id, src, dest, poids_original, poids_actuel, actif, created_at
           FROM trafic
           ORDER BY created_at DESC""",
        fetch=True,
    ) or []
    for r in rows:
        r["created_at"] = str(r.get("created_at"))
    _audit("export_csv", {"type": "trafic", "rows": len(rows)})
    return _csv_response(
        "trafic.csv",
        rows,
        ["id", "utilisateur_id", "src", "dest", "poids_original", "poids_actuel", "actif", "created_at"],
    )

# ==================== GRAPHE ====================

@app.route('/nodes', methods=['GET'])
def get_nodes():
    """Meme liste que les quartiers affichables sur la carte (coords Antananarivo)."""
    # Si la base a plus de connexions que le graphe en memoire, on resynchronise.
    _refresh_graph_if_globally_stale()
    quartiers = get_quartiers_with_coords()
    return jsonify({"nodes": sorted(quartiers.keys())})


def _db_neighbors_count(node):
    """Nombre de liaisons d'un quartier en base (source ou destination)."""
    try:
        row = execute_one(
            "SELECT COUNT(*) AS n FROM connexions WHERE src = %s OR dest = %s",
            (node, node),
        )
        return int(row.get("n", 0)) if row else 0
    except Exception:
        return 0


def _refresh_graph_if_stale(node):
    """
    Recharge le graphe en memoire si la base contient des connexions pour `node`
    mais le graphe courant n'en a pas (backend non redemarre / graphe stale).
    """
    global graph
    db_count = _db_neighbors_count(node)
    if db_count > 0 and (node not in graph.nodes or not graph.get_neighbors(node)):
        graph = create_antananarivo_graph()
        return True
    return False


def _refresh_graph_if_globally_stale():
    """Recharge le graphe si le volume de connexions en base diffère du graphe mémoire."""
    global graph
    try:
        row = execute_one("SELECT COUNT(*) AS n FROM connexions")
        db_count = int(row.get("n", 0)) if row else 0
    except Exception:
        return False
    mem_count = len(graph.get_all_edges()) if graph else 0
    if db_count > 0 and db_count != mem_count:
        graph = create_antananarivo_graph()
        return True
    return False


def _valider_quartiers_trajet(depart, destination):
    """Verifie depart/destination (coords + graphe). Retourne (None, erreur_json) si invalide."""
    quartiers = get_quartiers_with_coords()
    if depart not in quartiers:
        return None, (jsonify({
            "erreur": f"Quartier « {depart} » introuvable. Choisissez un quartier de la liste Antananarivo."
        }), 404)
    if destination not in quartiers:
        return None, (jsonify({
            "erreur": f"Quartier « {destination} » introuvable. Choisissez un quartier de la liste Antananarivo."
        }), 404)

    # Auto-reload du graphe si la base a ete mise a jour apres demarrage backend.
    _refresh_graph_if_stale(depart)
    _refresh_graph_if_stale(destination)

    if depart not in graph.nodes:
        return None, (jsonify({"erreur": f"« {depart} » n'est pas dans le reseau routier."}), 404)
    if destination not in graph.nodes:
        return None, (jsonify({"erreur": f"« {destination} » n'est pas dans le reseau routier."}), 404)
    if not graph.get_neighbors(depart):
        # Derniere tentative de refresh au cas ou les connexions viennent d'etre regenerees.
        _refresh_graph_if_stale(depart)
    if not graph.get_neighbors(depart):
        return None, (jsonify({
            "erreur": f"« {depart} » n'a aucune route connectee. Relancez regenerate_connexions_db.py."
        }), 404)
    if not graph.get_neighbors(destination):
        _refresh_graph_if_stale(destination)
    if not graph.get_neighbors(destination):
        return None, (jsonify({
            "erreur": f"« {destination} » n'a aucune route connectee. Relancez regenerate_connexions_db.py."
        }), 404)
    return quartiers, None

@app.route('/quartiers', methods=['GET'])
def get_quartiers():
    _refresh_graph_if_globally_stale()
    quartiers = get_quartiers_with_coords()
    try:
        connexions = execute_query("SELECT src, dest, distance FROM connexions", fetch=True)
    except Exception:
        connexions = [
            {"src": e["src"], "dest": e["dest"], "distance": e["distance"]}
            for e in graph.get_all_edges()
        ]
    return jsonify({"quartiers": quartiers, "connexions": connexions or []})

# ==================== TRAJETS ====================

@app.route('/chemin', methods=['POST'])
@jwt_required()
def calculer_chemin():
    user_id = get_jwt_identity()
    data = get_json()
    depart = data.get('depart')
    destination = data.get('destination')
    if not depart or not destination:
        return jsonify({"erreur": "Veuillez entrer un départ et une destination"}), 400
    _, err = _valider_quartiers_trajet(depart, destination)
    if err:
        return err
    if depart == destination:
        return jsonify({"erreur": "Le départ et la destination sont identiques"}), 400
    chemin, distance = dijkstra(graph, depart, destination)
    if chemin is None:
        return jsonify({"erreur": "Aucun chemin trouvé"}), 404
    try:
        execute_query("""INSERT INTO trajets (utilisateur_id, depart, destination, chemin, distance, etapes)
            VALUES (%s, %s, %s, %s, %s, %s)""",
            (user_id, depart, destination, json.dumps(chemin), distance, len(chemin) - 1))
    except Exception:
        pass
    return jsonify({"chemin": chemin, "distance": round(distance, 3), "etapes": len(chemin) - 1})

@app.route('/chemin/alternatifs', methods=['POST'])
@jwt_required()
def calculer_chemins_alternatifs():
    user_id = get_jwt_identity()
    try:
        user_id = int(user_id)
    except Exception:
        user_id = None

    data = get_json()
    depart = data.get('depart')
    destination = data.get('destination')
    route_embouteillee = data.get('route_embouteillee')
    k = data.get('k', 3)
    if not depart or not destination:
        return jsonify({"erreur": "Veuillez entrer un départ et une destination"}), 400
    _, err = _valider_quartiers_trajet(depart, destination)
    if err:
        return err
    analyses, trafic_edges, recommandation = classer_chemins_avec_trafic(
        graph, depart, destination, min(k, 5)
    )
    if not analyses:
        return jsonify({"erreur": "Aucun chemin trouvé"}), 404

    alerte = None
    if route_embouteillee:
        src, dest = route_embouteillee
        est_dans_chemin, position = verifier_route_dans_chemin(analyses[0]["chemin"], (src, dest))
        if est_dans_chemin:
            alerte = {
                "message": f"Embouteillage simule sur {src} -> {dest} (etape {position + 1}).",
                "route": route_embouteillee,
                "position": position,
            }

    # Sauvegarde du trajet calcule pour histoire / admin
    meilleur = analyses[0]
    if user_id is not None:
        try:
            execute_query(
                """INSERT INTO trajets (utilisateur_id, depart, destination, chemin, distance, etapes)
                VALUES (%s, %s, %s, %s, %s, %s)""",
                (user_id, depart, destination, json.dumps(meilleur["chemin"]), meilleur["distance"], len(meilleur["chemin"]) - 1)
            )
        except Exception:
            pass

    resultats = analyses
    k_chemins_pairs = [(a["chemin"], a["distance"]) for a in analyses]
    comparaison = comparer_chemins(k_chemins_pairs)

    trafic_actif = graph.get_edge_with_trafic()

    return jsonify({
        "chemins": resultats,
        "nb_chemins": len(resultats),
        "meilleur": resultats[0],
        "comparaison": comparaison,
        "alerte": alerte,
        "recommandation": recommandation,
        "trafic_actif": trafic_actif,
        "conseil": recommandation["message"] if recommandation else None,
    })

@app.route('/historique', methods=['GET'])
@jwt_required()
def historique():
    user_id = get_jwt_identity()
    try:
        trajets = execute_query("""SELECT id, depart, destination, chemin, distance, etapes, created_at 
            FROM trajets WHERE utilisateur_id = %s ORDER BY created_at DESC LIMIT 20""", (user_id,), fetch=True)
        for t in trajets:
            t['chemin'] = json.loads(t['chemin']) if isinstance(t['chemin'], str) else t['chemin']
            t['created_at'] = str(t['created_at'])
        return jsonify({"trajets": trajets})
    except Exception:
        return jsonify({"trajets": []})

# ==================== PERFORMANCES ====================

@app.route('/performances', methods=['POST'])
@jwt_required()
def performances():
    user_id = get_jwt_identity()
    data = get_json()
    depart = data.get('depart')
    destination = data.get('destination')
    if not depart or not destination:
        return jsonify({"erreur": "Depart et destination requis"}), 400
    _, err = _valider_quartiers_trajet(depart, destination)
    if err:
        return err
    resultats = comparer_performances(graph, depart, destination)
    if not resultats.get('chemin'):
        return jsonify({"erreur": "Aucun chemin trouve"}), 404
    try:
        execute_query("""INSERT INTO performances (utilisateur_id, depart, destination, temps_tas_binaire, temps_sans_tas, distance)
            VALUES (%s, %s, %s, %s, %s, %s)""",
            (user_id, depart, destination, resultats['temps_tas_binaire_ms'], resultats['temps_sans_tas_ms'], resultats['distance']))
    except Exception:
        pass
    return jsonify(resultats)

# ==================== TRAFIC ====================

@app.route('/trafic', methods=['POST'])
# For local testing we allow public access; in production restore @jwt_required()
def simuler_trafic():
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
    except Exception:
        user_id = None
    data = get_json()
    src = data.get('src')
    dest = data.get('dest')
    nouveau_poids = data.get('poids')
    if not src or not dest or nouveau_poids is None:
        return jsonify({"erreur": "Données manquantes"}), 400
    quartiers_coords = get_quartiers_with_coords()
    for label, nom in (("Source", src), ("Destination", dest)):
        if nom not in quartiers_coords:
            return jsonify({"erreur": f"{label} « {nom} » introuvable dans Antananarivo."}), 404
        if nom not in graph.nodes:
            return jsonify({"erreur": f"{label} « {nom} » absent du reseau."}), 404

    poids_original = graph.get_poids(src, dest)
    if poids_original is None:
        poids_original = graph.get_poids(dest, src)
        if poids_original is None:
            chemin, _ = dijkstra(graph, src, dest)
            if chemin and len(chemin) > 1:
                return jsonify({
                    "erreur": (
                        f"Pas de route directe entre « {src} » et « {dest} ». "
                        f"Le trafic simule une rue : choisissez deux quartiers voisins "
                        f"(1 etape). Chemin actuel : {' → '.join(chemin[:6])}"
                        f"{' → …' if len(chemin) > 6 else ''} ({len(chemin) - 1} etapes)."
                    )
                }), 404
            return jsonify({
                "erreur": (
                    f"Aucune liaison routiere entre « {src} » et « {dest} ». "
                    "Relancez regenerate_connexions_db.py ou choisissez d'autres quartiers."
                )
            }), 404
        src, dest = dest, src
    graph.update_edge_weight(src, dest, float(nouveau_poids))
    try:
        execute_query("""INSERT INTO trafic (utilisateur_id, src, dest, poids_original, poids_actuel)
            VALUES (%s, %s, %s, %s, %s)""", (user_id, src, dest, poids_original, nouveau_poids))
    except Exception:
        pass
    return jsonify({
        "message": f"Trafic simule sur {src} -> {dest}",
        "src": src, 
        "dest": dest, 
        "poids_original": poids_original, 
        "poids_actuel": nouveau_poids,
        "success": True
    })

@app.route('/trafic/simuler-avance', methods=['POST'])
# For local testing we allow public access; in production restore @jwt_required()
def simuler_trafic_avance():
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
    except Exception:
        user_id = None
    data = get_json()
    src = data.get('src')
    dest = data.get('dest')
    nouveau_poids = data.get('poids')
    depart = data.get('depart')
    destination = data.get('destination')
    
    if not src or not dest or nouveau_poids is None:
        return jsonify({"erreur": "Données manquantes"}), 400
    
    # Vérifier si la route existe
    poids_original = graph.get_poids(src, dest)
    if poids_original is None:
        poids_original = graph.get_poids(dest, src)
        if poids_original is None:
            return jsonify({"erreur": f"Route '{src} → {dest}' introuvable"}), 404
        else:
            src, dest = dest, src
    
    # Appliquer le nouveau poids
    graph.update_edge_weight(src, dest, float(nouveau_poids))
    
    # Sauvegarder en base
    execute_query("""INSERT INTO trafic (utilisateur_id, src, dest, poids_original, poids_actuel)
        VALUES (%s, %s, %s, %s, %s)""", (user_id, src, dest, poids_original, nouveau_poids))
    
    resultat = {
        "success": True,
        "message": f"Trafic simulé sur {src} → {dest}",
        "trafic_applique": {
            "src": src, 
            "dest": dest, 
            "poids_original": poids_original, 
            "poids_actuel": nouveau_poids
        }
    }
    
    # Si un trajet est spécifié, analyser l'impact
    if depart and destination:
        _, err = _valider_quartiers_trajet(depart, destination)
        if err:
            resultat["erreur_trajet"] = err[0].get_json().get("erreur", "Trajet invalide")
        else:
            chemin_actuel, distance_actuelle = dijkstra(graph, depart, destination)
            if chemin_actuel:
                est_dans_chemin, position = verifier_route_dans_chemin(chemin_actuel, (src, dest))
                if est_dans_chemin:
                    resultat["alerte"] = {
                        "type": "embouteillage_sur_trajet",
                        "message": f"⚠️ ATTENTION ! L'embouteillage sur {src} → {dest} affecte votre trajet actuel !",
                        "route_impactee": f"{src} → {dest}",
                        "position_etape": position + 1
                    }
                    # Chercher des alternatives
                    k_chemins = k_shortest_paths(graph, depart, destination, 3)
                    if k_chemins and len(k_chemins) > 1:
                        alternatives = []
                        for chemin, distance in k_chemins[1:]:
                            alternatives.append({
                                "chemin": chemin, 
                                "distance": distance, 
                                "difference": round(distance - k_chemins[0][1], 2)
                            })
                        resultat["alternatives"] = {
                            "meilleur_alternatif": alternatives[0] if alternatives else None,
                            "tous_les_chemins": alternatives
                        }
                        resultat["recommendation"] = k_chemins[0][0]
                else:
                    resultat["info"] = {
                        "message": f"L'embouteillage sur {src} → {dest} n'affecte pas votre trajet actuel."
                    }
                resultat["trajet_actuel"] = {
                    "chemin": chemin_actuel,
                    "distance": distance_actuelle,
                    "etapes": len(chemin_actuel) - 1
                }
            else:
                resultat["erreur_trajet"] = "Aucun chemin trouvé entre départ et destination"
    
    return jsonify(resultat)

@app.route('/trafic/actif', methods=['GET'])
def get_trafic_actif():
    trafics = execute_query(
        """
        SELECT t.id, t.src, t.dest, t.poids_original, t.poids_actuel, t.created_at,
               u.id AS utilisateur_id, u.nom AS utilisateur_nom, u.email AS utilisateur_email, u.role AS utilisateur_role
        FROM trafic t
        LEFT JOIN utilisateurs u ON t.utilisateur_id = u.id
        WHERE t.actif = TRUE
        ORDER BY t.created_at DESC
        LIMIT 20
        """,
        fetch=True,
    ) or []
    for t in trafics:
        t['created_at'] = str(t['created_at'])
    return jsonify({"trafics": trafics})

@app.route('/trafic/reset', methods=['POST'])
@jwt_required()
def reset_trafic():
    data = get_json()
    src = data.get('src')
    dest = data.get('dest')
    if src and dest:
        _reset_trafic_edge(src, dest)
        return jsonify({"message": f"Route {src} → {dest} restaurée"})
    return jsonify({"erreur": "Paramètres manquants"}), 400

# ==================== ITINÉRAIRE ROUTIER (OSRM) ====================

@app.route('/itineraire', methods=['POST'])
# For local testing we allow public access; in production restore @jwt_required()
def get_itineraire_routier():
    """Calcule le vrai trajet routier via OSRM"""
    data = get_json()
    depart = data.get('depart')
    destination = data.get('destination')

    if not depart or not destination:
        return jsonify({"erreur": "Depart et destination requis"}), 400

    quartiers = get_quartiers_with_coords()
    if depart not in quartiers or destination not in quartiers:
        return jsonify({"erreur": "Quartier introuvable"}), 404
    
    coords_depart = quartiers[depart]
    coords_dest = quartiers[destination]
    
    # OSRM attend longitude,latitude
    osrm_url = f"http://router.project-osrm.org/route/v1/driving/{coords_depart[1]},{coords_depart[0]};{coords_dest[1]},{coords_dest[0]}?overview=full&geometries=geojson&alternatives=true&steps=true"
    
    try:
        response = requests.get(osrm_url, timeout=10)
        data = response.json()
        
        if data.get('code') == 'Ok':
            routes = []
            for i, route in enumerate(data.get('routes', [])):
                # Extraire les coordonnées [lat, lon]
                coords = route['geometry']['coordinates']
                route_coords = [[coord[1], coord[0]] for coord in coords]
                
                steps = []
                modifier_map = {
                    'uturn': 'Demi-tour',
                    'sharp right': 'Tournez fortement à droite',
                    'right': 'Tournez à droite',
                    'slight right': 'Tournez légèrement à droite',
                    'sharp left': 'Tournez fortement à gauche',
                    'left': 'Tournez à gauche',
                    'slight left': 'Tournez légèrement à gauche',
                    'straight': 'Continuez tout droit',
                    'depart': 'Départ',
                    'arrive': 'Arrivée',
                }
                for leg in route.get('legs', []):
                    for step in leg.get('steps', []):
                        maneuver = step.get('maneuver', {})
                        modifier = maneuver.get('modifier')
                        name = step.get('name') or ''
                        direction = modifier_map.get(modifier, modifier or 'Continuez')
                        if name:
                            if maneuver.get('type') == 'arrive':
                                instruction = f"Arrivée à {name}."
                            elif maneuver.get('type') == 'depart':
                                instruction = f"Départ sur {name}."
                            else:
                                instruction = f"{direction} sur {name}."
                        else:
                            instruction = direction + '.'
                        steps.append({
                            'instruction': instruction,
                            'distance': round(step.get('distance', 0) / 1000, 3),
                            'duree': round(step.get('duration', 0) / 60, 1),
                            'name': name,
                        })
                
                routes.append({
                    "id": i,
                    "chemin": route_coords,
                    "distance": round(route['distance'] / 1000, 2),  # km
                    "duree": round(route['duration'] / 60, 1),    # minutes
                    "est_optimal": i == 0,
                    "summary": route.get('summary'),
                    "steps": steps,
                })
            
            return jsonify({
                "success": True,
                "depart": depart,
                "destination": destination,
                "routes": routes,
                "meilleur": routes[0] if routes else None
            })
        else:
            return jsonify({"erreur": "Aucun itinéraire trouvé", "code": data.get('code')}), 404
    except requests.exceptions.RequestException as e:
        return jsonify({"erreur": f"Erreur de connexion à OSRM: {str(e)}"}), 500


@app.route('/itineraire/waypoints', methods=['POST'])
def get_itineraire_waypoints():
    """
    Calcule la geometrie routiere reelle via OSRM pour une liste de quartiers (waypoints).
    Utile pour tracer les chemins alternatifs en suivant les vraies rues.
    Body: { "quartiers": ["Analakely", "Isoraka", "Andohalo"] }
    """
    data = get_json()
    noms = data.get('quartiers') or []
    if len(noms) < 2:
        return jsonify({"erreur": "Au moins 2 quartiers requis"}), 400

    quartiers_coords = get_quartiers_with_coords()
    coords_list = []
    for nom in noms:
        c = quartiers_coords.get(nom)
        if not c:
            return jsonify({"erreur": f"Quartier introuvable : {nom}"}), 404
        coords_list.append(c)

    # Construire la chaine de waypoints OSRM (lon,lat)
    waypoints_str = ";".join(f"{c[1]},{c[0]}" for c in coords_list)
    osrm_url = (
        f"http://router.project-osrm.org/route/v1/driving/{waypoints_str}"
        "?overview=full&geometries=geojson"
    )
    try:
        resp = requests.get(osrm_url, timeout=10)
        d = resp.json()
        if d.get('code') == 'Ok' and d.get('routes'):
            route = d['routes'][0]
            geom = [[c[1], c[0]] for c in route['geometry']['coordinates']]
            return jsonify({
                "success": True,
                "chemin": geom,
                "distance": round(route['distance'] / 1000, 2),
                "duree": round(route['duration'] / 60, 1),
            })
        return jsonify({"erreur": "OSRM n'a pas trouve d'itineraire", "fallback": True}), 404
    except requests.exceptions.RequestException:
        return jsonify({"erreur": "OSRM inaccessible", "fallback": True}), 503


# For local testing we allow public access; in production restore @jwt_required()
def get_trafic_edges():
    """Retourne toutes les routes qui ont du trafic"""
    trafic_edges = graph.get_edge_with_trafic()
    return jsonify({"trafics": trafic_edges})


@app.route('/chemin/suggestions', methods=['POST'])
@jwt_required()
def chemin_suggestions():
    """Chemins classes avec recommandation anti-trafic."""
    data = get_json()
    depart = data.get('depart')
    destination = data.get('destination')
    k = data.get('k', 5)
    if not depart or not destination:
        return jsonify({"erreur": "Depart et destination requis"}), 400
    _, err = _valider_quartiers_trajet(depart, destination)
    if err:
        return err
    analyses, _, recommandation = classer_chemins_avec_trafic(
        graph, depart, destination, min(k, 5)
    )
    if not analyses:
        return jsonify({"erreur": "Aucun chemin trouve"}), 404
    return jsonify({
        "chemins": analyses,
        "recommandation": recommandation,
        "trafic_actif": graph.get_edge_with_trafic(),
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
# test
