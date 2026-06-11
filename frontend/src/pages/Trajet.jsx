// pages/Trajet.jsx - VERSION CORRIGÉE
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getQuartiersList, calculerChemin, getCheminsAlternatifs } from "../api";
import { useTrip, estimateDuree } from "../context/TripContext";
import SearchSelect from "../components/SearchSelect";

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
    gap: 16,
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: 600,
    margin: 0,
    color: colors.bleu,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.texteMuted,
    marginTop: 6,
  },
  section: {
    display: "grid",
    gap: 24,
    gridTemplateColumns: "1.1fr 0.9fr",
  },
  card: {
    backgroundColor: colors.blanc,
    borderRadius: 16,
    padding: 24,
    border: `1px solid ${colors.bordure}`,
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 600,
    margin: 0,
    color: colors.texte,
  },
  cardSubtitle: {
    margin: 0,
    color: colors.texteMuted,
    fontSize: 13,
    lineHeight: 1.6,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    display: "block",
    marginBottom: 8,
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
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 20px",
    borderRadius: 40,
    border: "none",
    backgroundColor: colors.bleu,
    color: colors.blanc,
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    marginTop: 8,
    width: "100%",
    justifyContent: "center",
  },
  buttonDisabled: {
    backgroundColor: colors.bordure,
    cursor: "not-allowed",
  },
  buttonGhost: {
    backgroundColor: "transparent",
    border: `1px solid ${colors.bordure}`,
    color: colors.texte,
  },
  infoBox: {
    marginTop: 20,
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
    padding: 16,
    border: `1px solid ${colors.bleu}40`,
  },
  infoTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    margin: 0,
    fontSize: 13,
    color: colors.texteMuted,
  },
  resultBox: {
    backgroundColor: colors.blanc,
    borderRadius: 16,
    padding: 20,
    border: `1px solid ${colors.bordure}`,
    marginTop: 16,
  },
  resultHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 600,
    margin: 0,
    color: colors.texte,
  },
  error: {
    marginTop: 16,
    backgroundColor: "#FFF3E0",
    borderLeft: `4px solid ${colors.orange}`,
    borderRadius: 10,
    padding: "12px 16px",
    fontSize: 13,
    color: "#E65100",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  alertWarning: {
    marginTop: 16,
    backgroundColor: "#FFEBEE",
    borderLeft: `4px solid ${colors.rouge}`,
    borderRadius: 10,
    padding: "12px 16px",
    fontSize: 13,
    color: "#C62828",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  routeItems: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    marginBottom: 20,
  },
  routeChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 40,
    padding: "6px 14px",
    backgroundColor: `${colors.bleu}12`,
    color: colors.bleu,
    fontWeight: 500,
    fontSize: 13,
  },
  routeSeparator: {
    color: colors.texteMuted,
    fontSize: 12,
  },
  metrics: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginTop: 16,
  },
  metric: {
    backgroundColor: colors.grisClair,
    borderRadius: 12,
    padding: 14,
    textAlign: "center",
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: 500,
    color: colors.texteMuted,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 700,
    color: colors.texte,
  },
  emptyState: {
    marginTop: 16,
    color: colors.texteMuted,
    fontSize: 13,
    textAlign: "center",
    padding: "20px",
    backgroundColor: colors.grisClair,
    borderRadius: 12,
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
  alternativesSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTop: `1px solid ${colors.bordure}`,
  },
  alternativeItem: {
    backgroundColor: colors.grisClair,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  alternativeHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  alternativeBadge: (bgColor) => ({
    padding: "2px 8px",
    borderRadius: 20,
    backgroundColor: bgColor,
    color: colors.blanc,
    fontSize: 11,
    fontWeight: 500,
  }),
  alternativeDistance: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.texte,
  },
  alternativeDiff: {
    fontSize: 11,
    color: colors.texteMuted,
  },
  cheminAlternatif: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  petitEtape: {
    backgroundColor: `${colors.violet}20`,
    padding: "2px 8px",
    borderRadius: 16,
    fontSize: 11,
    color: colors.violet,
  },
  viewMapButton: {
    marginTop: 12,
    padding: "8px 16px",
    width: "100%",
    backgroundColor: colors.violet,
    color: colors.blanc,
    border: "none",
    borderRadius: 40,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
};

