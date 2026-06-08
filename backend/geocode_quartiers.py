# geocode_quartiers.py - Corrige les coordonnees via OpenStreetMap (Nominatim)

import argparse
import json
import re
import time
import requests
from database import execute_query

TANA_BBOX = {
    "lat_min": -19.05,
    "lat_max": -18.75,
    "lon_min": 47.42,
    "lon_max": 47.68,
}

# Quartiers connus (OSM / Google Maps) - priorite absolue
KNOWN_COORDS = {
  # OSM suburb "67 ha" — ouest de la ville (pas pres d'Ambodivona)
    "67 Hectares": (-18.905001, 47.509218),
    "67 ha": (-18.905001, 47.509218),
    "Ambodivona": (-18.892932, 47.529419),
    "Analakely": (-18.908318, 47.526285),
    "Antaninarenina": (-18.906944, 47.530833),
    "Isoraka": (-18.912222, 47.525833),
    "Isotry": (-18.909900, 47.516100),
    "Soarano": (-18.904583, 47.519167),
    "Andohalo": (-18.916111, 47.528333),
    "Mahamasina": (-18.918400, 47.524800),
    "Ankorondrano": (-18.894200, 47.538100),
    "Besarety": (-18.915000, 47.535000),
    "Ampasampito": (-18.875000, 47.545000),
    "Ivandry": (-18.875000, 47.538600),
    "Ambohijatovo": (-18.910800, 47.524200),
    "Ankadifotsy": (-18.921900, 47.514400),
    "Ankadimbahoaka": (-18.893900, 47.543600),
    "Befelatanana": (-18.898300, 47.515000),
    "Behoririka": (-18.910000, 47.520000),
    "Tanjombato": (-18.973300, 47.534400),
    "Itaosy": (-18.950000, 47.520000),
    "Ivato": (-18.795600, 47.488600),
    "Ambohidratrimo": (-18.833300, 47.500000),
    "Ankazomanga": (-18.835000, 47.495000),
}

# Noms generes invalides (doublons artificiels)
INVALID_PATTERN = re.compile(
    r"( Tanjombato| Atsimo| Est| Ouest| Nord| Andrefana| Tsimbazaza)$",
    re.I,
)


def in_bbox(lat, lon):
    return (
        TANA_BBOX["lat_min"] <= lat <= TANA_BBOX["lat_max"]
        and TANA_BBOX["lon_min"] <= lon <= TANA_BBOX["lon_max"]
    )


def nominatim_search(nom):
    """Geocode via Nominatim (donnees proches de Google Maps / OSM)."""
    queries = [
        f"{nom}, Antananarivo, Madagascar",
        f"{nom}, Antananarivo",
    ]
    headers = {"User-Agent": "SIOTUM-Antananarivo/1.0 (education project)"}

    for q in queries:
        try:
            r = requests.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": q, "format": "json", "limit": 1, "countrycodes": "mg"},
                headers=headers,
                timeout=15,
            )
            if r.status_code != 200:
                continue
            results = r.json()
            if not results:
                continue
            best = results[0]
            lat = float(best["lat"])
            lon = float(best["lon"])
            if in_bbox(lat, lon):
                return lat, lon, best.get("display_name", "")
        except Exception as e:
            print(f"  [WARN] Nominatim {nom}: {e}")
        time.sleep(1.1)
    return None, None, None


def is_likely_invalid_name(nom):
    """Filtre les doublons artificiels type 'Tsitravato Tanjombato'."""
    m = re.match(r"^(.+)\s+Tanjombato$", nom, re.I)
    if m:
        prefix = m.group(1).strip().lower()
        if prefix not in ("ampefiloha", "tanjombato"):
            return True
    if re.search(r"\s+Tanjombato$", nom, re.I) and nom not in KNOWN_COORDS:
        if not re.match(r"^(Ampefiloha|Tanjombato)\s", nom, re.I):
            return True
    return False


