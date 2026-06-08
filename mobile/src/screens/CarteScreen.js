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
import MapView, { Polyline, Marker, PROVIDER_DEFAULT, AnimatedRegion } from "react-native-maps";
import Constants from "expo-constants";
import {
  getItineraireRoutier,
  getTraficActif,
  getCheminsAlternatifs,
} from "../api";
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

const ROUTE_COLORS = [colors.orange, colors.vert, colors.violet];

export default function CarteScreen() {
  const route = useRoute();
  const mapRef = useRef(null);
  const { quartiersList, quartiers } = useQuartiers();
  const [depart, setDepart] = useState("");
  const [destination, setDestination] = useState("");
  const [routes, setRoutes] = useState([]);
  const [conseil, setConseil] = useState("");
  const [routeActif, setRouteActif] = useState(0);
  const [traficRoutes, setTraficRoutes] = useState([]);
  const [erreur, setErreur] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingCalc, setPendingCalc] = useState(false);
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
      if (p.autoCalc && p.depart && p.destination) setPendingCalc(true);
    }, [route.params?.depart, route.params?.destination, route.params?.autoCalc])
  );

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
    setConseil("");
    setRouteActif(0);
    setLoading(true);
    setSimulating(false);
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);

    const [dataOsrm, dataGraphe] = await Promise.all([
      getItineraireRoutier(depart, destination),
      getCheminsAlternatifs(depart, destination).catch(() => ({})),
    ]);

    if (dataGraphe?.conseil || dataGraphe?.recommandation?.message) {
      setConseil(dataGraphe.conseil || dataGraphe.recommandation.message);
    }

    if (dataOsrm.erreur) {
      setErreur(dataOsrm.erreur);
    } else if (dataOsrm.routes?.length) {
      setRoutes(dataOsrm.routes);
      fitCoords(dataOsrm.routes[0].chemin);
    } else {
      setErreur("Aucun itinéraire routier trouvé");
    }
    setLoading(false);
  }, [depart, destination, fitCoords]);

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

  const toggleSimulation = () => {
    if (simulating) {
      setSimulating(false);
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      return;
    }
    const c = routeCourant?.chemin;
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

  const now = new Date();
  const dureeMin = routeCourant?.duree || 0;
  const etaDate = new Date(now.getTime() + dureeMin * 60000);
  const etaStr = etaDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <View style={styles.page}>
      <SafeAreaView edges={["top"]} style={styles.panel}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.screenTitle}>Carte interactive</Text>
          <Text style={styles.hint}>
            Itinéraires routiers OSRM + trafic simulé
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
          {conseil ? <Text style={styles.conseil}>{conseil}</Text> : null}
          {routeCourant && (
            <View>
              <Text style={styles.stats}>
                {routeCourant.distance} km · ~{routeCourant.duree} min
              </Text>
              <Text style={styles.eta}>
                Arrivée estimée : {etaStr}
              </Text>
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
                    {i === 0 ? "Optimal" : `Alt. ${i}`} ({r.distance} km · {r.duree || "?"} min)
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
            ...(simulating && routeCourant?.chemin?.[simIndex]
              ? [
                  {
                    latitude: routeCourant.chemin[simIndex][0],
                    longitude: routeCourant.chemin[simIndex][1],
                    title: `Simulation`,
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
            ...traficRoutes
              .map((t) => {
                const a = quartiers[t.src];
                const b = quartiers[t.dest];
                if (!a || !b) return null;
                return {
                  coords: [[a[0], a[1]], [b[0], b[1]]],
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
                key={`alt-${idx}`}
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

          {simulating && routeCourant?.chemin?.[simIndex] && (
            <Marker
              coordinate={{
                latitude: routeCourant.chemin[simIndex][0],
                longitude: routeCourant.chemin[simIndex][1],
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
    maxHeight: Dimensions.get("window").height * 0.5,
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
  conseil: {
    marginTop: 8,
    fontSize: 12,
    color: colors.vert,
    fontWeight: "600",
  },
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
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.bordure,
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