function Trajet() {
  const navigate = useNavigate();
  const {
    depart,
    destination,
    setDepart,
    setDestination,
    setGraphResults,
    conseil,
    alerte,
  } = useTrip();
  const [nodes, setNodes] = useState([]);
  const [resultat, setResultat] = useState(null);
  const [cheminsAlternatifs, setCheminsAlternatifs] = useState([]);
  const [erreur, setErreur] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getQuartiersList().then(setNodes);
  }, []);

  const calculer = async () => {
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
    setCheminsAlternatifs([]);
    setGraphResults(null);
    setLoading(true);

    try {
      const data = await getCheminsAlternatifs(depart, destination);
      
      if (data.erreur) {
        // Fallback sur calculerChemin simple
        const simpleData = await calculerChemin(depart, destination);
        if (simpleData.erreur) {
          setErreur(simpleData.erreur);
        } else if (simpleData.chemin && simpleData.chemin.length > 0) {
          setResultat(simpleData);
          setGraphResults({ chemins: [simpleData] });
        } else {
          setErreur("Aucun chemin trouvé entre ces deux quartiers");
        }
      } else if (data.chemins && data.chemins.length > 0) {
        setResultat(data.chemins[0]);
        setCheminsAlternatifs(data.chemins.slice(1));
        setGraphResults(data);
      } else {
        setErreur("Aucun chemin trouvé entre ces deux quartiers");
      }
    } catch {
      setErreur("Erreur de connexion au serveur");
    }
    
    setLoading(false);
  };

  const voirSurCarte = () => {
    if (depart && destination) {
      navigate(
        `/carte?depart=${encodeURIComponent(depart)}&destination=${encodeURIComponent(destination)}&auto=1`
      );
    } else {
      navigate("/carte");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>
            <i className="fas fa-route"></i> Calcul du trajet
          </h2>
          <p style={styles.subtitle}>
            Définissez votre point de départ et votre destination, puis visualisez le chemin optimal
          </p>
        </div>
        <button
          style={{ ...styles.button, ...styles.buttonGhost }}
          onClick={() => navigate("/")}
        >
          <i className="fas fa-arrow-left"></i>
          Retour au tableau de bord
        </button>
      </div>

      <div style={styles.section}>
        {/* Colonne gauche - Sélection */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <i className="fas fa-location-dot" style={{ color: colors.bleu, fontSize: 20 }}></i>
            <div>
              <h3 style={styles.cardTitle}>Points de sélection</h3>
              <p style={styles.cardSubtitle}>
                Choisissez un quartier de départ et un quartier d'arrivée
              </p>
            </div>
          </div>

          <div style={styles.formGroup}>
            <SearchSelect
              label={<><i className="fas fa-flag-checkered"></i> Point de départ</>}
              value={depart}
              onChange={setDepart}
              options={nodes}
              placeholder="Rechercher un quartier..."
            />
          </div>

          <div style={styles.formGroup}>
            <SearchSelect
              label={<><i className="fas fa-location-dot"></i> Destination</>}
              value={destination}
              onChange={setDestination}
              options={nodes}
              placeholder="Rechercher un quartier..."
            />
          </div>

          <button
            style={{
              ...styles.button,
              ...((!depart || !destination || loading) && styles.buttonDisabled),
            }}
            onClick={calculer}
            disabled={!depart || !destination || loading}
          >
            <i className={`fas ${loading ? "fa-spinner fa-spin" : "fa-play"}`}></i>
            {loading ? "Calcul en cours..." : "Calculer le trajet optimal"}
          </button>

          <div style={styles.infoBox}>
            <div style={styles.infoTitle}>
              <i className="fas fa-lightbulb" style={{ color: colors.bleu }}></i>
              <strong style={{ color: colors.texte }}>Astuce</strong>
            </div>
            <p style={styles.infoText}>
              Comparez différents quartiers pour voir instantanément la distance et le nombre d'étapes.
            </p>
          </div>
        </div>

        {/* Colonne droite - Résultat */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <i className="fas fa-chart-line" style={{ color: colors.vert, fontSize: 20 }}></i>
            <div>
              <h3 style={styles.cardTitle}>Résultat du trajet</h3>
              <p style={styles.cardSubtitle}>
                Le chemin optimal s'affiche automatiquement après le calcul
              </p>
            </div>
          </div>

          {loading && (
            <div style={styles.loading}>
              <i className="fas fa-spinner fa-spin"></i> Calcul du trajet en cours...
            </div>
          )}

          {conseil && !loading && (
            <div style={{
              ...styles.alertWarning,
              backgroundColor: conseil.includes("recommande") || conseil.includes("aucun") ? "#E8F5E9" : undefined,
              borderLeftColor: conseil.includes("recommande") || conseil.includes("aucun") ? colors.vert : colors.rouge,
            }}>
              <i className="fas fa-lightbulb"></i>
              <div><strong>Conseil SIOTUM</strong><div style={{ fontSize: 13, marginTop: 4 }}>{conseil}</div></div>
            </div>
          )}

          {alerte && !loading && (
            <div style={styles.alertWarning}>
              <i className="fas fa-car-side"></i>
              <div>
                <strong>{alerte.message || "Embouteillage sur votre trajet"}</strong>
                {alerte.route_impactee && (
                  <div style={{ fontSize: 12, marginTop: 4 }}>Route impactee : {alerte.route_impactee}</div>
                )}
              </div>
            </div>
          )}

          {erreur && !loading && (
            <div style={styles.error}>
              <i className="fas fa-triangle-exclamation"></i> {erreur}
            </div>
          )}

          {resultat && !loading && (
            <div style={styles.resultBox}>
              <div style={styles.resultHeader}>
                <i className="fas fa-check-circle" style={{ color: colors.vert, fontSize: 20 }}></i>
                <div style={styles.resultTitle}>
                  {resultat.evite_trafic !== false
                    ? "Trajet recommandé (évite le trafic)"
                    : alerte
                    ? "Meilleur trajet disponible"
                    : "Trajet optimal"}
                </div>
              </div>

              <div style={styles.routeItems}>
                {resultat.chemin.map((quartier, index) => (
                  <span key={`${quartier}-${index}`}>
                    <span style={styles.routeChip}>
                      {index === 0 && <i className="fas fa-play" style={{ fontSize: 10 }}></i>}
                      {index === resultat.chemin.length - 1 && (
                        <i className="fas fa-flag-checkered" style={{ fontSize: 10 }}></i>
                      )}
                      {quartier}
                    </span>
                    {index < resultat.chemin.length - 1 && (
                      <span style={styles.routeSeparator}>
                        <i className="fas fa-arrow-right"></i>
                      </span>
                    )}
                  </span>
                ))}
              </div>

              <div style={styles.metrics}>
                <div style={styles.metric}>
                  <div style={styles.metricLabel}>
                    <i className="fas fa-road"></i> Distance totale
                  </div>
                  <div style={styles.metricValue}>{resultat.distance} km</div>
                  <div style={{ fontSize: 11, color: colors.texteMuted, marginTop: 4 }}>~{estimateDuree(resultat.distance)} min</div>
                </div>
                <div style={styles.metric}>
                  <div style={styles.metricLabel}>
                    <i className="fas fa-layer-group"></i> Nombre d'étapes
                  </div>
                  <div style={styles.metricValue}>{resultat.etapes || resultat.chemin.length - 1}</div>
                </div>
              </div>

              {/* Chemins alternatifs */}
              {cheminsAlternatifs.length > 0 && (
                <div style={styles.alternativesSection}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                    <i className="fas fa-code-branch" style={{ color: colors.violet }}></i>
                    Chemins alternatifs ({cheminsAlternatifs.length})
                  </div>
                  {cheminsAlternatifs.slice(0, 3).map((alt, idx) => (
                    <div 
                      key={idx} 
                      style={{
                        ...styles.alternativeItem,
                        borderLeft: alt.evite_trafic ? `4px solid ${colors.vert}` : `4px solid ${colors.orange}`,
                      }}
                      onClick={() => setResultat(alt)}
                    >
                      <div style={styles.alternativeHeader}>
                        <span style={styles.alternativeBadge(alt.evite_trafic ? colors.vert : colors.orange)}>
                          {alt.evite_trafic ? "Sans trafic" : "Passe par trafic"} {idx + 1}
                        </span>
                        <span style={styles.alternativeDistance}>{alt.distance} km · ~{estimateDuree(alt.distance)} min</span>
                      </div>
                      <div style={styles.alternativeDiff}>
                        {alt.distance !== resultat.distance 
                          ? `Différence : ${(alt.distance - resultat.distance).toFixed(2)} km`
                          : "Distance équivalente"}
                      </div>
                      <div style={styles.cheminAlternatif}>
                        {alt.chemin.slice(0, 3).map((q, i) => (
                          <span key={i} style={styles.petitEtape}>{q}</span>
                        ))}
                        {alt.chemin.length > 3 && <span style={{ fontSize: 11, color: colors.texteMuted }}>...</span>}
                        <span style={styles.petitEtape}>{alt.chemin[alt.chemin.length - 1]}</span>
                      </div>
                    </div>
                  ))}
                  <button style={styles.viewMapButton} onClick={voirSurCarte}>
                    <i className="fas fa-map"></i> Voir tous les chemins sur la carte
                  </button>
                </div>
              )}
            </div>
          )}

          {!resultat && !loading && !erreur && (
            <div style={styles.emptyState}>
              <i className="fas fa-map-marker-alt" style={{ marginRight: 8, opacity: 0.5 }}></i>
              Aucune recherche effectuée. Sélectionnez un départ et une destination, puis lancez le calcul.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Trajet;