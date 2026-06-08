# auth.py - Gestion de l'authentification

import bcrypt
from database import execute_query, execute_one

def hash_password(password):
    """Hashage du mot de passe"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password, hashed):
    """Vérification du mot de passe"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def register_user(nom, email, password, role='user'):
    """Inscription d'un nouvel utilisateur"""
    # Vérifier si l'email existe déjà
    existing = execute_one(
        "SELECT id FROM utilisateurs WHERE email = %s",
        (email,)
    )
    if existing:
        return None, "Email déjà utilisé"

    # Hasher le mot de passe
    hashed = hash_password(password)

    # Insérer l'utilisateur (fallback si la colonne 'role' n'existe pas)
    try:
        execute_query(
            "INSERT INTO utilisateurs (nom, email, mot_de_passe, role) VALUES (%s, %s, %s, %s)",
            (nom, email, hashed, role)
        )
    except Exception:
        execute_query(
            "INSERT INTO utilisateurs (nom, email, mot_de_passe) VALUES (%s, %s, %s)",
            (nom, email, hashed)
        )

    # Récupérer l'utilisateur créé
    user = execute_one(
        "SELECT id, nom, email, role FROM utilisateurs WHERE email = %s",
        (email,)
    )
    if not user:
        user = execute_one(
            "SELECT id, nom, email FROM utilisateurs WHERE email = %s",
            (email,)
        )
    if user:
        role = (user.get("role") or "user").lower()
        email_l = (user.get("email") or "").lower()
        user["role"] = role
        user["is_admin"] = role == "admin" or email_l == "admin@admin.com"
    return user, None

def login_user(email, password):
    """Connexion d'un utilisateur"""
    user = execute_one(
        "SELECT * FROM utilisateurs WHERE email = %s",
        (email,)
    )
    if not user:
        return None, "Email ou mot de passe incorrect"

    if not verify_password(password, user['mot_de_passe']):
        return None, "Email ou mot de passe incorrect"

    role = (user.get('role') or 'user').lower()
    email = (user.get('email') or '').lower()
    return {
        "id": user['id'],
        "nom": user['nom'],
        "email": user['email'],
        "role": role,
        "is_admin": role == 'admin' or email == 'admin@admin.com',
    }, None