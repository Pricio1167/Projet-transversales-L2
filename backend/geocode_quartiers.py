# geocode_quartiers.py - Corrige les coordonnees via OpenStreetMap (Nominatim)

import argparse
import json
import math
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

# Vue stricte Commune Urbaine d'Antananarivo / Analamanga pour Nominatim.
# Format Nominatim viewbox: left, top, right, bottom
TANA_VIEWBOX = "47.42,-18.75,47.68,-19.05"
STRICT_ZONE_KEYWORDS = ("antananarivo", "analamanga", "province d'antananarivo")

# Quartiers connus (OSM / Google Maps / FKT) — coordonnees verifiees, priorite absolue
KNOWN_COORDS = {
    # Centre-ville / Haute-ville
    "67 Hectares":              (-18.905001,  47.509218),
    "67 ha":                    (-18.905001,  47.509218),
    "Analakely":                (-18.908318,  47.526285),
    "Antaninarenina":           (-18.906944,  47.530833),
    "Andohalo":                 (-18.916111,  47.528333),
    "Isoraka":                  (-18.912222,  47.525833),
    "Isotry":                   (-18.909900,  47.516100),
    "Soarano":                  (-18.904583,  47.519167),
    "Ambohijatovo":             (-18.910800,  47.524200),
    "Faravohitra":              (-18.905000,  47.532000),
    "Ambodivona":               (-18.892932,  47.529419),
    "Antsahabe":                (-18.893600,  47.526400),
    "Ambatobe":                 (-18.888333,  47.534167),
    "Ambatonakanga":            (-18.903056,  47.522222),
    "Mahamasina":               (-18.918400,  47.524800),
    "Anosy":                    (-18.917129,  47.519979),
    "Ankatso":                  (-18.915987,  47.565771),
    # Avaradoha / Nord centre
    "Avaradoha":                (-18.888333,  47.530000),
    "Anjanahary":               (-18.880000,  47.535000),
    "Befelatanana":             (-18.898300,  47.515000),
    "Behoririka":               (-18.910000,  47.520000),
    "Tsaralalana":              (-18.900278,  47.519722),
    "Bazary Be":                (-18.905000,  47.525000),
    # Ouest / 67ha
    "Andohatapenaka":           (-18.926389,  47.525000),
    "Anatihazo":                (-18.920000,  47.516667),
    "Ankadifotsy":              (-18.921900,  47.514400),
    "Tanoritra":                (-18.910556,  47.517222),
    "Talatatany":               (-18.905000,  47.510000),
    "Andranomafana":            (-18.895000,  47.515000),
    "Antanimena":               (-18.891667,  47.510000),
    "Fanantenana":              (-18.895000,  47.505000),
    # Est / Ankorondrano
    "Ankorondrano":             (-18.894200,  47.538100),
    "Ivandry":                  (-18.875000,  47.538600),
    "Ampasapito":               (-18.875278,  47.545278),
    "Ankadimbahoaka":           (-18.893900,  47.543600),
    "Ambohipo":                 (-18.883333,  47.550000),
    "Mandroseza":               (-18.895000,  47.560000),
    "Soanierana":               (-18.895000,  47.550000),
    "Andravoahangy":            (-18.904722,  47.547222),
    "Besarety":                 (-18.915000,  47.535000),
    "Antohomadinika":           (-18.925000,  47.535000),
    "Anosibe":                  (-18.928611,  47.554722),
    "Manorano":                 (-18.905000,  47.535000),
    "Ankadilalana":             (-18.896667,  47.535000),
    "Fiadanana":                (-18.905000,  47.540000),
    "Matahari":                 (-18.913333,  47.540000),
    # Nord / Ambohidratrimo
    "Ambohibao":                (-18.893056,  47.477222),  # ouest de Tana — CORRIGE
    "Ambohidratrimo":           (-18.833300,  47.500000),
    "Ankazomanga":              (-18.835000,  47.495000),
    "Ivato":                    (-18.795600,  47.488600),
    "Talatamaty":               (-18.843056,  47.487222),
    "Anosiala":                 (-18.826944,  47.509722),
    "Fenoarivo":                (-18.850000,  47.510000),
    "Morarano":                 (-18.855000,  47.525000),
    "Ilafy":                    (-18.860000,  47.530000),
    "Manjakamiadana":           (-18.870000,  47.525000),
    "Bongatsara":               (-18.880000,  47.515000),
    "Anosipatrana":             (-18.885000,  47.515000),
    "Miandrarivo":              (-18.860000,  47.515000),
    "Antsiraka":                (-18.870000,  47.515000),
    "Fanjavana":                (-18.860000,  47.520000),
    "Bemasoandro":              (-18.865000,  47.525000),
    # Sud / Tanjombato
    "Tanjombato":               (-18.973300,  47.534400),
    "Itaosy":                   (-18.952778,  47.519444),
    "Andoharanofotsy":          (-18.935556,  47.519444),
    "Tanosy":                   (-18.925000,  47.520000),
    "Ambanidia":                (-18.922222,  47.528889),
    "Antsahadinta":             (-18.965278,  47.482778),
    "Andranonahoatra":          (-18.950000,  47.510000),
    # Tsimbazaza / centre sud
    "Tsimbazaza":               (-18.896700,  47.525000),
    "Ampefiloha":               (-18.896700,  47.530000),
    "Ampefiloha Andrefana":     (-18.899722,  47.527500),
    "Ampandrana":               (-18.890833,  47.519167),
    "Ampasanimalo":             (-18.887500,  47.524167),
    "Ampatsakana":              (-18.895833,  47.521667),
    "Andrianampoinimerina":     (-18.886667,  47.535000),
    "Antsahamanitra":           (-18.880000,  47.540000),
    "Ambohimanarina":           (-18.885000,  47.535000),
    "Ambohimiandra":            (-18.890000,  47.538333),
    "Ambohimirary":             (-18.875000,  47.533333),
    "Ambohinoro":               (-18.878333,  47.531667),
    "Ambohinivo":               (-18.883333,  47.525000),
    "Ambohitsoa":               (-18.887500,  47.520833),
    "Ambodifilankena":          (-18.876667,  47.536667),
    "Ambodivona":               (-18.892932,  47.529419),
    "Ambohipo":                 (-18.883333,  47.550000),
    "Ambohipotsy":              (-18.878333,  47.538333),
    "Ambozontany":              (-18.875000,  47.528333),
    "Farihimena":               (-18.890000,  47.540000),
    "Voromahery":               (-18.876667,  47.541667),
    "Iavoloha":                 (-18.895000,  47.545000),
    "Fitaratra":                (-18.885000,  47.545000),
    "Nanisana":                 (-18.880000,  47.555000),
    "Manjakavaradrano":         (-18.862778,  47.515000),
    "Tanjovato":                (-18.856111,  47.534722),
    "Androna":                  (-18.867500,  47.537500),
    "Manjatsara":               (-18.875000,  47.535000),
    "Miarintsoa":               (-18.870000,  47.535000),
    "Moratalaky":               (-18.865000,  47.545000),
    "Ankazotokana":             (-18.845000,  47.505000),
    # Quartiers supplementaires ajoutes
    "Anosizato Andrefana":      (-18.940000,  47.513000),
    "Anosizato Atsinanana":     (-18.934000,  47.520000),
    "Ambohimahitsy":            (-18.820000,  47.483000),
    "Ambohitrarahaba":          (-18.850000,  47.480000),
    "Merimandroso":             (-18.843000,  47.520000),
    "Soalandy":                 (-18.953000,  47.527000),
    "Tsiazotafo":               (-18.918000,  47.510000),
    "Andavamamba":              (-18.905000,  47.512000),
    "Tsiadana":                 (-18.897000,  47.527000),
    "Antsahakely":              (-18.902000,  47.549000),
    "Amboatany":                (-18.919000,  47.509000),
    "Ampitatafika":             (-18.978000,  47.519000),
    "Androhibe":                (-18.868000,  47.510000),
    "Ambohimalaza":             (-18.878000,  47.565000),
    "Soavinandriana":           (-18.863000,  47.502000),
    "Ankadikely Ilafy":         (-18.848000,  47.552000),
    "Bemahareza":               (-18.900000,  47.511000),
    "Tsarasaotra":              (-18.908000,  47.542000),
    "Imerintsiatosika":         (-18.966000,  47.480000),
    "Ambohidrapeto":            (-18.862000,  47.508000),
    "Anjakamaniry":             (-18.872000,  47.550000),
    "Ambohimandroso":           (-18.880000,  47.543000),
    "Fieferana":                (-18.922000,  47.507000),
    "Ankaditoho":               (-18.855000,  47.518000),
    "Tsarahonenana":            (-18.890000,  47.565000),
    "Ambohimalaza Afovoany":    (-18.876000,  47.572000),
    "Ambolokandrina":           (-18.922571,  47.569318),
    "Ambolikandrina":           (-18.922571,  47.569318),
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


def _norm_text(s):
    if not s:
        return ""
    return (
        s.lower()
        .replace("’", "'")
        .replace("-", " ")
        .replace("_", " ")
        .replace("  ", " ")
        .strip()
    )


def _name_variants(nom):
    base = _norm_text(nom)
    variants = {base}
    variants.add(base.replace("ambolikandrina", "ambolokandrina"))
    variants.add(base.replace("ambolokandrina", "ambolikandrina"))
    variants.add(base.replace("67 hectares", "67 ha"))
    variants.add(base.replace("67 ha", "67 hectares"))
    return {v for v in variants if v}


def _is_strict_zone(display_name):
    d = _norm_text(display_name)
    return any(k in d for k in STRICT_ZONE_KEYWORDS)


def _haversine_km(a, b):
    r = 6371.0
    lat1, lon1 = math.radians(a[0]), math.radians(a[1])
    lat2, lon2 = math.radians(b[0]), math.radians(b[1])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    x = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return r * 2 * math.asin(math.sqrt(x))


def _score_nominatim_result(target_name, result):
    """Score un resultat Nominatim: nom proche + zone Antananarivo/Analamanga + importance."""
    try:
        lat = float(result.get("lat", "nan"))
        lon = float(result.get("lon", "nan"))
    except Exception:
        return -1.0
    if not in_bbox(lat, lon):
        return -1.0

    display_name = result.get("display_name", "")
    name = result.get("name", "")
    place_rank = float(result.get("place_rank") or 0)
    importance = float(result.get("importance") or 0)

    target_vars = _name_variants(target_name)
    cand_name = _norm_text(name)
    cand_display = _norm_text(display_name)

    score = 0.0
    if _is_strict_zone(display_name):
        score += 4.0
    if cand_name in target_vars:
        score += 4.0
    elif any(v in cand_display for v in target_vars):
        score += 2.0

    # place_rank/importance elevés = meilleur candidat
    score += min(1.5, place_rank / 20.0)
    score += min(1.5, importance * 3.0)
    return score


def nominatim_search(nom):
    """Geocode via Nominatim avec filtre strict Antananarivo/Analamanga."""
    queries = [
        f"{nom}, Commune Urbaine d'Antananarivo, Analamanga, Madagascar",
        f"{nom}, Antananarivo, Analamanga, Madagascar",
        f"{nom}, Antananarivo",
    ]
    headers = {"User-Agent": "SIOTUM-Antananarivo/1.0 (education project)"}

    for q in queries:
        try:
            r = requests.get(
                "https://nominatim.openstreetmap.org/search",
                params={
                    "q": q,
                    "format": "jsonv2",
                    "limit": 8,
                    "countrycodes": "mg",
                    "addressdetails": 1,
                    "bounded": 1,
                    "viewbox": TANA_VIEWBOX,
                },
                headers=headers,
                timeout=15,
            )
            if r.status_code != 200:
                continue
            results = r.json()
            if not results:
                continue

            ranked = sorted(
                (
                    (res, _score_nominatim_result(nom, res))
                    for res in results
                ),
                key=lambda x: x[1],
                reverse=True,
            )
            best, score = ranked[0]
            # Eviter les faux positifs: n'accepter que les candidats très pertinents.
            if score < 5.5:
                continue

            lat = float(best["lat"])
            lon = float(best["lon"])
            if in_bbox(lat, lon) and _is_strict_zone(best.get("display_name", "")):
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
    """Recupere les lieux OSM dans Antananarivo (nodes + ways + relations avec centres)."""
    query = """
    [out:json][timeout:90];
    (
      node["place"~"suburb|neighbourhood|quarter|village|hamlet"](-19.05,47.42,-18.75,47.68);
      way["place"~"suburb|neighbourhood|quarter|village|hamlet"](-19.05,47.42,-18.75,47.68);
      relation["place"~"suburb|neighbourhood|quarter|village|hamlet"](-19.05,47.42,-18.75,47.68);
    );
    out center;
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
            if not nom:
                continue
            lat = el.get("lat")
            lon = el.get("lon")
            if lat is None or lon is None:
                center = el.get("center") or {}
                lat = center.get("lat")
                lon = center.get("lon")
            if lat is not None and lon is not None:
                lat = float(lat)
                lon = float(lon)
                if in_bbox(lat, lon):
                    places[nom.strip()] = [lat, lon]
        return places
    except Exception as e:
        print(f"[WARN] Overpass: {e}")
        return {}


def normalize_name(nom):
    return nom.strip().replace("  ", " ")


def match_osm_name(nom, osm_places):
    if nom in osm_places:
        return osm_places[nom]
    low = _norm_text(nom)
    for k, v in osm_places.items():
        if _norm_text(k) == low:
            return v
    # variantes orthographiques usuelles
    vars_nom = _name_variants(nom)
    for k, v in osm_places.items():
        if _norm_text(k) in vars_nom:
            return v
    # 67 ha variantes
    if "67" in low and "hectare" in low:
        for k, v in osm_places.items():
            k2 = _norm_text(k)
            if "67" in k2 and "ha" in k2:
                return v
    return None


def update_quartier_coords(nom, lat, lon, source):
    execute_query(
        "UPDATE quartiers SET latitude = %s, longitude = %s WHERE nom = %s",
        (round(lat, 6), round(lon, 6), nom),
    )
    print(f"  [OK] {nom}: {lat:.6f}, {lon:.6f} ({source})")


def main(fast=False, strict_cua=True, max_shift_km=6.0):
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
        current_lat = row.get("latitude")
        current_lon = row.get("longitude")
        if is_likely_invalid_name(nom):
            skipped_invalid += 1
            continue

        lat, lon, source = None, None, None

        if nom in KNOWN_COORDS:
            lat, lon = KNOWN_COORDS[nom]
            source = "connu"
            # En mode strict, on valide les coords "connues" contre la zone CUA.
            if strict_cua and not in_bbox(lat, lon):
                lat, lon, source = None, None, None
        if lat is None or lon is None:
            osm = match_osm_name(nom, osm_places)
            if osm:
                lat, lon = osm[0], osm[1]
                source = "osm"
            elif not fast:
                lat, lon, display = nominatim_search(nom)
                if lat is not None:
                    source = "nominatim"

        if lat is not None and lon is not None and in_bbox(lat, lon):
            # Garde-fou: ne pas accepter un déplacement trop grand depuis la coordonnée existante.
            if current_lat is not None and current_lon is not None and source in ("osm", "nominatim"):
                try:
                    shift = _haversine_km(
                        (float(current_lat), float(current_lon)),
                        (float(lat), float(lon)),
                    )
                except Exception:
                    shift = 0.0
                if shift > max_shift_km:
                    failed.append(nom)
                    print(f"  [SKIP] {nom}: deplacement trop grand ({shift:.2f} km)")
                    continue
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
    parser.add_argument(
        "--no-strict-cua",
        action="store_true",
        help="Desactive le filtre strict Antananarivo/Analamanga",
    )
    parser.add_argument(
        "--max-shift-km",
        type=float,
        default=6.0,
        help="Distance max autorisee (km) entre ancienne et nouvelle coordonnee",
    )
    args = parser.parse_args()
    main(
        fast=args.fast,
        strict_cua=not args.no_strict_cua,
        max_shift_km=args.max_shift_km,
    )
