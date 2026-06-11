import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { RefreshCcw, Compass, ArrowRight, Play } from "lucide-react";
import { getQuartiers, getItineraireRoutier, getCheminsAlternatifs } from "../api";
import { useTrip, estimateDuree } from "../context/TripContext";

const SIMULATION_COLORS = ["#334155", "#7C3AED", "#0891B2", "#D97706"];

function FitBounds({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length > 1) {
      map.fitBounds(coords, { padding: [50, 50] });
    }
  }, [coords, map]);
  return null;
}

function SimulationMarker({ coords, active }) {
  const map = useMap();
  const markerRef = useRef(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active || coords.length < 2) return;
    setIndex(0);
    const el = L.circleMarker(coords[0], {
      radius: 8, fillColor: "#D97706", color: "#ffffff", weight: 2, fillOpacity: 1,
    }).addTo(map);
    markerRef.current = el;

    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= coords.length) { step = 0; }
      el.setLatLng(coords[step]);
      setIndex(step);
    }, 800);

    return () => { clearInterval(interval); if (el) map.removeLayer(el); };
  }, [active, coords, map]);

  useEffect(() => {
    if (!active && markerRef.current) {
      map.removeLayer(markerRef.current);
      markerRef.current = null;
      setIndex(0);
    }
  }, [active, map]);

  return null;
}

const theme = {
  surface: "#ffffff",
  surfaceSoft: "#f3f4f6",
  border: "#d1d5db",
  primary: "#334155",
  success: "#16a34a",
  warning: "#c2410c",
  danger: "#b91c1c",
  text: "#0f172a",
  textMuted: "#475569",
};

const styles = {
  page: { padding: 30, minHeight: "calc(100vh - 64px)", background: theme.surfaceSoft },
  header: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 28 },
  title: { margin: 0, fontSize: 32, fontWeight: 700, color: theme.text },
  subtitle: { fontSize: 15, color: theme.textMuted, lineHeight: 1.7, maxWidth: 760 },
  container: { display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 },
  sidebar: { display: "grid", gap: 18 },
  card: { background: theme.surface, borderRadius: 20, padding: 22, border: `1px solid ${theme.border}`, boxShadow: "0 14px 28px rgba(15, 23, 42, 0.06)" },
  cardTitle: { fontSize: 18, fontWeight: 600, marginBottom: 16, color: theme.text },
  label: { display: "block", marginBottom: 8, color: theme.textMuted, fontSize: 13 },
  searchWrapper: { position: "relative" },
  searchInput: { width: "100%", minHeight: 42, padding: "10px 14px", borderRadius: 14, border: `1px solid ${theme.border}`, background: theme.surfaceSoft, color: theme.text, fontSize: 14, outline: "none" },
  dropdown: { position: "absolute", top: "100%", left: 0, right: 0, background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 14, maxHeight: 220, overflowY: "auto", zIndex: 9999 },
  dropdownItem: { padding: "12px 14px", cursor: "pointer", fontSize: 14, color: theme.text },
  button: { display: "inline-flex", alignItems: "center", gap: 8, minHeight: 40, padding: "0 14px", borderRadius: 16, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700 },
  buttonSmall: { display: "inline-flex", alignItems: "center", justifyContent: "space-between", gap: 8, width: "100%", minHeight: 40, padding: "0 14px", borderRadius: 14, border: `1px solid ${theme.border}`, background: theme.surface, color: theme.text, fontSize: 13, fontWeight: 700, cursor: "pointer" },
  buttonPrimary: { background: theme.primary, color: "#ffffff" },
  buttonSecondary: { background: theme.success, color: "#ffffff" },
  buttonWarning: { background: "#D97706", color: "#ffffff" },
  buttonDanger: { background: theme.danger, color: "#ffffff" },
  steps: { display: "grid", gap: 12 },
  stepItem: { display: "flex", alignItems: "flex-start", gap: 12, fontSize: 14, color: theme.textMuted },
  stepBullet: { marginTop: 4, width: 12, height: 12, borderRadius: "50%", background: theme.success, flexShrink: 0 },
  statsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 },
  statBox: { background: theme.surfaceSoft, borderRadius: 16, padding: 14, textAlign: "center", border: `1px solid ${theme.border}` },
  statValue: { fontSize: 22, fontWeight: 700, color: theme.text },
  statLabel: { fontSize: 12, color: theme.textMuted, marginTop: 6 },
  etapes: { display: "grid", gap: 8, marginTop: 12, maxHeight: 220, overflowY: "auto" },
  etape: { display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 14, background: theme.surfaceSoft, fontSize: 13 },
  dot: (color) => ({ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }),
  error: { background: "rgba(254, 226, 226, 0.8)", borderRadius: 14, padding: 14, color: theme.danger, border: `1px solid ${theme.danger}22`, fontSize: 13 },
  mapContainer: { borderRadius: 20, overflow: "hidden", border: `1px solid ${theme.border}`, minHeight: 680, background: theme.surface },
  legend: { display: "grid", gap: 10, fontSize: 13, color: theme.textMuted },
  legendItem: { display: "flex", alignItems: "center", gap: 10 },
  highlight: { padding: 14, borderRadius: 16, background: "#f8fafc", color: theme.text, border: `1px solid ${theme.border}` },
  eta: { background: "#FFF7ED", borderRadius: 14, padding: 14, marginTop: 12, border: "1px solid #FED7AA", fontSize: 13, color: "#9A3412", lineHeight: 1.6 },
  routeColor: (color) => ({ width: 16, height: 3, background: color, borderRadius: 2 }),
};