def fetch_overpass_places():
    """Recupere les lieux OSM dans Antananarivo."""
    query = """
    [out:json][timeout:90];
    (
      node["place"~"suburb|neighbourhood|quarter|village"](-19.05,47.42,-18.75,47.68);
    );
    out body;
    """
    url = "https://overpass-api.de/api/interpreter"
    try:
        r = requests.post(url, data=query, timeout=90)
        if r.status_code != 200:
            return {}
        data = r.json()
        places = {}
        for el in data.get("elements", []):
            tags = el.get("tags", {})
            nom = tags.get("name")
            if nom and "lat" in el and "lon" in el:
                places[nom.strip()] = [float(el["lat"]), float(el["lon"])]
        return places
    except Exception as e:
        print(f"[WARN] Overpass: {e}")
        return {}


def normalize_name(nom):
    return nom.strip().replace("  ", " ")


def match_osm_name(nom, osm_places):
    if nom in osm_places:
        return osm_places[nom]
    low = nom.lower()
    for k, v in osm_places.items():
        if k.lower() == low:
            return v
    # 67 ha variantes
    if "67" in low and "hectare" in low:
        for k, v in osm_places.items():
            if "67" in k.lower() and "ha" in k.lower():
                return v
    return None


def update_quartier_coords(nom, lat, lon, source):
    execute_query(
        "UPDATE quartiers SET latitude = %s, longitude = %s WHERE nom = %s",
        (round(lat, 6), round(lon, 6), nom),
    )
    print(f"  [OK] {nom}: {lat:.6f}, {lon:.6f} ({source})")


def main(fast=False):
    print("[INFO] Recuperation des lieux OSM (Overpass)...")
    osm_places = fetch_overpass_places()
    if fast:
        print("[INFO] Mode rapide : connus + OSM uniquement (pas de Nominatim)")
    print(f"[INFO] {len(osm_places)} lieux OSM trouves")

    rows = execute_query("SELECT nom, latitude, longitude FROM quartiers ORDER BY nom", fetch=True)
    print(f"[INFO] {len(rows)} quartiers en base")

    updated = 0
    skipped_invalid = 0
    failed = []
    coords_export = {}

    for row in rows:
        nom = normalize_name(row["nom"])
        if is_likely_invalid_name(nom):
            skipped_invalid += 1
            continue

        lat, lon, source = None, None, None

        if nom in KNOWN_COORDS:
            lat, lon = KNOWN_COORDS[nom]
            source = "connu"
        else:
            osm = match_osm_name(nom, osm_places)
            if osm:
                lat, lon = osm[0], osm[1]
                source = "osm"
            elif not fast:
                lat, lon, display = nominatim_search(nom)
                if lat is not None:
                    source = "nominatim"

        if lat is not None and lon is not None and in_bbox(lat, lon):
            update_quartier_coords(nom, lat, lon, source)
            coords_export[nom] = [lat, lon]
            updated += 1
        else:
            failed.append(nom)

    print(f"\n[RESULTAT] {updated} mis a jour, {skipped_invalid} invalides ignores, {len(failed)} echecs")
    if failed[:15]:
        print("[ECHECS]", ", ".join(failed[:15]), "..." if len(failed) > 15 else "")

    with open("quartiers_coords.json", "w", encoding="utf-8") as f:
        json.dump(coords_export, f, ensure_ascii=False, indent=2)
    print("[INFO] Export: quartiers_coords.json")

    # Supprimer les quartiers invalides de la base
    if skipped_invalid > 0:
        invalid_names = [r["nom"] for r in rows if is_likely_invalid_name(normalize_name(r["nom"]))]
        for nom in invalid_names:
            try:
                execute_query("DELETE FROM connexions WHERE src = %s OR dest = %s", (nom, nom))
                execute_query("DELETE FROM quartiers WHERE nom = %s", (nom,))
            except Exception:
                pass
        print(f"[INFO] {len(invalid_names)} quartiers invalides supprimes")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Corrige les coordonnees des quartiers")
    parser.add_argument(
        "--fast",
        action="store_true",
        help="Connus + OSM seulement (rapide, sans Nominatim)",
    )
    args = parser.parse_args()
    main(fast=args.fast)
