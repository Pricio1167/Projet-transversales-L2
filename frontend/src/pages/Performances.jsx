// pages/Performances.jsx - VERSION CORRIGÉE
import { useState, useEffect } from "react";
import { getQuartiersList, getPerformances } from "../api";
import { useTrip } from "../context/TripContext";

// Palette IHM
const colors = {
  bleu: "#0066CC",
  blanc: "#FFFFFF",
  grisClair: "#F5F7FA",
  vert: "#2E7D32",
  orange: "#F57C00",
  rouge: "#D32F2F",
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
  title: {
    fontSize: 28,
    fontWeight: 600,
    marginBottom: 4,
    color: colors.bleu,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.texteMuted,
    marginBottom: 28,
  },
  card: {
    backgroundColor: colors.blanc,
    borderRadius: 16,
    padding: 24,
    border: `1px solid ${colors.bordure}`,
    maxWidth: 800,
    margin: "0 auto",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    display: "block",
    marginBottom: 6,
    fontSize: 13,
    fontWeight: 500,
    color: colors.texte,
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${colors.bordure}`,
    backgroundColor: colors.blanc,
    fontSize: 14,
    color: colors.texte,
    outline: "none",
    cursor: "pointer",
  },
  button: {
    width: "100%",
    padding: "12px",
    borderRadius: 40,
    border: "none",
    backgroundColor: colors.bleu,
    color: colors.blanc,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: colors.bordure,
    cursor: "not-allowed",
  },
  result: {
    marginTop: 28,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    marginBottom: 24,
  },
  algoCard: (bgColor, borderColor) => ({
    backgroundColor: bgColor,
    border: `1px solid ${borderColor}`,
    borderRadius: 12,
    padding: 20,
    textAlign: "center",
  }),
  algoTitle: {
    fontSize: 13,
    fontWeight: 500,
    color: colors.texteMuted,
    marginBottom: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  algoValue: (color) => ({
    fontSize: 32,
    fontWeight: 700,
    color: color,
  }),
  algoSub: {
    fontSize: 12,
    color: colors.texteMuted,
    marginTop: 6,
  },
  barContainer: {
    marginTop: 20,
    backgroundColor: colors.grisClair,
    borderRadius: 12,
    padding: 16,
  },
  barLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: colors.texte,
    marginBottom: 12,
  },
  barItem: {
    marginBottom: 12,
  },
  barWrapper: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  barLegend: {
    width: 60,
    fontSize: 12,
    fontWeight: 500,
    color: colors.texteMuted,
  },
  bar: (width, bgColor) => ({
    flex: 1,
    height: 28,
    width: `${width}%`,
    backgroundColor: bgColor,
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    paddingLeft: 10,
    fontSize: 12,
    fontWeight: 600,
    color: colors.blanc,
    transition: "width 0.5s ease",
    minWidth: 60,
  }),
  chemin: {
    marginTop: 20,
    backgroundColor: colors.grisClair,
    borderRadius: 12,
    padding: 16,
  },
  cheminTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.texte,
    marginBottom: 10,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  etapes: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  etape: {
    backgroundColor: `${colors.bleu}20`,
    padding: "4px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
    color: colors.bleu,
  },
  etapeSeparator: {
    color: colors.texteMuted,
    fontSize: 12,
  },
  distance: {
    marginTop: 12,
    fontSize: 13,
    color: colors.texte,
  },
  distanceValue: {
    fontWeight: 700,
    color: colors.vert,
  },
  alert: {
    marginTop: 16,
    backgroundColor: "#FFF3E0",
    borderLeft: `4px solid ${colors.orange}`,
    borderRadius: 10,
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 13,
    color: "#E65100",
  },
  success: {
    marginTop: 16,
    backgroundColor: "#E8F5E9",
    borderLeft: `4px solid ${colors.vert}`,
    borderRadius: 10,
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 13,
    color: "#1B5E20",
  },
  loading: {
    marginTop: 16,
    textAlign: "center",
    color: colors.texteMuted,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyState: {
    marginTop: 20,
    color: colors.texteMuted,
    fontSize: 13,
    textAlign: "center",
    padding: "30px",
    backgroundColor: colors.grisClair,
    borderRadius: 12,
  },
};

function Performances() {
  const [nodes, setNodes] = useState([]);
  const { depart, destination, setDepart, setDestination } = useTrip();
  const [resultat, setResultat] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    getQuartiersList().then(setNodes);
  }, []);

  const tester = async () => {
    if (!depart || !destination) {
      setErreur("Veuillez sélectionner un départ et une destination");
      return;
    }
    
    if (depart === destination) {
      setErreur("Le départ et la destination ne peuvent pas être identiques");
      return;
    }
    
    setErreur("");
    setResultat(null);
    setLoading(true);
    
    const data = await getPerformances(depart, destination);
    
    if (data.erreur) {
      setErreur(data.erreur);
    } else if (data.chemin && data.chemin.length > 0) {
      setResultat(data);
    } else {
      setErreur("Aucun chemin trouvé entre ces deux quartiers");
    }
    
    setLoading(false);
  };

  const maxTemps = resultat
    ? Math.max(resultat.temps_tas_binaire_ms, resultat.temps_sans_tas_ms, 1)
    : 1;

  const acceleration = resultat && resultat.temps_sans_tas_ms > 0
    ? (resultat.temps_sans_tas_ms / resultat.temps_tas_binaire_ms).toFixed(2)
    : 0;

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>
        <i className="fas fa-chart-line"></i> Comparaison des performances
      </h2>
      <p style={styles.subtitle}>
        Dijkstra avec tas binaire O((V+E) log V) vs Dijkstra simple O(n²)
      </p>

      <div style={styles.card}>
        <div style={styles.formGroup}>
          <label style={styles.label}>
            <i className="fas fa-flag-checkered"></i> Point de départ
          </label>
          <select
            style={styles.select}
            value={depart}
            onChange={(e) => setDepart(e.target.value)}
          >
            <option value="">Sélectionner un quartier</option>
            {nodes.slice(0, 200).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>
            <i className="fas fa-location-dot"></i> Destination
          </label>
          <select
            style={styles.select}
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          >
            <option value="">Sélectionner un quartier</option>
            {nodes.slice(0, 200).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <button
          style={{
            ...styles.button,
            ...((!depart || !destination || loading) && styles.buttonDisabled),
          }}
          onClick={tester}
          disabled={!depart || !destination || loading}
        >
          <i className={`fas ${loading ? "fa-spinner fa-spin" : "fa-chart-simple"}`}></i>
          {loading ? "Test en cours..." : "Comparer les algorithmes"}
        </button>

        {erreur && (
          <div style={styles.alert}>
            <i className="fas fa-triangle-exclamation"></i> {erreur}
          </div>
        )}

        {loading && (
          <div style={styles.loading}>
            <i className="fas fa-spinner fa-spin"></i> Calcul des performances...
          </div>
        )}

        {resultat && (
          <div style={styles.result}>
            <div style={styles.grid}>
              <div style={styles.algoCard("#E8F5E9", "#A5D6A7")}>
                <div style={styles.algoTitle}>
                  <i className="fas fa-rocket"></i> Dijkstra + Tas binaire
                </div>
                <div style={styles.algoValue(colors.vert)}>
                  {resultat.temps_tas_binaire_ms} ms
                </div>
                <div style={styles.algoSub}>O((V+E) log V)</div>
              </div>

              <div style={styles.algoCard("#FFEBEE", "#FFCDD2")}>
                <div style={styles.algoTitle}>
                  <i className="fas fa-tachometer-alt"></i> Dijkstra simple
                </div>
                <div style={styles.algoValue(colors.rouge)}>
                  {resultat.temps_sans_tas_ms} ms
                </div>
                <div style={styles.algoSub}>O(n²)</div>
              </div>
            </div>

            <div style={styles.barContainer}>
              <div style={styles.barLabel}>
                <i className="fas fa-chart-bar"></i> Comparaison visuelle
              </div>

              <div style={styles.barItem}>
                <div style={styles.barWrapper}>
                  <span style={styles.barLegend}>Tas binaire</span>
                  <div
                    style={styles.bar(
                      (resultat.temps_tas_binaire_ms / maxTemps) * 100,
                      colors.vert
                    )}
                  >
                    {resultat.temps_tas_binaire_ms} ms
                  </div>
                </div>
              </div>

              <div style={styles.barItem}>
                <div style={styles.barWrapper}>
                  <span style={styles.barLegend}>Simple</span>
                  <div
                    style={styles.bar(
                      (resultat.temps_sans_tas_ms / maxTemps) * 100,
                      colors.rouge
                    )}
                  >
                    {resultat.temps_sans_tas_ms} ms
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.chemin}>
              <div style={styles.cheminTitle}>
                <i className="fas fa-road"></i> Chemin trouvé
              </div>
              <div style={styles.etapes}>
                {resultat.chemin.map((q, i) => (
                  <span key={`${q}-${i}`}>
                    <span style={styles.etape}>
                      {i === 0 && <i className="fas fa-play" style={{ fontSize: 10, marginRight: 4 }}></i>}
                      {i === resultat.chemin.length - 1 && (
                        <i className="fas fa-flag-checkered" style={{ fontSize: 10, marginRight: 4 }}></i>
                      )}
                      {q}
                    </span>
                    {i < resultat.chemin.length - 1 && (
                      <span style={styles.etapeSeparator}>
                        <i className="fas fa-arrow-right"></i>
                      </span>
                    )}
                  </span>
                ))}
              </div>
              <div style={styles.distance}>
                <i className="fas fa-arrows-left-right"></i> Distance totale :{" "}
                <span style={styles.distanceValue}>{resultat.distance} km</span>
              </div>
            </div>

            {/* Indicateur de performance */}
            {resultat.temps_tas_binaire_ms < resultat.temps_sans_tas_ms && (
              <div style={styles.success}>
                <i className="fas fa-check-circle"></i>
                Le tas binaire est <strong>{acceleration}× plus rapide</strong> pour ce trajet
                {resultat.temps_tas_binaire_ms === 0 && " (< 1 ms)"}
              </div>
            )}
            
            {resultat.temps_tas_binaire_ms >= resultat.temps_sans_tas_ms && resultat.temps_sans_tas_ms > 0 && (
              <div style={styles.alert}>
                <i className="fas fa-info-circle"></i>
                Les deux algorithmes ont des performances similaires pour ce petit graphe
              </div>
            )}
          </div>
        )}

        {!resultat && !loading && !erreur && depart && destination && (
          <div style={styles.emptyState}>
            <i className="fas fa-chart-line" style={{ marginRight: 8, opacity: 0.5 }}></i>
            Cliquez sur "Comparer les algorithmes" pour lancer le test
          </div>
        )}
      </div>
    </div>
  );
}

export default Performances;