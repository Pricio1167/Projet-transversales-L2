# fetch_map.py - Récupère tous les quartiers d'Antananarivo

import requests
import json

def fetch_quartiers():
    print("[INFO] Recuperation des quartiers d'Antananarivo...")
    
    query = """
    [out:json][timeout:90];
    (
      node["place"="suburb"](-19.00, 47.46, -18.75, 47.65);
      node["place"="neighbourhood"](-19.00, 47.46, -18.75, 47.65);
      node["place"="quarter"](-19.00, 47.46, -18.75, 47.65);
      node["place"="village"](-19.00, 47.46, -18.75, 47.65);
      node["place"="hamlet"](-19.00, 47.46, -18.75, 47.65);
    );
    out body;
    """
    
    # On essaie plusieurs serveurs Overpass
    serveurs = [
        "https://overpass-api.de/api/interpreter",
        "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
    ]
    
    result = None
    for serveur in serveurs:
        try:
            print(f"[INFO] Essai sur {serveur}...")
            response = requests.post(serveur, data=query, timeout=60)
            if response.status_code == 200:
                result = response.json()
                print("[OK] Connexion reussie")
                break
        except Exception as e:
            print(f"[ERREUR] Echec : {e}")
            continue
    
    if not result:
        print("[ERREUR] Impossible de contacter Overpass.")
        return {}
    
    quartiers = {}
    for element in result.get("elements", []):
        nom = element.get("tags", {}).get("name")
        if nom and "lat" in element and "lon" in element:
            quartiers[nom] = [float(element["lat"]), float(element["lon"])]
    
    print(f"[OK] {len(quartiers)} quartiers trouves")
    
    with open("quartiers.json", "w", encoding="utf-8") as f:
        json.dump(quartiers, f, ensure_ascii=False, indent=2)
    
    print("[OK] Sauvegarde dans quartiers.json")
    return quartiers

if __name__ == "__main__":
    fetch_quartiers()