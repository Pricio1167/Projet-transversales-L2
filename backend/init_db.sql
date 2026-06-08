-- ============================================
-- SIOTUM - INITIALISATION COMPLÈTE DE LA BASE
-- ============================================

-- 1. TABLE UTILISATEURS
CREATE TABLE IF NOT EXISTS utilisateurs (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    blocked BOOLEAN DEFAULT FALSE,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW(),
    CHECK (role IN ('user', 'admin'))
);

-- 2. TABLE QUARTIERS (si pas déjà existante)
CREATE TABLE IF NOT EXISTS quartiers (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) UNIQUE NOT NULL,
    latitude DECIMAL(10, 6) NOT NULL,
    longitude DECIMAL(10, 6) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. TABLE CONNEXIONS (si pas déjà existante)
CREATE TABLE IF NOT EXISTS connexions (
    id SERIAL PRIMARY KEY,
    src VARCHAR(255) NOT NULL REFERENCES quartiers(nom),
    dest VARCHAR(255) NOT NULL REFERENCES quartiers(nom),
    distance DECIMAL(10, 3) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(src, dest)
);

-- 4. TABLE TRAJETS
CREATE TABLE IF NOT EXISTS trajets (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER REFERENCES utilisateurs(id),
    depart VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    chemin JSONB NOT NULL,
    distance DECIMAL(10, 3) NOT NULL,
    etapes INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. TABLE PERFORMANCES
CREATE TABLE IF NOT EXISTS performances (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER REFERENCES utilisateurs(id),
    depart VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    temps_tas_binaire DECIMAL(10, 4),
    temps_sans_tas DECIMAL(10, 4),
    distance DECIMAL(10, 3),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. TABLE TRAFIC (déjà existante, on ajoute si pas là)
CREATE TABLE IF NOT EXISTS trafic (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER REFERENCES utilisateurs(id),
    src VARCHAR(255) NOT NULL,
    dest VARCHAR(255) NOT NULL,
    poids_original DECIMAL(10, 3) NOT NULL,
    poids_actuel DECIMAL(10, 3) NOT NULL,
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 7. TABLE RECHERCHES ALTERNATIVES (POUR LES 3 CHEMINS)
CREATE TABLE IF NOT EXISTS recherches_alternatives (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER REFERENCES utilisateurs(id),
    depart VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    resultats JSONB NOT NULL,
    alerte JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 8. TABLE AUDIT ADMIN (journal des actions admin)
CREATE TABLE IF NOT EXISTS admin_audit (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES utilisateurs(id),
    action VARCHAR(120) NOT NULL,
    payload JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- FIN DE L'INITIALISATION
-- ============================================

-- Vérification : lister toutes les tables
\dt