# database.py - Connexion PostgreSQL

import psycopg2
from psycopg2.extras import RealDictCursor
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

def get_connection():
    """Retourne une connexion à la base de données"""
    try:
        return psycopg2.connect(**DB_CONFIG)
    except Exception as e:
        print(f"[ERREUR] Connexion PostgreSQL: {e}")
        raise

def execute_query(query, params=None, fetch=False):
    """Exécute une requête SQL"""
    conn = None
    try:
        conn = get_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            if fetch:
                result = cur.fetchall()
                return [dict(row) for row in result]
            conn.commit()
            return True
    except psycopg2.Error as e:
        if conn:
            conn.rollback()
        print(f"[ERREUR] SQL: {e}")
        print(f"   Query: {query}")
        print(f"   Params: {params}")
        raise e
    finally:
        if conn:
            conn.close()

def execute_one(query, params=None):
    """Retourne une seule ligne"""
    conn = None
    try:
        conn = get_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            result = cur.fetchone()
            return dict(result) if result else None
    except psycopg2.Error as e:
        print(f"[ERREUR] SQL: {e}")
        print(f"   Query: {query}")
        print(f"   Params: {params}")
        return None
    finally:
        if conn:
            conn.close()

def test_connection():
    """Teste la connexion à PostgreSQL"""
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            print("[OK] Connexion PostgreSQL reussie")
        conn.close()
        return True
    except Exception as e:
        print(f"[ERREUR] Connexion PostgreSQL echouee: {e}")
        return False

# Test automatique au chargement
if __name__ == "__main__":
    test_connection()