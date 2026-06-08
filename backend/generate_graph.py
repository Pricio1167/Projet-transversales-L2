# generate_graph.py - Génère les connexions entre quartiers automatiquement

import json
import math

def distance_km(coord1, coord2):
    """Calcule la distance en km entre deux coordonnées GPS (formule Haversine)"""
    R = 6371
    lat1, lon1 = math.radians(coord1[0]), math.radians(coord1[1])
    lat2, lon2 = math.radians(coord2[0]), math.radians(coord2[1])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))

def generate_connections(max_distance_km=2.0):
    """Connecte automatiquement les quartiers proches"""
    with open("quartiers.json", "r", encoding="utf-8") as f:
        quartiers = json.load(f)
    
    print(f"[INFO] {len(quartiers)} quartiers charges")
    print(f"[INFO] Generation des connexions (max {max_distance_km} km)...")
    
    noms = list(quartiers.keys())
    connexions = []
    
    for i in range(len(noms)):
        for j in range(i + 1, len(noms)):
            q1, q2 = noms[i], noms[j]
            dist = distance_km(quartiers[q1], quartiers[q2])
            if dist <= max_distance_km:
                connexions.append({
                    "src": q1,
                    "dest": q2,
                    "distance": round(dist, 3)
                })
    
    print(f"[OK] {len(connexions)} connexions generees !")
    
    # Sauvegarde
    graph_data = {
        "quartiers": quartiers,
        "connexions": connexions
    }
    
    with open("graph_data.json", "w", encoding="utf-8") as f:
        json.dump(graph_data, f, ensure_ascii=False, indent=2)
    
    print("[OK] Sauvegarde dans graph_data.json")
    return graph_data

if __name__ == "__main__":
    generate_connections()