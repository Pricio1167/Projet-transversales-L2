// pages/Trafic.jsx - VERSION CORRIGÉE
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getQuartiersList, simulerTrafic, getCheminsAlternatifs, getTraficActif, resetTrafic } from "../api";
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
  rougeTrafic: "#FF0000",
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
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 24,
    alignItems: "start",
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
    marginBottom: 6,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.texteMuted,
    marginBottom: 20,
    borderBottom: `1px solid ${colors.bordure}`,
    paddingBottom: 12,
  },
  formGroup: {
    marginBottom: 16,
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
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${colors.bordure}`,
    backgroundColor: colors.blanc,
    fontSize: 14,
    color: colors.texte,
    boxSizing: "border-box",
    outline: "none",
  },
  button: (bgColor) => ({
    width: "100%",
    padding: "12px",
    borderRadius: 40,
    border: "none",
    backgroundColor: bgColor,
    color: colors.blanc,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  }),
  buttonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  success: {
    marginTop: 16,
    backgroundColor: "#E8F5E9",
    borderLeft: `4px solid ${colors.vert}`,
    borderRadius: 10,
    padding: "12px 16px",
    fontSize: 13,
    color: "#1B5E20",
    display: "flex",
    alignItems: "center",
    gap: 8,
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
    gap: 8,
  },
  alertDanger: {
    marginTop: 16,
    backgroundColor: "#FFEBEE",
    borderLeft: `4px solid ${colors.rougeTrafic}`,
    borderRadius: 10,
    padding: "12px 16px",
    fontSize: 13,
    color: "#C62828",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  result: {
    marginTop: 16,
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
    padding: 16,
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.bleu,
    marginBottom: 10,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  chemin: {
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
  metaInfo: {
    marginTop: 12,
    fontSize: 13,
    color: colors.texte,
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  badge: {
    backgroundColor: colors.vert,
    color: colors.blanc,
    padding: "4px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
  },
  infoRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  alternativesList: {
    marginTop: 16,
    paddingTop: 12,
    borderTop: `1px solid ${colors.bordure}`,
  },
  alternativeItem: {
    backgroundColor: colors.grisClair,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    cursor: "pointer",
  },
  alternativeBadge: (color) => ({
    padding: "2px 8px",
    borderRadius: 12,
    backgroundColor: color,
    color: colors.blanc,
    fontSize: 10,
    fontWeight: 500,
  }),
  viewButton: {
    marginTop: 12,
    padding: "8px 16px",
    width: "100%",
    backgroundColor: colors.violet,
    color: colors.blanc,
    border: "none",
    borderRadius: 40,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  traficList: {
    marginTop: 16,
    maxHeight: 200,
    overflowY: "auto",
  },
  traficItem: {
    backgroundColor: "#FFEBEE",
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    borderLeft: `3px solid ${colors.rougeTrafic}`,
  },
};

function Trafic() {
  const navigate = useNavigate();
  const {
    depart,
    destination,
    setDepart,
    setDestination,
    setGraphResults,
    setTraficRoute,
    conseil,
    alerte,
  } = useTrip();
  const [nodes, setNodes] = useState([]);
  const [traficSrc, setTraficSrc] = useState("");
  const [traficDest, setTraficDest] = useState("");
  const [traficPoids, setTraficPoids] = useState("");
  const [traficMsg, setTraficMsg] = useState("");
  const [traficError, setTraficError] = useState("");
  const [traficActif, setTraficActif] = useState([]);
  const [resultat, setResultat] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [trajetImpacte, setTrajetImpacte] = useState(false); // chemin principal passe par zone trafic
  const [loadingTrafic, setLoadingTrafic] = useState(false);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);

  // Charger les trafics actifs
  const chargerTraficActif = async () => {
    const data = await getTraficActif();
    if (data.trafics) {
      setTraficActif(data.trafics);
    }
  };

  useEffect(() => {
    getQuartiersList().then(setNodes);
    chargerTraficActif();
    
    // Rafraîchir toutes les 10 secondes
    const interval = setInterval(chargerTraficActif, 10000);
    return () => clearInterval(interval);
  }, []);

  const appliquerTrafic = async () => {
    const poids = parseFloat(traficPoids);
    if (!traficSrc || !traficDest || Number.isNaN(poids) || poids <= 0) {
      setTraficError("Veuillez renseigner tous les champs");
      return;
    }
    
    setTraficError("");
    setTraficMsg("");
    setAlternatives([]);
    setTrajetImpacte(false);
    setLoadingTrafic(true);

    const data = await simulerTrafic(traficSrc, traficDest, poids);
    
    if (data.erreur) {
      setTraficError(data.erreur);
      setLoadingTrafic(false);
      return;
    }
    
    const appliedSrc = data.src || traficSrc;
    const appliedDest = data.dest || traficDest;
    setTraficMsg(data.message || `Trafic appliqué sur ${appliedSrc} → ${appliedDest}`);
    
    // Rafraîchir la liste des trafics actifs
    await chargerTraficActif();
    
    // Si un trajet est défini, chercher des alternatives et détecter si chemin principal impacté
    if (depart && destination) {
      setLoadingAlternatives(true);
      const altData = await getCheminsAlternatifs(depart, destination, [appliedSrc, appliedDest]);
      if (altData.chemins && altData.chemins.length > 0) {
        const meilleur = altData.chemins[0];
        setResultat(meilleur);
        if (altData.chemins.length > 1) {
          setAlternatives(altData.chemins.slice(1));
        }
        setGraphResults(altData);
        setTraficRoute([appliedSrc, appliedDest]);

        // Vérifier si le chemin optimal retourné contient la zone embouteillée
        // ou si l'alerte backend signale un impact
        const cheminImpacte =
          altData.alerte?.route != null ||
          meilleur.contient_trafic === true ||
          (meilleur.routes_trafic && meilleur.routes_trafic.length > 0);
        setTrajetImpacte(cheminImpacte);
      } else if (altData.erreur) {
        setTraficError(altData.erreur);
      }
      setLoadingAlternatives(false);
    }
    
    setLoadingTrafic(false);
  };

  const resetTraficHandler = async () => {
    if (!traficSrc || !traficDest) {
      setTraficError("Sélectionnez une route à réinitialiser");
      return;
    }
    const data = await resetTrafic(traficSrc, traficDest);
    if (data.message) {
      setTraficMsg(data.message);
      setTrajetImpacte(false);
      await chargerTraficActif();
      setTraficRoute(null);
      if (depart && destination) {
        const altData = await getCheminsAlternatifs(depart, destination);
        if (altData.chemins?.length) {
          setResultat(altData.chemins[0]);
          setAlternatives(altData.chemins.slice(1) || []);
          setGraphResults(altData);
        }
      }
    } else {
      setTraficError(data.erreur);
    }
  };

  const voirSurCarte = () => {
    const preferAlt = alternatives.length > 0 || trajetImpacte;
    if (depart && destination) {
      navigate(`/carte?depart=${encodeURIComponent(depart)}&destination=${encodeURIComponent(destination)}&auto=1&alts=1${preferAlt ? "&pref=alt" : ""}`);
    } else {
      navigate("/carte");
    }
  };

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>
        <i className="fas fa-car-side"></i> Simulation de trafic
      </h2>
      <p style={styles.subtitle}>
        Simulez une perturbation et analysez son impact sur un itinéraire.
      </p>

      <div style={styles.grid}>
        {/* Carte gauche - Simulation trafic */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <i className="fas fa-triangle-exclamation" style={{ color: colors.orange }}></i>
            Appliquer un embouteillage
          </div>
          <div style={styles.cardSubtitle}>
            Appliquez une perturbation sur une <strong>liaison directe</strong> entre deux quartiers voisins
            (ex. 67 Hectares ↔ Isotry). Pas un trajet multi-etapes.
          </div>

          <div style={styles.formGroup}>
            <SearchSelect
              label={<><i className="fas fa-flag-checkered"></i> Route source</>}
              value={traficSrc}
              onChange={setTraficSrc}
              options={nodes}
              placeholder="Rechercher un quartier..."
            />
          </div>

          <div style={styles.formGroup}>
            <SearchSelect
              label={<><i className="fas fa-location-dot"></i> Route destination</>}
              value={traficDest}
              onChange={setTraficDest}
              options={nodes}
              placeholder="Rechercher un quartier..."
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}><i className="fas fa-weight-hanging"></i> Nouveau poids (km)</label>
            <input type="number" step="0.1" style={styles.input} value={traficPoids} onChange={(e) => setTraficPoids(e.target.value)} placeholder="Ex: 15.0" />
          </div>

          <button style={{ ...styles.button(colors.orange), ...(loadingTrafic && styles.buttonDisabled) }} onClick={appliquerTrafic} disabled={loadingTrafic}>
            <i className={`fas ${loadingTrafic ? "fa-spinner fa-spin" : "fa-car-burst"}`}></i>
            {loadingTrafic ? "Application..." : "Appliquer le trafic"}
          </button>

          <button
            style={{
              ...styles.button(colors.blanc),
              borderWidth: 1,
              borderColor: colors.bordure,
              color: colors.texte,
              marginTop: 0,
            }}
            onClick={resetTraficHandler}
          >
            <i className="fas fa-undo-alt"></i> Réinitialiser cette route
          </button>

          {traficError && (
            <div style={styles.error}><i className="fas fa-circle-exclamation"></i> {traficError}</div>
          )}
          
          {traficMsg && !traficError && (
            <div style={styles.success}><i className="fas fa-check-circle"></i> {traficMsg}</div>
          )}

          {/* Liste des trafics actifs */}
          {traficActif.length > 0 && (
            <div style={styles.traficList}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, marginTop: 12 }}>
                <i className="fas fa-car-side" style={{ color: colors.rougeTrafic }}></i> Trafics actifs
              </div>
              {traficActif.map((t, idx) => (
                <div key={idx} style={styles.traficItem}>
                  <strong>{t.src} → {t.dest}</strong>
                  <div style={{ fontSize: 11 }}>
                    Poids: {t.poids_original} km → {t.poids_actuel} km
                    <span style={{ color: colors.rougeTrafic, marginLeft: 8 }}>
                      (+{(t.poids_actuel - t.poids_original).toFixed(1)} km)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Carte droite - Trajet */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <i className="fas fa-route" style={{ color: colors.bleu }}></i>
            Votre trajet
          </div>
          <div style={styles.cardSubtitle}>Définissez votre trajet pour voir l'impact du trafic</div>

          <div style={styles.formGroup}>
            <SearchSelect
              label={<><i className="fas fa-flag-checkered"></i> Départ</>}
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

          {conseil && (
            <div style={{ ...styles.success, marginTop: 12 }}>
              <i className="fas fa-lightbulb"></i> {conseil}
            </div>
          )}

          {alerte && (
            <div style={{ ...styles.alertDanger, marginTop: 12 }}>
              <i className="fas fa-car-side"></i> {alerte.message}
            </div>
          )}

          {/* Alerte explicite : le trajet principal passe par l'embouteillage */}
          {trajetImpacte && alternatives.length > 0 && (
            <div style={{
              marginTop: 16,
              backgroundColor: "#FFEBEE",
              borderLeft: `5px solid ${colors.rougeTrafic}`,
              borderRadius: 12,
              padding: "14px 16px",
              fontSize: 13,
              color: "#B71C1C",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, marginBottom: 6 }}>
                <i className="fas fa-triangle-exclamation"></i>
                Le trajet {depart} → {destination} traverse la zone perturbée {traficSrc} → {traficDest}.
              </div>
              <div style={{ marginBottom: 8 }}>
                {alternatives.length} itinéraire(s) alternatif(s) disponible(s) pour éviter cet embouteillage :
              </div>
              {alternatives.slice(0, 2).map((alt, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontSize: 12 }}>
                  <span style={{ background: i === 0 ? colors.vert : colors.violet, color: "#fff", borderRadius: 10, padding: "2px 8px", fontWeight: 600 }}>
                    Alt. {i + 1}
                  </span>
                  {alt.chemin?.slice(0, 3).join(" → ")}… — <strong>{alt.distance} km</strong>
                  {alt.evite_trafic && <span style={{ color: colors.vert, fontWeight: 600 }}> · Sans trafic ✓</span>}
                </div>
              ))}
              <button style={{ ...styles.button(colors.vert), marginTop: 10 }} onClick={() => { setResultat(alternatives[0]); voirSurCarte(); }}>
                <i className="fas fa-map"></i> Voir l'itinéraire alternatif sur la carte
              </button>
            </div>
          )}

          {/* Message si le trajet n'est pas impacté */}
          {traficMsg && !trajetImpacte && depart && destination && !loadingAlternatives && resultat && (
            <div style={{ ...styles.success, marginTop: 12 }}>
              <i className="fas fa-check-circle"></i> Votre trajet {depart} → {destination} n'est pas affecté par cet embouteillage.
            </div>
          )}

          {loadingAlternatives && (
            <div style={styles.success}><i className="fas fa-spinner fa-spin"></i> Recherche d'alternatives...</div>
          )}

          {resultat && !loadingAlternatives && (
            <div style={styles.result}>
              <div style={styles.resultTitle}>
                <i className="fas fa-check-circle" style={{ color: colors.vert }}></i>
                {alternatives.length > 0 ? "Trajet sans embouteillage" : "Trajet optimal"}
              </div>
              <div style={styles.chemin}>
                {resultat.chemin.slice(0, 5).map((q, i) => (
                  <span key={i}>
                    <span style={styles.etape}>
                      {i === 0 && <i className="fas fa-play" style={{ fontSize: 10, marginRight: 4 }}></i>}
                      {q}
                    </span>
                    {i < resultat.chemin.length - 1 && i < 4 && (
                      <span style={{ margin: "0 4px" }}><i className="fas fa-arrow-right" style={{ fontSize: 10 }}></i></span>
                    )}
                  </span>
                ))}
                {resultat.chemin.length > 5 && <span style={styles.etape}>...</span>}
              </div>
              <div style={styles.metaInfo}>
                <div style={styles.infoRow}><i className="fas fa-road"></i> <strong>{resultat.distance} km · ~{estimateDuree(resultat.distance)} min</strong></div>
                <div style={styles.infoRow}><i className="fas fa-location-dot"></i> {resultat.etapes} étapes</div>
              </div>
            </div>
          )}

          {alternatives.length > 0 && (
            <div style={styles.alternativesList}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}><i className="fas fa-code-branch"></i> {alternatives.length} alternative(s)</div>
              {alternatives.slice(0, 2).map((alt, idx) => (
                <div key={idx} style={styles.alternativeItem} onClick={() => setResultat(alt)}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={styles.alternativeBadge(idx === 0 ? colors.vert : colors.violet)}>Alternative {idx + 1}</span>
                    <span style={{ fontWeight: 600 }}>{alt.distance} km · ~{estimateDuree(alt.distance)} min</span>
                  </div>
                  <div style={{ fontSize: 11, color: colors.texteMuted, marginTop: 4 }}>
                    {alt.chemin.slice(0, 3).join(" → ")}...
                  </div>
                </div>
              ))}
              <button style={styles.viewButton} onClick={voirSurCarte}>
                <i className="fas fa-map"></i> Voir sur la carte
              </button>
            </div>
          )}

          {!resultat && depart && destination && !loadingAlternatives && (
            <div style={styles.error}>
              <i className="fas fa-info-circle"></i> Appliquez un trafic pour voir l'impact
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Trafic;