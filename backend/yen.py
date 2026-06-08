# yen.py - Algorithme de Yen pour K-plus courts chemins

import heapq

def dijkstra_for_yen(graph, source, target, forbidden_edges=None, forbidden_nodes=None):
    """Dijkstra modifié pour éviter certaines arêtes ou nœuds"""
    if forbidden_edges is None:
        forbidden_edges = []
    if forbidden_nodes is None:
        forbidden_nodes = []
    
    distances = {node: float('inf') for node in graph.nodes}
    distances[source] = 0
    predecesseurs = {node: None for node in graph.nodes}
    
    heap = [(0, source)]
    visited = set()
    
    while heap:
        dist_actuelle, node_actuel = heapq.heappop(heap)
        
        if node_actuel in visited:
            continue
        visited.add(node_actuel)
        
        if node_actuel == target:
            break
        
        for voisin, poids in graph.get_neighbors(node_actuel):
            if (node_actuel, voisin) in forbidden_edges or (voisin, node_actuel) in forbidden_edges:
                continue
            if voisin in forbidden_nodes:
                continue
            
            distance = dist_actuelle + poids
            
            if distance < distances[voisin]:
                distances[voisin] = distance
                predecesseurs[voisin] = node_actuel
                heapq.heappush(heap, (distance, voisin))
    
    if distances[target] == float('inf'):
        return None, None
    
    chemin = []
    node = target
    while node is not None:
        chemin.append(node)
        node = predecesseurs[node]
    chemin.reverse()
    
    return chemin, round(distances[target], 2)


def k_shortest_paths(graph, source, target, k=3):
    """Algorithme de Yen - trouve les K-plus courts chemins"""
    premier_chemin, premiere_distance = dijkstra_for_yen(graph, source, target)
    
    if premier_chemin is None:
        return []
    
    k_chemins = [(premier_chemin, premiere_distance)]
    candidats = []
    
    for i in range(1, k):
        chemin_precedent = k_chemins[i-1][0]
        
        for j in range(len(chemin_precedent) - 1):
            noeud_racine = chemin_precedent[:j+1]
            aretes_interdites = []
            
            for chemin in k_chemins:
                if len(chemin[0]) > j + 1 and chemin[0][:j+1] == noeud_racine:
                    src = chemin[0][j]
                    dest = chemin[0][j+1]
                    aretes_interdites.append((src, dest))
            
            noeuds_interdits = noeud_racine[:-1]
            spur_node = noeud_racine[-1]
            
            spur_chemin, spur_distance = dijkstra_for_yen(
                graph, spur_node, target,
                forbidden_edges=aretes_interdites,
                forbidden_nodes=noeuds_interdits
            )
            
            if spur_chemin is not None:
                chemin_complet = noeud_racine[:-1] + spur_chemin
                distance_complete = calculer_distance_chemin(graph, chemin_complet)
                candidats.append((chemin_complet, distance_complete))
        
        if not candidats:
            break
        
        candidats.sort(key=lambda x: x[1])
        meilleur_candidat = candidats.pop(0)
        k_chemins.append(meilleur_candidat)
        candidats = [c for c in candidats if c[0] != meilleur_candidat[0]]
    
    return k_chemins


def calculer_distance_chemin(graph, chemin):
    """Calcule la distance totale d'un chemin"""
    if not chemin or len(chemin) < 2:
        return 0
    
    distance_totale = 0
    for i in range(len(chemin) - 1):
        voisins = graph.get_neighbors(chemin[i])
        for voisin, poids in voisins:
            if voisin == chemin[i+1]:
                distance_totale += poids
                break
    
    return round(distance_totale, 2)


def verifier_route_dans_chemin(chemin, route):
    """Vérifie si une route (src, dest) est dans le chemin"""
    if not chemin or len(chemin) < 2:
        return False, -1
    
    src_route, dest_route = route
    
    for i in range(len(chemin) - 1):
        if (chemin[i] == src_route and chemin[i+1] == dest_route) or \
           (chemin[i] == dest_route and chemin[i+1] == src_route):
            return True, i
    
    return False, -1


def comparer_chemins(chemins):
    """Compare les chemins alternatifs"""
    if not chemins:
        return None
    
    resultats = []
    meilleur = chemins[0]
    
    for i, (chemin, distance) in enumerate(chemins):
        difference = 0
        if i > 0 and meilleur[1] > 0:
            difference = round(distance - meilleur[1], 2)
        
        resultats.append({
            "rang": i + 1,
            "chemin": chemin,
            "distance": distance,
            "difference_km": difference,
            "est_optimal": i == 0
        })
    
    return {
        "chemins": resultats,
        "meilleur": resultats[0],
        "alternatives": resultats[1:]
    }