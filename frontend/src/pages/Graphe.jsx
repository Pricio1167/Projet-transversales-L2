import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { RefreshCcw, ArrowRight } from "lucide-react";
import { getQuartiers, calculerChemin, getItineraireRoutier, getCheminsAlternatifs } from "../api";
import { useTrip } from "../context/TripContext";

const SIMULATION_COLORS = ["#334155", "#7C3AED", "#0891B2", "#D97706"];

const theme = {
  surface: "#ffffff",
  surfaceSoft: "#f3f4f6",
  border: "#d1d5db",
  primary: "#334155",
  accent: "#d97706",
  success: "#16a34a",
  danger: "#dc2626",
  text: "#0f172a",
  textMuted: "#475569",
};

const styles = {
  page: { padding: 30, minHeight: "calc(100vh - 64px)", background: theme.surfaceSoft },
  header: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 28 },
  title: { margin: 0, fontSize: 32, fontWeight: 700, color: theme.text },
  subtitle: { fontSize: 15, color: theme.textMuted, lineHeight: 1.75, maxWidth: 760 },
  panel: { background: theme.surface, borderRadius: 20, padding: 24, border: `1px solid ${theme.border}`, boxShadow: "0 14px 28px rgba(15, 23, 42, 0.06)", marginBottom: 22 },
  controls: { display: "grid", gap: 16, gridTemplateColumns: "repeat(3, minmax(180px, 1fr))", alignItems: "end" },
  select: { width: "100%", minHeight: 48, padding: "12px 14px", borderRadius: 14, border: `1px solid ${theme.border}`, background: theme.surfaceSoft, color: theme.text, fontSize: 15, outline: "none" },
  buttonPrimary: { display: "inline-flex", alignItems: "center", gap: 10, minHeight: 48, padding: "0 18px", borderRadius: 16, border: "none", background: theme.primary, color: "white", fontWeight: 700, cursor: "pointer", fontSize: 15 },
  buttonSecondary: { display: "inline-flex", alignItems: "center", gap: 10, minHeight: 48, padding: "0 18px", borderRadius: 16, border: `1px solid ${theme.border}`, background: "#f8fafc", color: theme.text, fontWeight: 700, cursor: "pointer", fontSize: 15 },
  graphCard: { background: theme.surface, borderRadius: 24, border: `1px solid ${theme.border}`, overflow: "hidden", boxShadow: "0 14px 28px rgba(15, 23, 42, 0.06)" },
  legend: { display: "flex", flexWrap: "wrap", gap: 18, padding: 20, borderBottom: `1px solid ${theme.border}` },
  legendItem: { display: "flex", alignItems: "center", gap: 10, color: theme.textMuted, fontSize: 14 },
  dot: (color) => ({ width: 12, height: 12, borderRadius: "50%", background: color }),
  line: (color, dashed) => ({ width: 24, height: 3, background: color, borderRadius: 2, borderTop: dashed ? `3px dashed ${color}` : "none" }),
  graphFrame: { width: "100%", minHeight: 520, background: theme.surfaceSoft },
  mapContainer: { height: 520, width: "100%" },
  summary: { marginTop: 22, background: "#f8fafc", borderRadius: 20, padding: 20, border: `1px solid ${theme.border}` },
  summaryTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: theme.text },
  summaryText: { marginTop: 10, color: theme.textMuted, lineHeight: 1.7 },
  tags: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 },
  tag: { background: "rgba(217, 119, 6, 0.12)", color: theme.accent, borderRadius: 999, padding: "10px 14px", fontWeight: 600, fontSize: 13 },
  pathInfo: { display: "grid", gridTemplateColumns: "repeat(3, minmax(150px, 1fr))", gap: 16, marginTop: 20 },
  infoCard: { background: "#f8fafc", border: `1px solid ${theme.border}`, borderRadius: 18, padding: 18, color: theme.text, fontSize: 14, lineHeight: 1.7 },
  etapes: { display: "grid", gap: 8, marginTop: 12, maxHeight: 220, overflowY: "auto" },
  etape: { display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 14, background: "#f8fafc", fontSize: 13 },
};

function FitBounds({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length > 1) {
      map.fitBounds(coords, { padding: [50, 50] });
    }
  }, [coords, map]);
  return null;
}

