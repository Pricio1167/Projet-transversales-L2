# routing_utils.py - Suggestions de chemins en evitant le trafic

from yen import k_shortest_paths, verifier_route_dans_chemin


def get_trafic_edges_set(graph):
    """Ensemble des aretes avec trafic actif (poids modifie)."""
    edges = set()
    for item in graph.get_edge_with_trafic():
        src, dest = item["src"], item["dest"]
        edges.add((src, dest))
        edges.add((dest, src))
    return edges


def chemin_contient_trafic(chemin, trafic_edges):
    if not chemin or len(chemin) < 2:
        return False, []
    routes_impactees = []
    for i in range(len(chemin) - 1):
        a, b = chemin[i], chemin[i + 1]
        if (a, b) in trafic_edges or (b, a) in trafic_edges:
            routes_impactees.append((a, b))
    return len(routes_impactees) > 0, routes_impactees


def classer_chemins_avec_trafic(graph, depart, destination, k=5):
    """
    Retourne les k chemins tries: d'abord ceux sans trafic, puis par distance.
    """
    trafic_edges = get_trafic_edges_set(graph)
    chemins = k_shortest_paths(graph, depart, destination, k)

    if not chemins:
        return [], trafic_edges, None

    analyses = []
    for chemin, distance in chemins:
        impacte, routes = chemin_contient_trafic(chemin, trafic_edges)
        analyses.append({
            "chemin": chemin,
            "distance": distance,
            "etapes": len(chemin) - 1,
            "contient_trafic": impacte,
            "routes_trafic": [{"src": a, "dest": b} for a, b in routes],
            "evite_trafic": not impacte,
        })

    analyses.sort(key=lambda x: (x["contient_trafic"], x["distance"]))

    recommandation = None
    sans_trafic = [a for a in analyses if a["evite_trafic"]]
    avec_trafic = [a for a in analyses if a["contient_trafic"]]

    if sans_trafic:
        best = sans_trafic[0]
        recommandation = {
            "type": "optimal_sans_trafic",
            "message": "Itineraire recommande : aucun segment avec embouteillage simule.",
            "chemin": best["chemin"],
            "distance": best["distance"],
        }
    elif avec_trafic and len(analyses) > 1:
        alt = analyses[1] if not analyses[1]["contient_trafic"] else None
        if alt:
            recommandation = {
                "type": "alternative_sans_trafic",
                "message": f"Le trajet direct passe par du trafic. Alternative a +{round(alt['distance'] - analyses[0]['distance'], 2)} km sans embouteillage.",
                "chemin": alt["chemin"],
                "distance": alt["distance"],
            }
        else:
            recommandation = {
                "type": "trafic_inevitable",
                "message": "Tous les chemins passent par des zones a trafic simule. Le plus court reste le meilleur compromis.",
                "chemin": analyses[0]["chemin"],
                "distance": analyses[0]["distance"],
            }
    elif analyses[0]["contient_trafic"]:
        routes = analyses[0]["routes_trafic"]
        if routes:
            r = routes[0]
            recommandation = {
                "type": "alerte_trafic",
                "message": f"Attention : passage par {r['src']} -> {r['dest']} (trafic actif).",
                "chemin": analyses[0]["chemin"],
                "distance": analyses[0]["distance"],
            }

    return analyses, trafic_edges, recommandation
