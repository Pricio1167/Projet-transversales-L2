#!/usr/bin/env python3
"""Script pour réinitialiser le compte admin"""

from auth import hash_password
from database import execute_query, execute_one

# Vérifier si le compte admin existe
admin = execute_one(
    "SELECT id FROM utilisateurs WHERE email = %s",
    ("admin@admin.com",)
)

# Hash du nouveau mot de passe
new_hashed = hash_password("admin123")

if admin:
    # Mettre à jour le mot de passe existant
    execute_query(
        "UPDATE utilisateurs SET mot_de_passe = %s WHERE email = %s",
        (new_hashed, "admin@admin.com")
    )
    print("✅ Compte admin réinitialisé")
else:
    # Créer le compte admin s'il n'existe pas
    execute_query(
        "INSERT INTO utilisateurs (nom, email, mot_de_passe) VALUES (%s, %s, %s)",
        ("Administrateur", "admin@admin.com", new_hashed)
    )
    print("✅ Compte admin créé")

print("Email: admin@admin.com")
print("Mot de passe: admin123")