function Graphe() {
  const [quartiers, setQuartiers] = useState({});
  const [connexions, setConnexions] = useState([]);
  const [nodes, setNodes] = useState([]);
  const { depart, destination, setDepart, setDestination } = useTrip();
  const [chemin, setChemin] = useState([]);
  const [pathInfo, setPathInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [osrmCoords, setOsrmCoords] = useState([]);
  const [osrmSteps, setOsrmSteps] = useState([]);
  const [osrmDuree, setOsrmDuree] = useState(null);
  const [osrmRoutes, setOsrmRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(0);
  const [graphAlternatives, setGraphAlternatives] = useState([]);
  const [selectedGraphAlt, setSelectedGraphAlt] = useState(0);
  const [showAlternatives, setShowAlternatives] = useState(true);

  useEffect(() => {
    getQuartiers().then((data) => {
      setQuartiers(data.quartiers || {});
      setConnexions(data.connexions || []);
      setNodes(Object.keys(data.quartiers || {}).sort());
      setDataLoaded(true);
    });
  }, []);

  const afficherChemin = async () => {
    if (!depart || !destination) return;
    setLoading(true);
    setOsrmRoutes([]);
    setOsrmCoords([]);
    setOsrmSteps([]);
    setOsrmDuree(null);
    setSelectedRoute(0);
    setChemin([]);
    setPathInfo(null);
    setGraphAlternatives([]);
    setSelectedGraphAlt(0);

    const [itineraireRes, cheminRes, alternatifsRes] = await Promise.allSettled([
      getItineraireRoutier(depart, destination),
      calculerChemin(depart, destination),
      getCheminsAlternatifs(depart, destination),
    ]);

    if (itineraireRes.status === "fulfilled" && itineraireRes.value && !itineraireRes.value.erreur && itineraireRes.value.routes?.length) {
      const routes = itineraireRes.value.routes;
      setOsrmRoutes(routes);
      const r0 = routes[0];
      setOsrmCoords(r0.chemin);
      setOsrmSteps(r0.steps || []);
      setOsrmDuree(r0.duree);
      setPathInfo({
        distance: r0.distance,
        duree: r0.duree,
        etapes: r0.steps?.length || r0.chemin.length,
        source: "osrm",
      });
    } else if (alternatifsRes.status === "fulfilled" && alternatifsRes.value && !alternatifsRes.value.erreur && alternatifsRes.value.chemins?.length) {
      const alt = alternatifsRes.value.chemins;
      setGraphAlternatives(alt);
      setSelectedGraphAlt(0);
      const r0 = alt[0];
      setChemin(r0.chemin);
      setPathInfo({
        distance: r0.distance,
        duree: null,
        etapes: r0.etapes,
        source: "graph_alt",
      });
    } else if (cheminRes.status === "fulfilled" && cheminRes.value && !cheminRes.value.erreur && cheminRes.value.chemin) {
      const data = cheminRes.value;
      setChemin(data.chemin);
      setPathInfo({
        distance: data.distance,
        duree: null,
        etapes: data.etapes,
        source: "graph",
      });
    }

    setLoading(false);
  };

  const selectRoute = (idx) => {
    setSelectedRoute(idx);
    const r = osrmRoutes[idx];
    if (r) {
      setOsrmCoords(r.chemin);
      setOsrmSteps(r.steps || []);
      setOsrmDuree(r.duree);
      setPathInfo({
        distance: r.distance,
        duree: r.duree,
        etapes: r.steps?.length || r.chemin.length,
        source: "osrm",
      });
    }
  };

  const resetGraphe = () => {
    setChemin([]);
    setPathInfo(null);
    setOsrmCoords([]);
    setOsrmSteps([]);
    setOsrmRoutes([]);
    setOsrmDuree(null);
    setDepart("");
    setDestination("");
    setGraphAlternatives([]);
    setSelectedGraphAlt(0);
  };

  const selectGraphAlt = (idx) => {
    setSelectedGraphAlt(idx);
    const r = graphAlternatives[idx];
    if (r) {
      setChemin(r.chemin);
      setPathInfo({
        distance: r.distance,
        duree: null,
        etapes: r.etapes,
        source: "graph_alt",
      });
    }
  };

  const graphCheminCoords = chemin.filter((q) => quartiers[q]).map((q) => quartiers[q]);
  const isLinkOnPath = (src, dest) => {
    for (let i = 0; i < chemin.length - 1; i++) {
      if ((chemin[i] === src && chemin[i + 1] === dest) || (chemin[i] === dest && chemin[i + 1] === src)) return true;
    }
    return false;
  };

  const displayCoords = osrmCoords.length > 1 ? osrmCoords : graphCheminCoords;
  const hasRealRoute = osrmCoords.length > 1;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Graphe interactif</h2>
          <p style={styles.subtitle}>
            Visualisez le chemin routier réel (OSRM) avec le réseau de quartiers en arrière-plan.
          </p>
        </div>
        <button type="button" style={styles.buttonSecondary} onClick={resetGraphe}>
          <RefreshCcw size={16} /> Réinitialiser
        </button>
      </div>

      <div style={styles.panel}>
        <div style={styles.controls}>
          <select style={styles.select} value={depart} onChange={(e) => setDepart(e.target.value)}>
            <option value="">Départ</option>
            {nodes.map((node) => <option key={node} value={node}>{node}</option>)}
          </select>

          <select style={styles.select} value={destination} onChange={(e) => setDestination(e.target.value)}>
            <option value="">Destination</option>
            {nodes.map((node) => <option key={node} value={node}>{node}</option>)}
          </select>

          <button style={styles.buttonPrimary} type="button" onClick={afficherChemin} disabled={!depart || !destination || loading}>
            <ArrowRight size={18} />
            Afficher le chemin
          </button>
        </div>
        <div style={{ marginTop: 14, color: theme.textMuted, fontSize: 14, display: "flex", alignItems: "center", gap: 12 }}>
          <span>Sélectionnez un point de départ et une destination, puis affichez le chemin routier réel.</span>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", marginLeft: "auto" }}>
            <input type="checkbox" checked={showAlternatives} onChange={(e) => setShowAlternatives(e.target.checked)} />
            <span style={{ fontSize: 13 }}>Afficher alternatives</span>
          </label>
        </div>
      </div>

      <div style={styles.graphCard}>
        <div style={styles.legend}>
          <div style={styles.legendItem}><div style={styles.dot(theme.success)} /> Départ</div>
          <div style={styles.legendItem}><div style={styles.dot(theme.danger)} /> Destination</div>
          <div style={styles.legendItem}><div style={{ width: 18, height: 3, background: SIMULATION_COLORS[0], borderRadius: 2 }} /> Itinéraire principal</div>
          <div style={styles.legendItem}><div style={{ width: 18, height: 3, borderTop: "3px dashed " + SIMULATION_COLORS[1] }} /> Alternative</div>
          <div style={styles.legendItem}><div style={styles.line("rgba(100, 116, 139, 0.15)", false)} /> Connexions</div>
          <div style={styles.legendItem}><div style={styles.dot("#94a3b8")} /> Quartiers</div>
        </div>
        <div style={styles.graphFrame}>
          {dataLoaded ? (
            <MapContainer center={[-18.9137, 47.5361]} zoom={13} style={styles.mapContainer} scrollWheelZoom>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />

              <FitBounds coords={displayCoords} />

              {connexions.map((edge, i) => {
                const a = quartiers[edge.src];
                const b = quartiers[edge.dest];
                if (!a || !b) return null;
                return (
                  <Polyline key={`edge-${i}`} positions={[a, b]}
                    color="rgba(100, 116, 139, 0.15)" weight={1} opacity={0.4}
                  />
                );
              })}

              {osrmRoutes.length > 0 ? (
                osrmRoutes.map((r, idx) => {
                  if (!showAlternatives && idx !== selectedRoute) return null;
                  const color = SIMULATION_COLORS[idx] || "#334155";
                  return (
                    <Polyline key={`osrm-${idx}`} positions={r.chemin}
                      color={color}
                      weight={idx === selectedRoute ? 5 : 2.5}
                      opacity={idx === selectedRoute ? 0.95 : 0.5}
                      dashArray={idx === selectedRoute ? null : [10, 8]}
                    />
                  );
                })
              ) : graphAlternatives.length > 0 ? (
                graphAlternatives.map((r, idx) => {
                  if (!showAlternatives && idx !== selectedGraphAlt) return null;
                  const color = SIMULATION_COLORS[idx % SIMULATION_COLORS.length];
                  const coords = r.chemin
                    .filter((q) => quartiers[q])
                    .map((q) => quartiers[q]);
                  return (
                    <Polyline key={`graph-alt-${idx}`} positions={coords}
                      color={color}
                      weight={idx === selectedGraphAlt ? 5 : 2.5}
                      opacity={idx === selectedGraphAlt ? 0.95 : 0.4}
                      dashArray={idx === selectedGraphAlt ? null : [8, 6]}
                    />
                  );
                })
              ) : graphCheminCoords.length > 1 && (
                <Polyline positions={graphCheminCoords}
                  color={theme.accent} weight={4} opacity={0.95}
                />
              )}

              {Object.entries(quartiers).map(([nom, coords]) => {
                const isDepart = nom === depart;
                const isDest = nom === destination;
                const onPath = chemin.includes(nom);
                if (!isDepart && !isDest && !onPath) {
                  return (
                    <CircleMarker key={nom} center={coords} radius={3}
                      fillColor="#94a3b8" color="#ffffff" weight={0.5} fillOpacity={0.3}
                    >
                      <Popup><strong>{nom}</strong></Popup>
                    </CircleMarker>
                  );
                }
                const color = isDepart ? theme.success : isDest ? theme.danger : theme.accent;
                return (
                  <CircleMarker key={nom} center={coords} radius={isDepart || isDest ? 10 : 7}
                    fillColor={color} color="#ffffff"
                    weight={isDepart || isDest ? 3 : 2} fillOpacity={0.95}
                  >
                    <Popup>
                      <strong>{nom}</strong>
                      {isDepart && <div style={{ color: theme.success, fontSize: 12 }}>Départ</div>}
                      {isDest && <div style={{ color: theme.danger, fontSize: 12 }}>Destination</div>}
                      {onPath && !isDepart && !isDest && <div style={{ color: theme.accent, fontSize: 12 }}>Étape intermédiaire</div>}
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          ) : (
            <div style={{ padding: 40, textAlign: "center", color: theme.textMuted }}>Chargement des données...</div>
          )}
        </div>
      </div>

      {osrmRoutes.length > 1 && (
        <div style={styles.summary}>
          <div style={styles.summaryTitle}>Choix de l'itinéraire</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            {osrmRoutes.map((r, idx) => (
              <button key={idx} type="button"
                style={{
                  ...styles.tag,
                  cursor: "pointer",
                  border: idx === selectedRoute ? `2px solid ${theme.primary}` : "2px solid transparent",
                  background: idx === selectedRoute ? "rgba(51, 65, 85, 0.1)" : "rgba(217, 119, 6, 0.08)",
                  color: idx === selectedRoute ? theme.primary : theme.accent,
                }}
                onClick={() => selectRoute(idx)}
              >
                {idx === 0 ? "Recommandé" : `Alternative ${idx}`} — {r.distance} km · {r.duree} min
              </button>
            ))}
          </div>
        </div>
      )}

      {graphAlternatives.length > 1 && (
        <div style={styles.summary}>
          <div style={styles.summaryTitle}>Chemins alternatifs (graphe)</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            {graphAlternatives.map((r, idx) => (
              <button key={idx} type="button"
                style={{
                  ...styles.tag,
                  cursor: "pointer",
                  border: idx === selectedGraphAlt ? `2px solid ${theme.accent}` : "2px solid transparent",
                  background: idx === selectedGraphAlt ? "rgba(217, 119, 6, 0.15)" : "rgba(51, 65, 85, 0.06)",
                  color: idx === selectedGraphAlt ? theme.accent : theme.primary,
                }}
                onClick={() => selectGraphAlt(idx)}
              >
                {idx === 0 ? "Recommandé" : `Alternative ${idx}`} — {r.distance} km · {r.etapes} étapes
              </button>
            ))}
          </div>
        </div>
      )}

      {pathInfo && (
        <div style={styles.summary}>
          <div style={styles.summaryTitle}>
            {pathInfo.source === "osrm" ? "Résumé du trajet réel (OSRM)" : pathInfo.source === "graph_alt" ? "Résumé du chemin alternatif (graphe)" : "Résumé du chemin (graphe)"}
          </div>
          <div style={styles.pathInfo}>
            <div style={styles.infoCard}><strong>Départ</strong><div>{depart}</div></div>
            <div style={styles.infoCard}><strong>Destination</strong><div>{destination}</div></div>
            <div style={styles.infoCard}><strong>Distance réelle</strong><div>{pathInfo.distance} km</div></div>
            {pathInfo.duree != null && (
              <div style={styles.infoCard}><strong>Durée estimée</strong><div>{pathInfo.duree} min</div></div>
            )}
            <div style={styles.infoCard}><strong>Étapes</strong><div>{pathInfo.etapes}</div></div>
          </div>

          {osrmSteps.length > 0 && (
            <>
              <p style={styles.summaryText}>Instructions pas à pas :</p>
              <div style={styles.etapes}>
                {osrmSteps.map((step, i) => (
                  <div key={i} style={styles.etape}>
                    <div style={styles.dot(i === 0 ? theme.success : i === osrmSteps.length - 1 ? theme.danger : theme.accent)} />
                    <div style={{ flex: 1 }}>{step.instruction}</div>
                    <div style={{ color: theme.textMuted, textAlign: "right", minWidth: 60, fontSize: 12 }}>{step.distance} km</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!hasRealRoute && chemin.length > 0 && (
            <>
              <p style={styles.summaryText}>Quartiers traversés (graphe) :</p>
              <div style={styles.tags}>
                {chemin.map((node, index) => (
                  <div key={`${node}-${index}`} style={{
                    ...styles.tag,
                    ...(index === 0 ? { background: "rgba(22, 163, 74, 0.12)", color: theme.success } : {}),
                    ...(index === chemin.length - 1 ? { background: "rgba(220, 38, 38, 0.12)", color: theme.danger } : {}),
                  }}>
                    {index === 0 ? "Départ" : index === chemin.length - 1 ? "Arrivée" : index} : {node}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default Graphe;
