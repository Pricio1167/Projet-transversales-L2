import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { getPerformances } from "../api";
import { useTrip } from "../context/TripContext";
import useQuartiers from "../hooks/useQuartiers";
import QuartierPicker from "../components/QuartierPicker";
import { colors, spacing } from "../theme";

export default function PerformancesScreen() {
  const { quartiersList } = useQuartiers();
  const { depart, destination, setDepart, setDestination } = useTrip();
  const [resultat, setResultat] = useState(null);
  const [erreur, setErreur] = useState("");
  const [loading, setLoading] = useState(false);

  const tester = async () => {
    if (!depart || !destination) {
      setErreur("Sélectionnez départ et destination");
      return;
    }
    setErreur("");
    setResultat(null);
    setLoading(true);
    const data = await getPerformances(depart, destination);
    if (data.erreur) setErreur(data.erreur);
    else if (data.chemin) setResultat(data);
    else setErreur("Aucun chemin trouvé");
    setLoading(false);
  };

  const maxTemps = resultat
    ? Math.max(resultat.temps_tas_binaire_ms, resultat.temps_sans_tas_ms, 1)
    : 1;

  const accel =
    resultat && resultat.temps_tas_binaire_ms > 0
      ? (resultat.temps_sans_tas_ms / resultat.temps_tas_binaire_ms).toFixed(2)
      : 0;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Performances</Text>
      <Text style={styles.sub}>Dijkstra tas binaire vs Dijkstra simple</Text>

      <View style={styles.card}>
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
        <Pressable
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={tester}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.blanc} />
          ) : (
            <Text style={styles.btnText}>Comparer</Text>
          )}
        </Pressable>
        {erreur ? <Text style={styles.error}>{erreur}</Text> : null}
      </View>

      {resultat && (
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.box, { backgroundColor: "#E8F5E9" }]}>
              <Text style={styles.boxLbl}>Tas binaire</Text>
              <Text style={[styles.boxVal, { color: colors.vert }]}>
                {resultat.temps_tas_binaire_ms} ms
              </Text>
            </View>
            <View style={[styles.box, { backgroundColor: "#FFEBEE" }]}>
              <Text style={styles.boxLbl}>Simple</Text>
              <Text style={[styles.boxVal, { color: colors.rouge }]}>
                {resultat.temps_sans_tas_ms} ms
              </Text>
            </View>
          </View>

          <View style={styles.barRow}>
            <Text style={styles.barLbl}>Tas</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  {
                    flex: resultat.temps_tas_binaire_ms / maxTemps,
                    backgroundColor: colors.vert,
                  },
                ]}
              />
              <View style={{ flex: 1 - resultat.temps_tas_binaire_ms / maxTemps }} />
            </View>
          </View>
          <View style={styles.barRow}>
            <Text style={styles.barLbl}>Simple</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  {
                    flex: resultat.temps_sans_tas_ms / maxTemps,
                    backgroundColor: colors.rouge,
                  },
                ]}
              />
              <View style={{ flex: 1 - resultat.temps_sans_tas_ms / maxTemps }} />
            </View>
          </View>

          {resultat.temps_tas_binaire_ms < resultat.temps_sans_tas_ms && (
            <Text style={styles.success}>
              Tas binaire ~{accel}x plus rapide
            </Text>
          )}

          <Text style={styles.cheminTitle}>Chemin ({resultat.distance} km)</Text>
          <Text style={styles.chemin} numberOfLines={3}>
            {resultat.chemin.join(" → ")}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.grisClair },
  content: { padding: spacing.md, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: "700", color: colors.bleu },
  sub: { fontSize: 13, color: colors.texteMuted, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.blanc,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  btn: {
    backgroundColor: colors.bleu,
    borderRadius: 40,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: colors.blanc, fontWeight: "700" },
  error: { color: colors.orange, marginTop: 10, fontSize: 13 },
  row: { flexDirection: "row", gap: 12 },
  box: { flex: 1, padding: 14, borderRadius: 12, alignItems: "center" },
  boxLbl: { fontSize: 12, color: colors.texteMuted },
  boxVal: { fontSize: 22, fontWeight: "700", marginTop: 6 },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  barLbl: { width: 50, fontSize: 12, color: colors.texteMuted },
  barTrack: { flex: 1, flexDirection: "row", height: 24 },
  bar: { height: 24, borderRadius: 6, minWidth: 8 },
  success: {
    marginTop: 12,
    color: colors.vert,
    fontWeight: "600",
    fontSize: 13,
  },
  cheminTitle: { marginTop: 16, fontWeight: "700" },
  chemin: { fontSize: 12, color: colors.texteMuted, marginTop: 6 },
});
