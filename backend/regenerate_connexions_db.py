# regenerate_connexions_db.py - Connexions + graphe connexe (tous quartiers relies)

import math
from collections import defaultdict
from psycopg2.extras import execute_values, RealDictCursor
from database import get_connection

TANA_BBOX = {"lat_min": -19.1, "lat_max": -18.7, "lon_min": 47.4, "lon_max": 47.7}


def in_bbox(lat, lon):
    return (
        TANA_BBOX["lat_min"] <= lat <= TANA_BBOX["lat_max"]
        and TANA_BBOX["lon_min"] <= lon <= TANA_BBOX["lon_max"]
    )


def distance_km(coord1, coord2):
    R = 6371
    lat1, lon1 = math.radians(coord1[0]), math.radians(coord1[1])
    lat2, lon2 = math.radians(coord2[0]), math.radians(coord2[1])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def build_adj(connexions):
    adj = defaultdict(set)
    pairs = set()
    for q1, q2, _ in connexions:
        adj[q1].add(q2)
        adj[q2].add(q1)
        pairs.add(tuple(sorted((q1, q2))))
    return adj, pairs


def find_components(noms, adj):
    seen = set()
    components = []
    for nom in noms:
        if nom in seen:
            continue
        stack = [nom]
        comp = set()
        while stack:
            n = stack.pop()
            if n in seen:
                continue
            seen.add(n)
            comp.add(n)
            for nb in adj.get(n, []):
                if nb not in seen:
                    stack.append(nb)
        components.append(comp)
    return components


def connect_isolated(quartiers, connexions, max_link_km=5.0):
    """Relie les quartiers sans aucune connexion."""
    adj, pairs = build_adj(connexions)
    added = 0
    noms = list(quartiers.keys())
    for nom in noms:
        if adj.get(nom):
            continue
        best, best_d = None, float("inf")
        for other in noms:
            if other == nom:
                continue
            d = distance_km(quartiers[nom], quartiers[other])
            if d < best_d:
                best_d, best = d, other
        if best and best_d <= max_link_km:
            key = tuple(sorted((nom, best)))
            if key not in pairs:
                connexions.append((nom, best, round(best_d, 3)))
                pairs.add(key)
                adj[nom].add(best)
                adj[best].add(nom)
                added += 1
    return added


def connect_components(quartiers, connexions, max_bridge_km=8.5):
    """Relie les composantes deconnectees (ex: Ivato / Antsahadinta)."""
    noms = list(quartiers.keys())
    added = 0
    while True:
        adj, pairs = build_adj(connexions)
        components = find_components(noms, adj)
        if len(components) <= 1:
            break

        best_pair = None
        best_d = float("inf")
        for i in range(len(components)):
            for j in range(i + 1, len(components)):
                for a in components[i]:
                    for b in components[j]:
                        d = distance_km(quartiers[a], quartiers[b])
                        if d < best_d:
                            best_d, best_pair = d, (a, b)

        if not best_pair or best_d > max_bridge_km:
            print(f"[WARN] Composantes non reliees (distance min {best_d:.2f} km > {max_bridge_km} km)")
            break

        a, b = best_pair
        key = tuple(sorted((a, b)))
        if key not in pairs:
            connexions.append((a, b, round(best_d, 3)))
            added += 1
            print(f"[INFO] Pont {a} <-> {b} ({best_d:.2f} km)")
    return added


def verify_connectivity(quartiers, connexions):
    adj, _ = build_adj(connexions)
    components = find_components(list(quartiers.keys()), adj)
    isoles = [n for n in quartiers if not adj.get(n)]
    return components, isoles


def main(max_distance_km=2.5):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT nom, latitude, longitude FROM quartiers ORDER BY nom")
            rows = cur.fetchall()

        quartiers = {}
        for r in rows:
            if r["latitude"] is None or r["longitude"] is None:
                continue
            la, lo = float(r["latitude"]), float(r["longitude"])
            if in_bbox(la, lo):
                quartiers[r["nom"]] = (la, lo)

        print(f"[INFO] {len(quartiers)} quartiers Antananarivo (bbox)")

        noms = list(quartiers.keys())
        connexions = []
        for i in range(len(noms)):
            for j in range(i + 1, len(noms)):
                q1, q2 = noms[i], noms[j]
                dist = distance_km(quartiers[q1], quartiers[q2])
                if dist <= max_distance_km:
                    connexions.append((q1, q2, round(dist, 3)))

        iso = connect_isolated(quartiers, connexions)
        bridges = connect_components(quartiers, connexions)
        if iso:
            print(f"[INFO] {iso} liaison(s) pour quartiers isoles")
        if bridges:
            print(f"[INFO] {bridges} pont(s) entre composantes")

        components, isoles = verify_connectivity(quartiers, connexions)
        print(f"[INFO] Composantes: {len(components)}, isoles: {len(isoles)}")

        with conn.cursor() as cur:
            cur.execute("DELETE FROM connexions")
            execute_values(
                cur,
                "INSERT INTO connexions (src, dest, distance) VALUES %s",
                connexions,
                page_size=1000,
            )
        conn.commit()
        print(f"[OK] {len(connexions)} connexions regenerees")
    except Exception as e:
        conn.rollback()
        print(f"[ERREUR] {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
