// pages/Home.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUser, getHistorique, getStats, logout } from "../api";

// Palette IHM
const colors = {
  bleu: "#0066CC",
  blanc: "#FFFFFF",
  grisClair: "#F5F7FA",
  vert: "#2E7D32",
  orange: "#F57C00",
  rouge: "#D32F2F",
  violet: "#6B5B95",
  texte: "#1E2A3A",
  texteMuted: "#5A6E7A",
  bordure: "#E2E8F0",
};

const styles = {
  page: {
    padding: 24,
    minHeight: "100vh",
    backgroundColor: colors.grisClair,
    fontFamily: "system-ui, sans-serif",
  },
  header: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    marginBottom: 28,
  },
  headerPanel: {
    flex: 1,
    minWidth: 280,
    backgroundColor: colors.blanc,
    borderRadius: 16,
    padding: 24,
    border: `1px solid ${colors.bordure}`,
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  welcome: {
    fontSize: 24,
    fontWeight: 600,
    color: colors.texte,
    marginBottom: 6,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  subtext: {
    fontSize: 14,
    color: colors.texteMuted,
    lineHeight: 1.5,
  },
  rightArea: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  logoutBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 18px",
    borderRadius: 40,
    border: `1px solid ${colors.bordure}`,
    backgroundColor: colors.blanc,
    color: colors.texteMuted,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
    transition: "all 0.2s",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
    marginBottom: 28,
  },
  statCard: (bgColor, borderColor) => ({
    backgroundColor: bgColor,
    border: `1px solid ${borderColor}`,
    borderRadius: 16,
    padding: 20,
    textAlign: "center",
  }),
  statValue: {
    fontSize: 32,
    fontWeight: 700,
    color: colors.texte,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: colors.texteMuted,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1.2fr 0.8fr",
    gap: 24,
  },
  card: {
    backgroundColor: colors.blanc,
    borderRadius: 16,
    padding: 24,
    border: `1px solid ${colors.bordure}`,
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 20,
    color: colors.texte,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  quickBtn: (iconColor, borderColor, bgColor) => ({
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "14px 18px",
    borderRadius: 12,
    border: `1px solid ${borderColor}`,
    backgroundColor: bgColor,
    cursor: "pointer",
    marginBottom: 12,
    width: "100%",
    textAlign: "left",
    transition: "all 0.2s",
  }),
  quickTitle: {
    fontWeight: 600,
    color: colors.texte,
    marginBottom: 4,
    fontSize: 14,
  },
  quickSubtitle: {
    fontSize: 12,
    color: colors.texteMuted,
    lineHeight: 1.4,
  },
  trajetItem: {
    padding: "14px 0",
    borderBottom: `1px solid ${colors.bordure}`,
  },
  trajetItemLast: {
    borderBottom: "none",
  },
  trajetRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  trajetRoute: {
    fontWeight: 600,
    color: colors.texte,
    fontSize: 14,
  },
  badge: (bgColor, textColor) => ({
    backgroundColor: bgColor,
    color: textColor,
    padding: "4px 10px",
    borderRadius: 40,
    fontSize: 12,
    fontWeight: 500,
  }),
  trajetMeta: {
    fontSize: 12,
    color: colors.texteMuted,
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  emptyState: {
    color: colors.texteMuted,
    fontSize: 13,
    textAlign: "center",
    padding: "30px 20px",
  },
};

function Home() {
  const [user, setUser] = useState(null);
  const [historique, setHistorique] = useState([]);
  const [stats, setStats] = useState({ quartiers: 0, connexions: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    const u = getUser();
    if (!u) {
      navigate("/login");
      return;
    }
    setUser(u);
    getHistorique().then((data) => {
      if (data.trajets) setHistorique(data.trajets);
    });
    getStats().then((s) => {
      if (s.quartiers != null) setStats(s);
    });
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Calcul de la distance moyenne
  const distanceMoyenne =
    historique.length > 0
      ? Math.round(
          (historique.reduce((a, t) => a + (t.distance || 0), 0) / historique.length) * 10
        ) / 10
      : 0;

  return (
    <div style={styles.page}>
      {/* En-tête */}
      <div style={styles.header}>
        <div style={styles.headerPanel}>
          <div style={styles.welcome}>
            <i className="fas fa-user-circle" style={{ color: colors.bleu, fontSize: 28 }}></i>
            Bonjour, {user?.nom || "Utilisateur"}
          </div>
          <div style={styles.subtext}>
            Tableau de bord SIOTUM — navigation, calculs et suivi de trafic.
          </div>
        </div>
        <div style={styles.rightArea}>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i>
            Déconnexion
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div style={styles.grid}>
        <div style={styles.statCard("#E8F5E9", "#A5D6A7")}>
          <div style={styles.statValue}>{historique.length}</div>
          <div style={styles.statLabel}>
            <i className="fas fa-history"></i> Trajets calculés
          </div>
        </div>
        <div style={styles.statCard("#E3F2FD", "#90CAF9")}>
          <div style={styles.statValue}>{stats.quartiers}</div>
          <div style={styles.statLabel}>
            <i className="fas fa-building"></i> Quartiers
          </div>
        </div>
        <div style={styles.statCard("#FFF3E0", "#FFCC80")}>
          <div style={styles.statValue}>{stats.connexions}</div>
          <div style={styles.statLabel}>
            <i className="fas fa-link"></i> Connexions
          </div>
        </div>
        <div style={styles.statCard("#EDE7F6", "#B39DDB")}>
          <div style={styles.statValue}>{distanceMoyenne}</div>
          <div style={styles.statLabel}>
            <i className="fas fa-road"></i> Distance moy. (km)
          </div>
        </div>
      </div>

      <div style={styles.row}>
        {/* Accès rapide */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <i className="fas fa-bolt" style={{ color: colors.orange }}></i>
            Accès rapide
          </div>

          <button
            style={styles.quickBtn(colors.vert, "#A5D6A7", "#E8F5E9")}
            onClick={() => navigate("/trajet")}
          >
            <i className="fas fa-route" style={{ color: colors.vert, fontSize: 20 }}></i>
            <div>
              <div style={styles.quickTitle}>Calculer un trajet</div>
              <div style={styles.quickSubtitle}>Trouver le chemin optimal</div>
            </div>
          </button>

          <button
            style={styles.quickBtn(colors.bleu, "#90CAF9", "#E3F2FD")}
            onClick={() => navigate("/carte")}
          >
            <i className="fas fa-map" style={{ color: colors.bleu, fontSize: 20 }}></i>
            <div>
              <div style={styles.quickTitle}>Carte interactive</div>
              <div style={styles.quickSubtitle}>Visualiser l'itinéraire en temps réel</div>
            </div>
          </button>

          <button
            style={styles.quickBtn(colors.orange, "#FFCC80", "#FFF3E0")}
            onClick={() => navigate("/trafic")}
          >
            <i className="fas fa-car-side" style={{ color: colors.orange, fontSize: 20 }}></i>
            <div>
              <div style={styles.quickTitle}>Simuler le trafic</div>
              <div style={styles.quickSubtitle}>Tester l'impact des embouteillages</div>
            </div>
          </button>

          <button
            style={styles.quickBtn(colors.violet, "#B39DDB", "#EDE7F6")}
            onClick={() => navigate("/performances")}
          >
            <i className="fas fa-chart-line" style={{ color: colors.violet, fontSize: 20 }}></i>
            <div>
              <div style={styles.quickTitle}>Performances</div>
              <div style={styles.quickSubtitle}>Comparer les algorithmes</div>
            </div>
          </button>

          <button
            style={styles.quickBtn(colors.texte, colors.bordure, colors.blanc)}
            onClick={() => navigate("/graphe")}
          >
            <i className="fas fa-project-diagram" style={{ color: colors.texte, fontSize: 20 }}></i>
            <div>
              <div style={styles.quickTitle}>Visualisation du graphe</div>
              <div style={styles.quickSubtitle}>Explorer la structure du réseau</div>
            </div>
          </button>
        </div>

        {/* Historique des trajets */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <i className="fas fa-clock" style={{ color: colors.bleu }}></i>
            Derniers trajets
          </div>

          {historique.length === 0 ? (
            <div style={styles.emptyState}>
              <i className="fas fa-map-marker-alt" style={{ marginRight: 8, opacity: 0.5 }}></i>
              Aucun trajet calculé pour le moment.
            </div>
          ) : (
            historique.slice(0, 6).map((t, index) => (
              <div
                key={t.id}
                role="button"
                tabIndex={0}
                onClick={() =>
                  navigate(
                    `/carte?depart=${encodeURIComponent(t.depart)}&destination=${encodeURIComponent(t.destination)}&auto=1`
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    navigate(
                      `/carte?depart=${encodeURIComponent(t.depart)}&destination=${encodeURIComponent(t.destination)}&auto=1`
                    );
                  }
                }}
                style={{
                  ...styles.trajetItem,
                  cursor: "pointer",
                  ...(index === Math.min(historique.length, 6) - 1 && styles.trajetItemLast),
                }}
              >
                <div style={styles.trajetRow}>
                  <span style={styles.trajetRoute}>
                    <i className="fas fa-play" style={{ fontSize: 10, color: colors.vert, marginRight: 6 }}></i>
                    {t.depart}
                    <i className="fas fa-arrow-right" style={{ fontSize: 10, margin: "0 6px", color: colors.texteMuted }}></i>
                    <i className="fas fa-flag-checkered" style={{ fontSize: 10, color: colors.rouge, marginRight: 6 }}></i>
                    {t.destination}
                  </span>
                  <span style={styles.badge("#E8F5E9", colors.vert)}>{t.distance} km</span>
                </div>
                <div style={styles.trajetMeta}>
                  <span>
                    <i className="fas fa-layer-group" style={{ fontSize: 10, marginRight: 4 }}></i>
                    {t.etapes} étapes
                  </span>
                  <span>
                    <i className="fas fa-calendar-alt" style={{ fontSize: 10, marginRight: 4 }}></i>
                    {new Date(t.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;