function SearchSelect({ label, value, onChange, quartiersList }) {
  const [search, setSearch] = useState(value);
  const [open, setOpen] = useState(false);
  const filtered = quartiersList.filter((q) => q.toLowerCase().includes(search.toLowerCase())).slice(0, 20);

  const select = (q) => {
    onChange(q);
    setSearch(q);
    setOpen(false);
  };

  return (
    <div>
      <label style={styles.label}>{label}</label>
      <div style={styles.searchWrapper}>
        <input
          style={styles.searchInput}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); onChange(""); }}
          onFocus={() => setOpen(true)}
          placeholder="Tapez pour rechercher"
        />
        {open && search.length > 0 && filtered.length > 0 && (
          <div style={styles.dropdown}>
            {filtered.map((q) => (
              <div key={q} style={styles.dropdownItem} onMouseDown={() => select(q)}>{q}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const cheminToCoords = (chemin, quartiersMap) =>
  (chemin || []).filter((q) => quartiersMap[q]).map((q) => quartiersMap[q]);

function Carte() {
  const [searchParams] = useSearchParams();
  const {
    depart,
    destination,
    setDepart,
    setDestination,
    setGraphResults,
    conseil,
    alerte,
    traficRoute,
    cheminsGraph,
  } = useTrip();
  const [quartiers, setQuartiers] = useState({});
  const [quartiersList, setQuartiersList] = useState([]);
  const [resultat, setResultat] = useState(null);
  const [erreur, setErreur] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [cheminCoords, setCheminCoords] = useState([]);
  const [pathSegments, setPathSegments] = useState([]);
  const [itineraireRoutes, setItineraireRoutes] = useState([]);
  const [selectedItineraire, setSelectedItineraire] = useState(0);
  const [showAlternatives, setShowAlternatives] = useState(true);
  const [traficEdges, setTraficEdges] = useState([]);
  const [simulating, setSimulating] = useState(false);
  const [graphAlts, setGraphAlts] = useState([]);
  const [selectedGraphAlt, setSelectedGraphAlt] = useState(0);
  const autoCalcDone = useRef(false);

  useEffect(() => {
    getQuartiers().then((data) => {
      setQuartiers(data.quartiers);
      setQuartiersList(Object.keys(data.quartiers).sort());
      setLoadingData(false);
    });

    (async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'}/trafic/actif`);
        const d = await res.json();
        setTraficEdges(d.trafics || []);
      } catch (e) {}
    })();
  }, []);

  useEffect(() => {
    const dep = searchParams.get("depart");
    const dest = searchParams.get("destination");
    if (dep) setDepart(dep);
    if (dest) setDestination(dest);
    if (searchParams.get("alts") === "1") setShowAlternatives(true);
  }, [searchParams, setDepart, setDestination]);

  useEffect(() => {
    if (cheminsGraph?.length > 0) setGraphAlts(cheminsGraph);
  }, [cheminsGraph]);

  const calculer = useCallback(async () => {
    if (!depart || !destination) return;
    setErreur("");
    setResultat(null);
    setCheminCoords([]);
    setPathSegments([]);
    setItineraireRoutes([]);
    setSelectedItineraire(0);
    setSelectedGraphAlt(0);
    setSimulating(false);
    setGraphAlts([]);
    setLoading(true);

    const routeEmbouteillee = traficRoute || null;
    const [osrmRes, graphRes] = await Promise.allSettled([
      getItineraireRoutier(depart, destination),
      getCheminsAlternatifs(depart, destination, routeEmbouteillee),
    ]);

    if (graphRes.status === "fulfilled" && graphRes.value?.chemins?.length > 0) {
      setGraphAlts(graphRes.value.chemins);
      setGraphResults(graphRes.value);
      setShowAlternatives(true);
    }

    if (osrmRes.status === "fulfilled" && osrmRes.value && !osrmRes.value.erreur && osrmRes.value.routes?.length) {
      const routes = osrmRes.value.routes;
      setItineraireRoutes(routes);
      setSelectedItineraire(0);
      setCheminCoords(routes[0].chemin);
      setResultat({
        distance: routes[0].distance,
        duree: routes[0].duree,
        etapes: routes[0].steps?.length || routes[0].chemin.length,
        summary: routes[0].summary || "",
        chemin: routes[0].chemin,
      });
    } else if (graphRes.status === "fulfilled" && graphRes.value?.chemins?.length > 0) {
      const best = graphRes.value.chemins[0];
      setResultat({
        distance: best.distance,
        duree: estimateDuree(best.distance),
        etapes: best.chemin.length,
        chemin: best.chemin,
      });
      const coords = cheminToCoords(best.chemin, quartiers);
      setCheminCoords(coords);
      const segments = best.chemin.slice(0, -1)
        .map((q, index) => { const next = best.chemin[index + 1]; return [quartiers[q], quartiers[next]]; })
        .filter((segment) => segment[0] && segment[1]);
      setPathSegments(segments);
    } else {
      const errMsg = (osrmRes.status === "fulfilled" && osrmRes.value?.erreur) || (graphRes.status === "fulfilled" && graphRes.value?.erreur) || "Erreur de calcul de trajet";
      setErreur(errMsg);
    }

    setLoading(false);
  }, [depart, destination, quartiers, traficRoute, setGraphResults]);

  useEffect(() => {
    if (loadingData || autoCalcDone.current) return;
    const dep = searchParams.get("depart") || depart;
    const dest = searchParams.get("destination") || destination;
    if (searchParams.get("auto") === "1" && dep && dest) {
      autoCalcDone.current = true;
      calculer();
    }
  }, [loadingData, searchParams, depart, destination, calculer]);

  const reset = () => {
    setDepart("");
    setDestination("");
    setResultat(null);
    setErreur("");
    setCheminCoords([]);
    setPathSegments([]);
    setItineraireRoutes([]);
    setSimulating(false);
    setGraphAlts([]);
  };

  const dureeMin = resultat ? Math.round((resultat.duree || (resultat.distance / 30) * 60)) : 0;
  const selectedRoute = itineraireRoutes[selectedItineraire] || null;
  const routeSteps = selectedRoute?.steps || [];
  const activeDuree = selectedRoute ? selectedRoute.duree : dureeMin;

  const now = new Date();
  const etaDate = new Date(now.getTime() + (activeDuree || dureeMin) * 60000);
  const etaStr = etaDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const toggleSimulation = () => {
    if (!cheminCoords || cheminCoords.length < 2) return;
    setSimulating((s) => !s);
    if (!simulating) setShowAlternatives(true);
  };

  const selectGraphAlt = (idx) => {
    setSelectedGraphAlt(idx);
    const alt = graphAlts[idx];
    if (!alt) return;
    const coords = cheminToCoords(alt.chemin, quartiers);
    if (coords.length > 1) setCheminCoords(coords);
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Carte interactive</h2>
          <p style={styles.subtitle}>
            Choisissez un trajet, visualisez les points clés, et analysez le parcours sur une carte claire.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Compass size={20} color={theme.primary} />
          <span style={{ color: theme.textMuted }}>Cartographie fluide et commandes lisibles.</span>
        </div>
      </div>

      <div style={styles.container}>
        <div style={styles.sidebar}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Comment utiliser la carte</div>
            <div style={styles.steps}>
              <div style={styles.stepItem}><div style={styles.stepBullet} /><div><strong>Sélectionnez un départ et une destination</strong> pour tracer le trajet.</div></div>
              <div style={styles.stepItem}><div style={styles.stepBullet} /><div><strong>Appuyez sur "Calculer le trajet"</strong> pour afficher l'itinéraire.</div></div>
              <div style={styles.stepItem}><div style={styles.stepBullet} /><div><strong>Survolez ou cliquez</strong> les points pour voir les détails.</div></div>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardTitle}>Paramètres du trajet</div>
            {loadingData ? (
              <p style={{ color: theme.textMuted, margin: 0 }}>Chargement des quartiers...</p>
            ) : (
              <>
                <SearchSelect label="Point de départ" value={depart} onChange={setDepart} quartiersList={quartiersList} />
                <SearchSelect label="Destination" value={destination} onChange={setDestination} quartiersList={quartiersList} />
                <button type="button"
                  style={{ ...styles.button, ...styles.buttonPrimary, width: "100%", justifyContent: "center" }}
                  onClick={calculer} disabled={!depart || !destination || loading}
                >
                  <ArrowRight size={16} /> Calculer le trajet
                </button>
                <button type="button"
                  style={{ ...styles.button, ...styles.buttonDanger, width: "100%", justifyContent: "center", marginTop: 10 }}
                  onClick={reset}
                >
                  <RefreshCcw size={16} /> Réinitialiser
                </button>

                <div style={{ marginTop: 12 }}>
                  <label style={styles.label}>Afficher alternatives</label>
                  <input type="checkbox" checked={showAlternatives} onChange={(e) => setShowAlternatives(e.target.checked)} />
                </div>
              </>
            )}
          </div>

          {erreur && <div style={styles.error}> {erreur}</div>}

          {conseil && (
            <div style={{ ...styles.highlight, marginTop: 12, background: "#E8F5E9", borderColor: "#86EFAC" }}>
              <strong style={{ color: theme.success }}>Suggestion SIOTUM</strong>
              <div style={{ marginTop: 6, fontSize: 13 }}>{conseil}</div>
            </div>
          )}

          {alerte && (
            <div style={{ ...styles.error, marginTop: 12 }}>{alerte.message}</div>
          )}

          {itineraireRoutes.length > 1 && (
            <div style={styles.card}>
              <div style={styles.cardTitle}>Choix d'itinéraire</div>
              <div style={{ display: "grid", gap: 10 }}>
                {itineraireRoutes.map((route, idx) => (
                  <button key={`route-${idx}`} type="button"
                    style={{
                      ...styles.buttonSmall,
                      borderColor: idx === selectedItineraire ? SIMULATION_COLORS[idx] : theme.border,
                      background: idx === selectedItineraire ? `${SIMULATION_COLORS[idx]}15` : theme.surface,
                      color: idx === selectedItineraire ? SIMULATION_COLORS[idx] : theme.text,
                    }}
                    onClick={() => { setSelectedItineraire(idx); setCheminCoords(route.chemin); setSimulating(false); }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={styles.routeColor(SIMULATION_COLORS[idx])} />
                      {route.est_optimal ? "Recommandé" : `Alternative ${idx}`}
                    </span>
                    <span style={{ fontWeight: 700 }}>{route.distance} km · {route.duree || "?"} min</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {graphAlts.length > 0 && (
            <div style={styles.card}>
              <div style={styles.cardTitle}>Chemins alternatifs graphe ({graphAlts.length})</div>
              <div style={{ display: "grid", gap: 10 }}>
                {graphAlts.map((alt, idx) => (
                  <button key={`galt-${idx}`} type="button"
                    style={{
                      ...styles.buttonSmall,
                      borderColor: idx === selectedGraphAlt ? SIMULATION_COLORS[(idx + 1) % SIMULATION_COLORS.length] : theme.border,
                      background: idx === selectedGraphAlt ? `${SIMULATION_COLORS[(idx + 1) % SIMULATION_COLORS.length]}15` : theme.surface,
                    }}
                    onClick={() => selectGraphAlt(idx)}
                  >
                    <span>
                      {idx === 0 ? "Recommandé" : `Alt. ${idx}`}
                      {alt.evite_trafic ? " · Sans trafic" : " · Trafic"}
                    </span>
                    <span style={{ fontWeight: 700 }}>{alt.distance} km · ~{estimateDuree(alt.distance)} min</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedRoute ? (
            <div style={styles.card}>
              <div style={styles.cardTitle}>Itinéraire sélectionné</div>
              <div style={styles.statsGrid}>
                <div style={styles.statBox}><div style={styles.statValue}>{selectedRoute.distance}</div><div style={styles.statLabel}>km</div></div>
                <div style={styles.statBox}><div style={styles.statValue}>{selectedRoute.duree}</div><div style={styles.statLabel}>min</div></div>
                <div style={styles.statBox}><div style={styles.statValue}>{routeSteps.length}</div><div style={styles.statLabel}>étapes</div></div>
                <div style={styles.statBox}><div style={styles.statValue}>{selectedRoute.summary || "-"}</div><div style={styles.statLabel}>Résumé</div></div>
              </div>

              <div style={styles.eta}>
                <strong>Arrivée estimée : {etaStr}</strong>
                <div style={{ marginTop: 4, opacity: 0.8 }}>Durée : {selectedRoute.duree} min · Départ maintenant</div>
              </div>

              <button type="button"
                style={{ ...styles.button, ...(simulating ? styles.buttonDanger : styles.buttonWarning), width: "100%", justifyContent: "center", marginTop: 10 }}
                onClick={toggleSimulation}
                disabled={cheminCoords.length < 2}
              >
                <Play size={14} /> {simulating ? "Arrêter la simulation" : "Simuler le trajet"}
              </button>

              {routeSteps.length > 0 && (
                <div style={styles.etapes}>
                  {routeSteps.map((step, i) => (
                    <div key={`${step.instruction}-${i}`} style={styles.etape}>
                      <div style={styles.dot(i === 0 ? theme.success : i === routeSteps.length - 1 ? theme.danger : theme.warning)} />
                      <div style={{ flex: 1 }}>{step.instruction}</div>
                      <div style={{ color: theme.textMuted, textAlign: "right", minWidth: 60 }}>{step.distance} km</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : resultat ? (
            <div style={styles.card}>
              <div style={styles.cardTitle}>Résumé du trajet</div>
              <div style={styles.statsGrid}>
                <div style={styles.statBox}><div style={styles.statValue}>{resultat.distance}</div><div style={styles.statLabel}>km</div></div>
                <div style={styles.statBox}><div style={styles.statValue}>{dureeMin}</div><div style={styles.statLabel}>min</div></div>
                <div style={styles.statBox}><div style={styles.statValue}>{resultat.etapes}</div><div style={styles.statLabel}>étapes</div></div>
              </div>
              <div style={styles.eta}>
                <strong>Arrivée estimée : {etaStr}</strong>
                <div style={{ marginTop: 4, opacity: 0.8 }}>Durée : {dureeMin} min</div>
              </div>
              <button type="button"
                style={{ ...styles.button, ...(simulating ? styles.buttonDanger : styles.buttonWarning), width: "100%", justifyContent: "center", marginTop: 10 }}
                onClick={toggleSimulation}
                disabled={cheminCoords.length < 2}
              >
                <Play size={14} /> {simulating ? "Arrêter la simulation" : "Simuler le trajet"}
              </button>
              <div style={styles.etapes}>
                {resultat.chemin.map((q, i) => (
                  <div key={`${q}-${i}`} style={styles.etape}>
                    <div style={styles.dot(i === 0 ? theme.success : i === resultat.chemin.length - 1 ? theme.danger : theme.warning)} />
                    <div>{i === 0 ? "Départ" : i === resultat.chemin.length - 1 ? "Arrivée" : `Étape ${i}`}</div>
                    <div style={{ color: theme.textMuted, marginLeft: "auto" }}>{q}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div style={styles.card}>
            <div style={styles.cardTitle}>Légende</div>
            <div style={styles.legend}>
              <div style={styles.legendItem}><div style={styles.dot(theme.success)} /> Départ</div>
              <div style={styles.legendItem}><div style={styles.dot(theme.danger)} /> Destination</div>
              <div style={styles.legendItem}><div style={styles.routeColor(SIMULATION_COLORS[0])} /> Itinéraire principal</div>
              <div style={styles.legendItem}><div style={styles.routeColor(SIMULATION_COLORS[1])} /> Alternative 1</div>
              <div style={styles.legendItem}><div style={styles.routeColor(SIMULATION_COLORS[2])} /> Alternative 2</div>
              <div style={styles.legendItem}><div style={styles.routeColor(SIMULATION_COLORS[3])} /> Alternative 3</div>
              <div style={styles.legendItem}><div style={{ width: 16, height: 3, background: theme.danger, borderRadius: 2, borderStyle: 'dashed', borderWidth: 2 }} /> Trafic actif</div>
            </div>
          </div>
        </div>

        <div style={styles.mapContainer}>
          <MapContainer center={[-18.9137, 47.5361]} zoom={13} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />

            <FitBounds coords={cheminCoords} />

            <SimulationMarker coords={cheminCoords} active={simulating} />

            {itineraireRoutes && itineraireRoutes.length > 0 ? (
              itineraireRoutes.map((r, idx) => {
                if (!showAlternatives && idx !== selectedItineraire) return null;
                const color = SIMULATION_COLORS[idx] || theme.primary;
                return (
                  <Polyline key={`itineraire-${idx}`} positions={r.chemin}
                    color={color}
                    weight={idx === selectedItineraire ? 6 : 3}
                    opacity={idx === selectedItineraire ? 0.95 : 0.55}
                    dashArray={idx === selectedItineraire ? null : [10, 8]}
                  />
                );
              })
            ) : (
              pathSegments.map((segment, i) => (
                <Polyline key={`segment-${i}`} positions={segment} color={theme.success} weight={5} opacity={0.88} />
              ))
            )}

            {traficEdges.map((t, i) => {
              const a = quartiers[t.src];
              const b = quartiers[t.dest];
              if (!a || !b) return null;
              return <Polyline key={`trafic-${i}`} positions={[a, b]} color={theme.danger} weight={4} opacity={0.9} dashArray="6" />;
            })}

            {showAlternatives && graphAlts.length > 0 && (
              graphAlts.map((r, idx) => {
                const coords = cheminToCoords(r.chemin, quartiers);
                if (coords.length < 2) return null;
                const color = SIMULATION_COLORS[(idx + 1) % SIMULATION_COLORS.length];
                const isActive = idx === selectedGraphAlt;
                return (
                  <Polyline key={`galt-${idx}`} positions={coords}
                    color={color}
                    weight={isActive ? 5 : 3}
                    opacity={isActive ? 0.9 : 0.55}
                    dashArray={isActive ? null : [8, 6]}
                  />
                );
              })
            )}

            {Object.entries(quartiers).map(([nom, coords]) => {
              const isDepart = nom === depart;
              const isDestination = nom === destination;
              const isChemin = selectedRoute ? selectedRoute.chemin?.includes(nom) : resultat?.chemin?.includes(nom);
              if (!isDepart && !isDestination && !isChemin) return null;
              const color = isDepart ? theme.success : isDestination ? theme.danger : theme.warning;
              const radius = isDepart || isDestination ? 10 : 6;
              return (
                <CircleMarker key={nom} center={coords} radius={radius}
                  fillColor={color} color="#ffffff" weight={isDepart || isDestination ? 3 : 1} fillOpacity={0.95}
                >
                  <Popup>
                    <div style={{ minWidth: 140 }}>
                      <strong>{nom}</strong>
                      {isDepart && <div style={{ color: theme.success }}>Point de départ</div>}
                      {isDestination && <div style={{ color: theme.danger }}>Destination</div>}
                      {isChemin && !isDepart && !isDestination && <div style={{ color: theme.warning }}>Sur le trajet</div>}
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

export default Carte;
