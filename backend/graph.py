# graph.py - Graphe basé sur les données PostgreSQL

import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", 5432)),
    "database": os.getenv("DB_NAME", "siotum"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "Pricio")
}

class Graph:
    def __init__(self):
        self.nodes = set()
        self.edges = {}
        self.original_weights = {}

    def add_node(self, node):
        self.nodes.add(node)
        if node not in self.edges:
            self.edges[node] = []

    def add_edge(self, src, dest, weight):
        self.add_node(src)
        self.add_node(dest)
        self.edges[src].append((dest, weight))
        self.edges[dest].append((src, weight))
        self.original_weights[(src, dest)] = weight
        self.original_weights[(dest, src)] = weight

    def get_neighbors(self, node):
        return self.edges.get(node, [])

    def get_poids(self, src, dest):
        for voisin, poids in self.edges.get(src, []):
            if voisin == dest:
                return poids
        return None

    def update_edge_weight(self, src, dest, new_weight):
        for i, (neighbor, weight) in enumerate(self.edges[src]):
            if neighbor == dest:
                self.edges[src][i] = (dest, new_weight)
                break
        for i, (neighbor, weight) in enumerate(self.edges[dest]):
            if neighbor == src:
                self.edges[dest][i] = (src, new_weight)
                break

    def reset_edge_weight(self, src, dest):
        if (src, dest) in self.original_weights:
            self.update_edge_weight(src, dest, self.original_weights[(src, dest)])

    def get_all_edges(self):
        """Retourne toutes les arêtes du graphe"""
        aretes = []
        vues = set()
        for src in self.edges:
            for dest, poids in self.edges[src]:
                if (src, dest) not in vues and (dest, src) not in vues:
                    aretes.append({"src": src, "dest": dest, "distance": poids})
                    vues.add((src, dest))
        return aretes

    def get_edge_with_trafic(self):
        """Retourne les arêtes qui ont un poids différent de l'original"""
        trafic_edges = []
        for (src, dest), poids_original in self.original_weights.items():
            poids_actuel = self.get_poids(src, dest)
            if poids_actuel is not None and poids_actuel != poids_original:
                trafic_edges.append({
                    "src": src,
                    "dest": dest,
                    "poids_original": poids_original,
                    "poids_actuel": poids_actuel,
                    "difference": round(poids_actuel - poids_original, 2)
                })
        return trafic_edges

def create_antananarivo_graph():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        cur.execute("SELECT src, dest, distance FROM connexions")
        connexions = cur.fetchall()
        cur.close()
        conn.close()

        g = Graph()
        for src, dest, distance in connexions:
            g.add_edge(src, dest, float(distance))

        # Tous les quartiers avec coordonnees (meme liste que /quartiers et la carte)
        coords_map = get_quartiers_with_coords()
        for nom in coords_map:
            g.add_node(nom)

        isoles = [n for n in g.nodes if not g.get_neighbors(n)]
        print(
            f"[OK] Graphe charge : {len(g.nodes)} quartiers, "
            f"{len(connexions)} connexions"
            + (f", {len(isoles)} sans liaison" if isoles else "")
        )
        return g

    except Exception as e:
        print(f"[ERREUR] PostgreSQL : {e}")
        return create_default_graph()

def get_quartiers_with_coords():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        cur.execute("SELECT nom, latitude, longitude FROM quartiers")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        result = {}
        for nom, lat, lon in rows:
            la, lo = float(lat), float(lon)
            # Antananarivo et environs proches
            if -19.1 < la < -18.7 and 47.4 < lo < 47.7:
                result[nom] = [la, lo]
        return result
    except Exception as e:
        print(f"[ERREUR] PostgreSQL : {e}")
        return {}

def create_default_graph():
    g = Graph()
    routes = [
        ("Analakely", "Antaninarenina", 0.5),
        ("Analakely", "Isotry", 1.2),
        ("Analakely", "Soarano", 0.8),
        ("Antaninarenina", "Faravohitra", 0.6),
        ("Antaninarenina", "Isoraka", 0.5),
        ("Soarano", "Isotry", 0.9),
        ("Isotry", "Andohatapenaka", 1.5),
        ("Andohatapenaka", "Anatihazo", 1.0),
    ]
    for src, dest, weight in routes:
        g.add_edge(src, dest, weight)
    return g