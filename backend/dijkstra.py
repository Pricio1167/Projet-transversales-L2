# dijkstra.py - Algorithme de Dijkstra avec tas binaire

import heapq
import time

def dijkstra(graph, start, end):
    distances = {node: float('inf') for node in graph.nodes}
    distances[start] = 0
    predecesseurs = {node: None for node in graph.nodes}
    tas = [(0, start)]
    visited = set()

    while tas:
        dist_actuelle, noeud_actuel = heapq.heappop(tas)
        if noeud_actuel in visited:
            continue
        visited.add(noeud_actuel)
        if noeud_actuel == end:
            break
        for voisin, poids in graph.get_neighbors(noeud_actuel):
            distance = dist_actuelle + poids
            if distance < distances[voisin]:
                distances[voisin] = distance
                predecesseurs[voisin] = noeud_actuel
                heapq.heappush(tas, (distance, voisin))

    if distances[end] == float('inf'):
        return None, None

    chemin = []
    noeud = end
    while noeud is not None:
        chemin.append(noeud)
        noeud = predecesseurs[noeud]
    chemin.reverse()
    return chemin, round(distances[end], 2)

def dijkstra_simple(graph, start, end):
    distances = {node: float('inf') for node in graph.nodes}
    distances[start] = 0
    visited = set()
    nodes = list(graph.nodes)

    while len(visited) < len(nodes):
        noeud_actuel = None
        for node in nodes:
            if node not in visited:
                if noeud_actuel is None or distances[node] < distances[noeud_actuel]:
                    noeud_actuel = node
        if noeud_actuel is None or distances[noeud_actuel] == float('inf'):
            break
        visited.add(noeud_actuel)
        for voisin, poids in graph.get_neighbors(noeud_actuel):
            if distances[noeud_actuel] + poids < distances[voisin]:
                distances[voisin] = distances[noeud_actuel] + poids
    return distances[end] if end in distances else None

def comparer_performances(graph, start, end):
    debut = time.time()
    chemin, distance = dijkstra(graph, start, end)
    fin = time.time()
    temps_tas = (fin - debut) * 1000

    debut = time.time()
    distance_simple = dijkstra_simple(graph, start, end)
    fin = time.time()
    temps_simple = (fin - debut) * 1000

    return {
        "chemin": chemin,
        "distance": distance,
        "temps_tas_binaire_ms": round(temps_tas, 4),
        "temps_sans_tas_ms": round(temps_simple, 4)
    }