# import_data.py - Importe les données JSON dans PostgreSQL

import json
import psycopg2

DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "siotum",
    "user": "postgres",
    "password": "Pricio"
}

def import_data():
    print("📂 Chargement du fichier graph_data.json...")
    with open("graph_data.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    quartiers = data["quartiers"]
    connexions = data["connexions"]

    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    print(f"📍 Import de {len(quartiers)} quartiers...")
    for nom, coords in quartiers.items():
        cur.execute(
            """INSERT INTO quartiers (nom, latitude, longitude) 
            VALUES (%s, %s, %s) ON CONFLICT (nom) DO NOTHING""",
            (nom, coords[0], coords[1])
        )

    print(f"🔗 Import de {len(connexions)} connexions...")
    for c in connexions:
        cur.execute("SELECT nom FROM quartiers WHERE nom = %s", (c['src'],))
        src_exists = cur.fetchone()
        cur.execute("SELECT nom FROM quartiers WHERE nom = %s", (c['dest'],))
        dest_exists = cur.fetchone()

        if src_exists and dest_exists:
            cur.execute(
                """INSERT INTO connexions (src, dest, distance)
                VALUES (%s, %s, %s)""",
                (c['src'], c['dest'], c['distance'])
            )

    conn.commit()
    cur.close()
    conn.close()
    print("[OK] Import termine !")

if __name__ == "__main__":
    import_data()