import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import PrimaryButton from "../components/PrimaryButton";
import CheminSteps from "../components/CheminSteps";
import {
  simulerTrafic,
  resetTrafic,
  getTraficActif,
  getCheminsAlternatifs,
} from "../api";
import useQuartiers from "../hooks/useQuartiers";
import QuartierPicker from "../components/QuartierPicker";
import { colors, spacing } from "../theme";

export default function TraficScreen({ navigation }) {
  const { quartiersList } = useQuartiers();
  const [traficSrc, setTraficSrc] = useState("");
  const [traficDest, setTraficDest] = useState("");
  const [traficPoids, setTraficPoids] = useState("");
  const [depart, setDepart] = useState("");
  const [destination, setDestination] = useState("");
  const [msg, setMsg] = useState("");
  const [erreur, setErreur] = useState("");
  const [traficActif, setTraficActif] = useState([]);
  const [resultat, setResultat] = useState(null);
  const [loading, setLoading] = useState(false);

  const chargerTrafic = async () => {
    const data = await getTraficActif();
    setTraficActif(data.trafics || []);
  };

  useFocusEffect(
    useCallback(() => {
      chargerTrafic();
    }, [])
  );

  const appliquer = async () => {
    if (!traficSrc || !traficDest || !traficPoids) {
      setErreur("Remplissez tous les champs");
      return;
    }
    setErreur("");
    setMsg("");
    setLoading(true);
    const data = await simulerTrafic(traficSrc, traficDest, traficPoids);
    if (data.erreur) setErreur(data.erreur);
    else {
      setMsg(data.message || "Trafic applique");
      await chargerTrafic();
      if (depart && destination) {
        const alt = await getCheminsAlternatifs(depart, destination, [
          traficSrc,
          traficDest,
        ]);
        if (alt.chemins?.[0]) setResultat(alt.chemins[0]);
      }
    }
    setLoading(false);
  };

  const reinitialiser = async () => {
    if (!traficSrc || !traficDest) {
      setErreur("Sélectionnez la route à réinitialiser");
      return;
    }
    const data = await resetTrafic(traficSrc, traficDest);
    if (data.erreur) setErreur(data.erreur);
    else {
      setMsg(data.message || "Route restauree");
      await chargerTrafic();
    }
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Simulation de trafic</Text>
      <Text style={styles.sub}>
        Choisir deux quartiers <Text style={styles.bold}>voisins</Text> (rue
        directe). Ex. : 67 Hectares ↔ Isotry
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Embouteillage</Text>
        <QuartierPicker
          label="Route source"
          value={traficSrc}
          onChange={setTraficSrc}
          quartiers={quartiersList}
        />
        <QuartierPicker
          label="Route destination"
          value={traficDest}
          onChange={setTraficDest}
          quartiers={quartiersList}
        />
        <Text style={styles.label}>Nouveau poids (km)</Text>
        <TextInput
          style={styles.input}
          value={traficPoids}
          onChangeText={setTraficPoids}
          keyboardType="decimal-pad"
          placeholder="Ex: 15.0"
          placeholderTextColor={colors.texteMuted}
        />
        <Pressable
          style={[styles.btnOrange, loading && styles.btnDisabled]}
          onPress={appliquer}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.blanc} />
          ) : (
            <Text style={styles.btnText}>Appliquer le trafic</Text>
          )}
        </Pressable>
        <Pressable style={styles.btnGhost} onPress={reinitialiser}>
          <Text style={styles.btnGhostText}>Réinitialiser la route</Text>
        </Pressable>
        {erreur ? <Text style={styles.error}>{erreur}</Text> : null}
        {msg && !erreur ? <Text style={styles.success}>{msg}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Impact sur un trajet (optionnel)</Text>
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
        {resultat?.chemin && (
          <View style={styles.result}>
            <Text style={styles.resultTitle}>Trajet recalcule</Text>
            <CheminSteps chemin={resultat.chemin} maxVisible={6} compact />
            <Text style={styles.meta}>
              {resultat.distance} km · {resultat.chemin.length - 1} etapes
            </Text>
            <PrimaryButton
              label="Voir sur la carte"
              onPress={() =>
                navigation.navigate("Carte", {
                  depart,
                  destination,
                  autoCalc: true,
                })
              }
              color={colors.violet}
              style={{ marginTop: 12 }}
            />
          </View>
        )}
      </View>

      {traficActif.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trafics actifs</Text>
          {traficActif.map((t, i) => (
            <Pressable
              key={i}
              style={styles.traficItem}
              onPress={() => {
                setTraficSrc(t.src);
                setTraficDest(t.dest);
              }}
            >
              <Text style={styles.traficRoute}>
                {t.src} → {t.dest}
              </Text>
              <Text style={styles.traficMeta}>
                {t.poids_original} km → {t.poids_actuel} km (toucher pour
                reutiliser)
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.grisClair },
  content: { padding: spacing.md, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: "700", color: colors.bleu, marginBottom: 6 },
  sub: { fontSize: 13, color: colors.texteMuted, marginBottom: spacing.md },
  bold: { fontWeight: "700", color: colors.orange },
  card: {
    backgroundColor: colors.blanc,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  cardTitle: { fontWeight: "700", fontSize: 16, marginBottom: 12, color: colors.texte },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.bordure,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    color: colors.texte,
  },
  btnOrange: {
    backgroundColor: colors.orange,
    borderRadius: 40,
    padding: 14,
    alignItems: "center",
  },
  btnGhost: {
    marginTop: 10,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.bordure,
    borderRadius: 40,
  },
  btnGhostText: { color: colors.texte, fontWeight: "600" },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: colors.blanc, fontWeight: "700" },
  error: { color: colors.orange, marginTop: 10, fontSize: 13 },
  success: { color: colors.vert, marginTop: 10, fontSize: 13, fontWeight: "600" },
  result: {
    marginTop: 12,
    backgroundColor: "#E3F2FD",
    padding: 12,
    borderRadius: 10,
  },
  resultTitle: { fontWeight: "700", color: colors.bleu },
  meta: { marginTop: 4, fontSize: 13 },
  traficItem: {
    backgroundColor: "#FFEBEE",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.rougeTrafic,
  },
  traficRoute: { fontWeight: "700", fontSize: 13 },
  traficMeta: { fontSize: 11, color: colors.texteMuted, marginTop: 4 },
});
