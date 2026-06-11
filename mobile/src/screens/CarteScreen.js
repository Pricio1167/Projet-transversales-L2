import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Platform,
} from "react-native";
import { useRoute, useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Polyline, Marker, PROVIDER_DEFAULT } from "react-native-maps";
import Constants from "expo-constants";
import {
  getItineraireRoutier,
  getTraficActif,
  getCheminsAlternatifs,
} from "../api";
import { useTrip, estimateDuree } from "../context/TripContext";
import useQuartiers from "../hooks/useQuartiers";
import QuartierPicker from "../components/QuartierPicker";
import PrimaryButton from "../components/PrimaryButton";
import MapWebView from "../components/MapWebView";
import { colors, spacing } from "../theme";

const TANA_REGION = {
  latitude: -18.9137,
  longitude: 47.5361,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

const ROUTE_COLORS = [colors.orange, colors.vert, colors.violet, "#0891B2"];
const GRAPH_COLORS = ["#7C3AED", "#0891B2", "#D97706"];

const cheminToCoords = (chemin, quartiers) =>
  (chemin || [])
    .filter((q) => quartiers[q])
    .map((q) => [quartiers[q][0], quartiers[q][1]]);

export default function CarteScreen() {
  const route = useRoute();
  const mapRef = useRef(null);
  const { quartiersList, quartiers } = useQuartiers();
  const {
    depart,
    destination,
    setDepart,
    setDestination,
    cheminsGraph,
    setGraphResults,
    conseil,
    alerte,
    traficRoute,
  } = useTrip();
  const [routes, setRoutes] = useState([]);
  const [graphAlts, setGraphAlts] = useState([]);
  const [routeActif, setRouteActif] = useState(0);
  const [graphActif, setGraphActif] = useState(0);
  const [traficRoutes, setTraficRoutes] = useState([]);
  const [erreur, setErreur] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingCalc, setPendingCalc] = useState(false);
  const [showGraphAlts, setShowGraphAlts] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [simIndex, setSimIndex] = useState(0);
  const simIntervalRef = useRef(null);
  const isExpoGoAndroid =
    Platform.OS === "android" && Constants?.appOwnership === "expo";

  const chargerTrafic = async () => {
    const d = await getTraficActif();
    setTraficRoutes(d.trafics || []);
  };

  useFocusEffect(
    useCallback(() => {
      chargerTrafic();
      const p = route.params || {};
      if (p.depart) setDepart(p.depart);
      if (p.destination) setDestination(p.destination);
      if (p.showAlternatives) setShowGraphAlts(true);
      if (p.autoCalc && p.depart && p.destination) setPendingCalc(true);
    }, [route.params?.depart, route.params?.destination, route.params?.autoCalc])
  );

  useEffect(() => {
    if (cheminsGraph?.length > 0) {
      setGraphAlts(cheminsGraph);
      setShowGraphAlts(true);
    }
  }, [cheminsGraph]);

  useEffect(() => {
    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, []);

  const fitCoords = useCallback((coords) => {
    if (coords?.length > 1 && mapRef.current) {
      mapRef.current.fitToCoordinates(
        coords.map(([lat, lon]) => ({ latitude: lat, longitude: lon })),
        {
          edgePadding: { top: 80, right: 40, bottom: 120, left: 40 },
          animated: true,
        }
      );
    }
  }, []);

  const calculer = useCallback(async () => {
    if (!depart || !destination) {
      setErreur("Sélectionnez départ et destination");
      return;
    }
    setErreur("");
    setRoutes([]);
    setGraphAlts([]);
    setRouteActif(0);
    setGraphActif(0);
    setLoading(true);
    setSimulating(false);
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);

    const routeEmbouteillee = traficRoute || null;
    const [dataOsrm, dataGraphe] = await Promise.all([
      getItineraireRoutier(depart, destination),
      getCheminsAlternatifs(depart, destination, routeEmbouteillee),
    ]);

    if (dataGraphe?.chemins?.length > 0) {
      setGraphAlts(dataGraphe.chemins);
      setGraphResults(dataGraphe);
      setShowGraphAlts(true);
    }

    if (dataOsrm.erreur) {
      if (dataGraphe?.chemins?.length > 0) {
        const coords = cheminToCoords(dataGraphe.chemins[0].chemin, quartiers);
        if (coords.length > 1) fitCoords(coords);
      } else {
        setErreur(dataOsrm.erreur);
      }
    } else if (dataOsrm.routes?.length) {
      setRoutes(dataOsrm.routes);
      fitCoords(dataOsrm.routes[0].chemin);
    } else if (!dataGraphe?.chemins?.length) {
      setErreur("Aucun itinéraire trouvé");
    }
    setLoading(false);
  }, [depart, destination, fitCoords, quartiers, traficRoute, setGraphResults]);

  useEffect(() => {
    if (pendingCalc && depart && destination) {
      setPendingCalc(false);
      calculer();
    }
  }, [pendingCalc, depart, destination, calculer]);

  const selectRoute = (idx) => {
    setRouteActif(idx);
    setSimulating(false);
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    const c = routes[idx]?.chemin;
    if (c?.length > 1) fitCoords(c);
  };

  const selectGraphAlt = (idx) => {
    setGraphActif(idx);
    const coords = cheminToCoords(graphAlts[idx]?.chemin, quartiers);
    if (coords.length > 1) fitCoords(coords);
  };

  const toggleSimulation = () => {
    if (simulating) {
      setSimulating(false);
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      return;
    }
    const c =
      routes[routeActif]?.chemin ||
      cheminToCoords(graphAlts[graphActif]?.chemin, quartiers);
    if (!c || c.length < 2) return;
    setSimIndex(0);
    setSimulating(true);
    let step = 0;
    simIntervalRef.current = setInterval(() => {
      step++;
      if (step >= c.length) step = 0;
      setSimIndex(step);
    }, 800);
  };

  const routeCourant = routes[routeActif];
  const graphCourant = graphAlts[graphActif];
  const simCoords =
    routeCourant?.chemin ||
    cheminToCoords(graphCourant?.chemin, quartiers);

  const dureeMin =
    routeCourant?.duree ||
    (graphCourant ? estimateDuree(graphCourant.distance) : 0);
  const now = new Date();
  const etaDate = new Date(now.getTime() + dureeMin * 60000);
  const etaStr = etaDate.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const graphPolylines = showGraphAlts
    ? graphAlts
        .map((alt, idx) => {
          const coords = cheminToCoords(alt.chemin, quartiers);
          if (coords.length < 2) return null;
          const isActive = idx === graphActif;
          return {
            coords,
            color: isActive
              ? GRAPH_COLORS[idx % GRAPH_COLORS.length]
              : `${GRAPH_COLORS[idx % GRAPH_COLORS.length]}88`,
            weight: isActive ? 5 : 3,
            dashArray: isActive ? null : "6 8",
            opacity: isActive ? 0.95 : 0.6,
            key: `graph-${idx}`,
          };
        })
        .filter(Boolean)
    : [];

  return (
    <View style={styles.page}>
      <SafeAreaView edges={["top"]} style={styles.panel}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.screenTitle}>Carte interactive</Text>
          <Text style={styles.hint}>
            Itinéraires OSRM + chemins alternatifs du graphe
          </Text>
          <QuartierPicker
            label="Départ"
            value={depart}
            onChange={setDepart}
            quartiers={quartiersList}
          />
          <QuartierPicker
            label="Destination"
            value={destination}
            onChange={setDestination}
            quartiers={quartiersList}
          />
          <PrimaryButton
            label="Itinéraires + alternatives"
            onPress={calculer}
            loading={loading}
            color={colors.vert}
          />
          {erreur ? <Text style={styles.error}>{erreur}</Text> : null}

          {conseil ? (
            <View style={styles.conseilBox}>
              <Text style={styles.conseilTitle}>Suggestion SIOTUM</Text>
              <Text style={styles.conseil}>{conseil}</Text>
            </View>
          ) : null}

          {alerte && (
            <View style={styles.alerteBox}>
              <Text style={styles.alerteText}>{alerte.message}</Text>
            </View>
          )}

          {(routeCourant || graphCourant) && (
            <View>
              <Text style={styles.stats}>
                {routeCourant
                  ? `${routeCourant.distance} km · ~${routeCourant.duree} min`
                  : `${graphCourant.distance} km · ~${estimateDuree(graphCourant.distance)} min`}
              </Text>
              <Text style={styles.eta}>Arrivée estimée : {etaStr}</Text>
              <Pressable
                style={[styles.simBtn, simulating && styles.simBtnActive]}
                onPress={toggleSimulation}
              >
                <Text style={styles.simBtnText}>
                  {simulating ? "Arrêter simulation" : "Simuler le trajet"}
                </Text>
              </Pressable>
            </View>
          )}

          {routes.length > 1 && (
            <View style={styles.tabs}>
              <Text style={styles.tabLabel}>Itinéraires routiers (OSRM)</Text>
              {routes.map((r, i) => (
                <Pressable
                  key={i}
                  style={[
                    styles.tab,
                    routeActif === i && { backgroundColor: ROUTE_COLORS[i] },
                  ]}
                  onPress={() => selectRoute(i)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      routeActif === i && { color: colors.blanc },
                    ]}
                  >
                    {i === 0 ? "Optimal" : `Alt. ${i}`} ({r.distance} km ·{" "}
                    {r.duree || "?"} min)
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {graphAlts.length > 0 && (
            <View style={styles.tabs}>
              <Text style={styles.tabLabel}>
                Chemins alternatifs graphe ({graphAlts.length})
              </Text>
              {graphAlts.map((alt, i) => (
                <Pressable
                  key={i}
                  style={[
                    styles.tab,
                    graphActif === i && {
                      backgroundColor: GRAPH_COLORS[i % GRAPH_COLORS.length],
                    },
                  ]}
                  onPress={() => selectGraphAlt(i)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      graphActif === i && { color: colors.blanc },
                    ]}
                  >
                    {i === 0 ? "Recommandé" : `Alt. ${i}`} · {alt.distance} km ·
                    ~{estimateDuree(alt.distance)} min
                    {alt.evite_trafic ? " · Sans trafic" : " · Trafic"}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {traficRoutes.length > 0 && (
            <View style={styles.traficBanner}>
              <Text style={styles.traficTitle}>
                Trafic actif ({traficRoutes.length})
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {isExpoGoAndroid ? (
        <MapWebView
          center={TANA_REGION}
          zoom={12}
          markers={[
            ...(depart && quartiers[depart]
              ? [
                  {
                    latitude: quartiers[depart][0],
                    longitude: quartiers[depart][1],
                    title: `Départ: ${depart}`,
                    color: "#2E7D32",
                  },
                ]
              : []),
            ...(destination && quartiers[destination]
              ? [
                  {
                    latitude: quartiers[destination][0],
                    longitude: quartiers[destination][1],
                    title: `Destination: ${destination}`,
                    color: "#D32F2F",
                  },
                ]
              : []),
            ...(simulating && simCoords?.[simIndex]
              ? [
                  {
                    latitude: simCoords[simIndex][0],
                    longitude: simCoords[simIndex][1],
                    title: "Simulation",
                    color: "#D97706",
                  },
                ]
              : []),
          ]}
          polylines={[
            ...routes
              .map((r, idx) => ({ r, idx }))
              .filter(({ idx, r }) => idx !== routeActif && r.chemin?.length > 1)
              .map(({ idx, r }) => ({
                coords: r.chemin,
                color: `${ROUTE_COLORS[idx] || colors.bleu}99`,
                weight: 4,
                opacity: 0.7,
              })),
            ...(routeCourant?.chemin?.length > 1
              ? [
                  {
                    coords: routeCourant.chemin,
                    color: ROUTE_COLORS[routeActif] || colors.orange,
                    weight: 6,
                    opacity: 0.9,
                  },
                ]
              : []),
            ...graphPolylines.map((g) => ({
              coords: g.coords,
              color: g.color,
              weight: g.weight,
              dashArray: g.dashArray,
              opacity: g.opacity,
            })),
            ...traficRoutes
              .map((t) => {
                const a = quartiers[t.src];
                const b = quartiers[t.dest];
                if (!a || !b) return null;
                return {
                  coords: [
                    [a[0], a[1]],
                    [b[0], b[1]],
                  ],
                  color: colors.rougeTrafic,
                  weight: 5,
                  dashArray: "8 6",
                  opacity: 0.9,
                };
              })
              .filter(Boolean),
          ]}
        />
      ) : (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={TANA_REGION}
        >
          {routes.map((r, idx) => {
            if (idx === routeActif || !r.chemin?.length) return null;
            return (
              <Polyline
                key={`osrm-alt-${idx}`}
                coordinates={r.chemin.map(([lat, lon]) => ({
                  latitude: lat,
                  longitude: lon,
                }))}
                strokeColor={`${ROUTE_COLORS[idx] || colors.bleu}99`}
                strokeWidth={4}
              />
            );
          })}

          {routeCourant?.chemin?.length > 1 && (
            <Polyline
              coordinates={routeCourant.chemin.map(([lat, lon]) => ({
                latitude: lat,
                longitude: lon,
              }))}
              strokeColor={ROUTE_COLORS[routeActif] || colors.orange}
              strokeWidth={6}
            />
          )}

          {graphPolylines.map((g, idx) => (
            <Polyline
              key={g.key}
              coordinates={g.coords.map(([lat, lon]) => ({
                latitude: lat,
                longitude: lon,
              }))}
              strokeColor={g.color}
              strokeWidth={g.weight}
              lineDashPattern={g.dashArray ? [6, 8] : undefined}
            />
          ))}

          {traficRoutes.map((t, idx) => {
            const a = quartiers[t.src];
            const b = quartiers[t.dest];
            if (!a || !b) return null;
            return (
              <Polyline
                key={`trafic-${idx}`}
                coordinates={[
                  { latitude: a[0], longitude: a[1] },
                  { latitude: b[0], longitude: b[1] },
                ]}
                strokeColor={colors.rougeTrafic}
                strokeWidth={5}
                lineDashPattern={[8, 6]}
              />
            );
          })}

          {depart && quartiers[depart] && (
            <Marker
              coordinate={{
                latitude: quartiers[depart][0],
                longitude: quartiers[depart][1],
              }}
              title="Départ"
              pinColor="green"
            />
          )}
          {destination && quartiers[destination] && (
            <Marker
              coordinate={{
                latitude: quartiers[destination][0],
                longitude: quartiers[destination][1],
              }}
              title="Destination"
              pinColor="red"
            />
          )}

          {simulating && simCoords?.[simIndex] && (
            <Marker
              coordinate={{
                latitude: simCoords[simIndex][0],
                longitude: simCoords[simIndex][1],
              }}
              title="Position actuelle"
              pinColor="orange"
            />
          )}
        </MapView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.grisClair },
  panel: {
    maxHeight: Dimensions.get("window").height * 0.55,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.blanc,
    borderBottomWidth: 1,
    borderBottomColor: colors.bordure,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.bleu,
    marginBottom: 4,
  },
  hint: { fontSize: 12, color: colors.texteMuted, marginBottom: spacing.sm },
  error: { color: colors.orange, fontSize: 12, marginTop: 8 },
  conseilBox: {
    marginTop: 8,
    backgroundColor: "#E8F5E9",
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.vert,
  },
  conseilTitle: { fontSize: 11, fontWeight: "700", color: colors.vert },
  conseil: { marginTop: 4, fontSize: 12, color: colors.texte },
  alerteBox: {
    marginTop: 8,
    backgroundColor: "#FFEBEE",
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.rouge,
  },
  alerteText: { fontSize: 12, color: "#C62828" },
  stats: {
    marginTop: 8,
    fontWeight: "700",
    color: colors.bleu,
    fontSize: 14,
  },
  eta: {
    marginTop: 4,
    fontSize: 12,
    color: "#9A3412",
    fontWeight: "600",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  simBtn: {
    marginTop: 8,
    backgroundColor: "#D97706",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 40,
    alignSelf: "flex-start",
  },
  simBtnActive: { backgroundColor: "#D32F2F" },
  simBtnText: { color: colors.blanc, fontWeight: "700", fontSize: 12 },
  tabs: { marginTop: 10 },
  tabLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.texteMuted,
    marginBottom: 6,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.bordure,
    marginBottom: 6,
  },
  tabText: { fontSize: 12, fontWeight: "600", color: colors.texte },
  traficBanner: {
    marginTop: 10,
    padding: 8,
    backgroundColor: "#FFEBEE",
    borderRadius: 8,
  },
  traficTitle: { fontSize: 12, color: colors.rougeTrafic, fontWeight: "600" },
  map: { flex: 1 },
});
