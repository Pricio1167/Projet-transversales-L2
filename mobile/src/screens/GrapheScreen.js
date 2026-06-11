import { useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Pressable,
} from "react-native";
import MapView, { Polyline, Marker, PROVIDER_DEFAULT } from "react-native-maps";
import Constants from "expo-constants";
import { calculerChemin, getItineraireRoutier, getCheminsAlternatifs } from "../api";
import { useTrip } from "../context/TripContext";
import useQuartiers from "../hooks/useQuartiers";
import QuartierPicker from "../components/QuartierPicker";
import CheminSteps from "../components/CheminSteps";
import PrimaryButton from "../components/PrimaryButton";
import MapWebView from "../components/MapWebView";
import { colors, spacing } from "../theme";

const TANA_REGION = {
  latitude: -18.9137,
  longitude: 47.5361,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

export default function GrapheScreen() {
  const mapRef = useRef(null);
  const { quartiersList, quartiers, connexions } = useQuartiers();
  const { depart, destination, setDepart, setDestination } = useTrip();
  const [chemin, setChemin] = useState([]);
  const [distance, setDistance] = useState(null);
  const [duree, setDuree] = useState(null);
  const [itineraireRoutes, setItineraireRoutes] = useState([]);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [graphAlternatives, setGraphAlternatives] = useState([]);
  const [selectedGraphAlt, setSelectedGraphAlt] = useState(0);
  const [erreur, setErreur] = useState("");
  const [loading, setLoading] = useState(false);
  const isExpoGoAndroid =
    Platform.OS === "android" && Constants?.appOwnership === "expo";

  const afficherChemin = async () => {
    if (!depart || !destination) {
      setErreur("Sélectionnez départ et destination");
      return;
    }
    setErreur("");
    setChemin([]);
    setDuree(null);
    setItineraireRoutes([]);
    setGraphAlternatives([]);
    setSelectedGraphAlt(0);
    setLoading(true);
    // Prefer real road itinerary via OSRM, fallback to graph alternatives, then simple graph
    const [osrmRes, graphRes, altRes] = await Promise.allSettled([
      getItineraireRoutier(depart, destination),
      calculerChemin(depart, destination),
      getCheminsAlternatifs(depart, destination),
    ]);

    if (osrmRes.status === "fulfilled" && osrmRes.value && !osrmRes.value.erreur && osrmRes.value.routes?.length) {
      const routes = osrmRes.value.routes;
      setItineraireRoutes(routes);
      setSelectedRouteIdx(0);
      setDistance(routes[0].distance);
      setDuree(routes[0].duree);
      const coords = routes[0].chemin.map((c) => ({ latitude: c[0], longitude: c[1] }));
      if (coords.length > 1 && mapRef.current) {
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 60, right: 40, bottom: 60, left: 40 },
          animated: true,
        });
      }
    } else if (altRes.status === "fulfilled" && altRes.value && !altRes.value.erreur && altRes.value.chemins?.length) {
      const alts = altRes.value.chemins;
      setGraphAlternatives(alts);
      setSelectedGraphAlt(0);
      setChemin(alts[0].chemin);
      setDistance(alts[0].distance);
      const coords = alts[0].chemin
        .map((n) => quartiers[n])
        .filter(Boolean)
        .map(([lat, lon]) => ({ latitude: lat, longitude: lon }));
      if (coords.length > 1 && mapRef.current) {
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 60, right: 40, bottom: 60, left: 40 },
          animated: true,
        });
      }
    } else if (graphRes.status === "fulfilled" && graphRes.value && !graphRes.value.erreur && graphRes.value.chemin) {
      const data = graphRes.value;
      setChemin(data.chemin);
      setDistance(data.distance);
      const coords = data.chemin
        .map((n) => quartiers[n])
        .filter(Boolean)
        .map(([lat, lon]) => ({ latitude: lat, longitude: lon }));
      if (coords.length > 1 && mapRef.current) {
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 60, right: 40, bottom: 60, left: 40 },
          animated: true,
        });
      }
    } else {
      setErreur("Aucun chemin trouvé");
    }
    setLoading(false);
  };

  const pathCoords = chemin
    .map((n) => quartiers[n])
    .filter(Boolean)
    .map(([lat, lon]) => ({ latitude: lat, longitude: lon }));

  return (
    <View style={styles.page}>
      <ScrollView
        style={styles.panel}
        contentContainerStyle={styles.panelContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Chemin sur la carte</Text>
        <Text style={styles.stats}>
          {quartiersList.length} quartiers · {connexions} liaisons
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
          label="Afficher le chemin"
          onPress={afficherChemin}
          loading={loading}
          color={colors.vert}
        />

        {erreur ? <Text style={styles.error}>{erreur}</Text> : null}

        {itineraireRoutes.length > 0 ? (
          <View style={styles.result}>
            <Text style={styles.resultTitle}>
              Itinéraire routier réel — {distance} km · {duree} min
            </Text>
            {itineraireRoutes.length > 1 && (
              <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {itineraireRoutes.map((r, i) => (
                  <Pressable
                    key={i}
                    style={{
                      paddingVertical: 6, paddingHorizontal: 10,
                      backgroundColor: selectedRouteIdx === i ? colors.bleu : colors.grisClair,
                      borderRadius: 20,
                    }}
                    onPress={() => {
                      setSelectedRouteIdx(i);
                      setDistance(r.distance);
                      setDuree(r.duree);
                      const coords = r.chemin.map((c) => ({ latitude: c[0], longitude: c[1] }));
                      if (coords.length > 1 && mapRef.current) {
                        mapRef.current.fitToCoordinates(coords, {
                          edgePadding: { top: 60, right: 40, bottom: 60, left: 40 },
                          animated: true,
                        });
                      }
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "600", color: selectedRouteIdx === i ? colors.blanc : colors.texte }}>
                      {i === 0 ? "Recommandé" : `Alt. ${i}`} — {r.distance} km · {r.duree} min
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ) : graphAlternatives.length > 0 ? (
          <View style={styles.result}>
            <Text style={styles.resultTitle}>
              Chemin alternatif (graphe) — {distance} km, {chemin.length - 1} étapes
            </Text>
            {graphAlternatives.length > 1 && (
              <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {graphAlternatives.map((r, i) => (
                  <Pressable
                    key={i}
                    style={{
                      paddingVertical: 6, paddingHorizontal: 10,
                      backgroundColor: selectedGraphAlt === i ? colors.orange : colors.grisClair,
                      borderRadius: 20,
                    }}
                    onPress={() => {
                      setSelectedGraphAlt(i);
                      setChemin(r.chemin);
                      setDistance(r.distance);
                      setDuree(null);
                      const coords = r.chemin
                        .map((n) => quartiers[n])
                        .filter(Boolean)
                        .map(([lat, lon]) => ({ latitude: lat, longitude: lon }));
                      if (coords.length > 1 && mapRef.current) {
                        mapRef.current.fitToCoordinates(coords, {
                          edgePadding: { top: 60, right: 40, bottom: 60, left: 40 },
                          animated: true,
                        });
                      }
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "600", color: selectedGraphAlt === i ? colors.blanc : colors.texte }}>
                      {i === 0 ? "Recommandé" : `Alt. ${i}`} — {r.distance} km · {r.etapes} étapes
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
            <CheminSteps chemin={chemin} maxVisible={8} />
          </View>
        ) : chemin.length > 0 ? (
          <View style={styles.result}>
            <Text style={styles.resultTitle}>
              Chemin (graphe) — {distance} km, {chemin.length - 1} étapes
            </Text>
            <CheminSteps chemin={chemin} maxVisible={8} />
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.mapWrap}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.bleu} />
          </View>
        )}
        {isExpoGoAndroid ? (
          <MapWebView
            center={TANA_REGION}
            zoom={12}
            markers={[
              ...(chemin[0] && quartiers[chemin[0]]
                ? [
                    {
                      latitude: quartiers[chemin[0]][0],
                      longitude: quartiers[chemin[0]][1],
                      title: `Départ: ${chemin[0]}`,
                      color: "#2E7D32",
                    },
                  ]
                : []),
              ...(chemin.length > 1 && quartiers[chemin[chemin.length - 1]]
                ? [
                    {
                      latitude: quartiers[chemin[chemin.length - 1]][0],
                      longitude: quartiers[chemin[chemin.length - 1]][1],
                      title: `Destination: ${chemin[chemin.length - 1]}`,
                      color: "#D32F2F",
                    },
                  ]
                : []),
            ]}
            polylines={[
              ...(chemin.length > 1
                ? [{ coords: pathCoords, color: colors.orange, weight: 4 }]
                : []),
            ]}
          />
        ) : (
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_DEFAULT}
            initialRegion={TANA_REGION}
          >
            {/* If we have OSRM routes, draw alternatives + selected route */}
            {itineraireRoutes.length > 0 ? (
              itineraireRoutes.map((r, idx) => {
                const coords = r.chemin.map((c) => ({ latitude: c[0], longitude: c[1] }));
                return (
                  <Polyline
                    key={`itin-${idx}`}
                    coordinates={coords}
                    strokeColor={idx === selectedRouteIdx ? colors.primary : `${colors.primary}99`}
                    strokeWidth={idx === selectedRouteIdx ? 5 : 3}
                    lineDashPattern={idx === selectedRouteIdx ? undefined : [1]}
                  />
                );
              })
            ) : (
              pathCoords.length > 1 && (
                <Polyline
                  coordinates={pathCoords}
                  strokeColor={colors.orange}
                  strokeWidth={4}
                />
              )
            )}
            {chemin.map((nom, i) => {
              const c = quartiers[nom];
              if (!c) return null;
              const isStart = i === 0;
              const isEnd = i === chemin.length - 1;
              return (
                <Marker
                  key={`${nom}-${i}`}
                  coordinate={{ latitude: c[0], longitude: c[1] }}
                  title={nom}
                  description={
                    isStart ? "Départ" : isEnd ? "Destination" : `Étape ${i}`
                  }
                  pinColor={isStart ? "green" : isEnd ? "red" : "orange"}
                />
              );
            })}
          </MapView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.grisClair },
  panel: {
    maxHeight: "42%",
    backgroundColor: colors.blanc,
    borderBottomWidth: 1,
    borderBottomColor: colors.bordure,
  },
  panelContent: { padding: spacing.md, paddingBottom: spacing.sm },
  title: { fontSize: 20, fontWeight: "700", color: colors.bleu },
  stats: { fontSize: 12, color: colors.texteMuted, marginBottom: spacing.sm },
  error: {
    marginTop: 10,
    color: colors.orange,
    fontSize: 13,
    backgroundColor: "#FFF3E0",
    padding: 10,
    borderRadius: 8,
  },
  result: {
    marginTop: spacing.md,
    backgroundColor: "#E8F5E9",
    padding: 12,
    borderRadius: 12,
  },
  resultTitle: { fontWeight: "700", color: colors.vert, marginBottom: 8 },
  mapWrap: { flex: 1 },
  map: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.6)",
    zIndex: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});
