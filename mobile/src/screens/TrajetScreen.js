import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { getCheminsAlternatifs, calculerChemin } from "../api";
import useQuartiers from "../hooks/useQuartiers";
import QuartierPicker from "../components/QuartierPicker";
import CheminSteps from "../components/CheminSteps";
import PrimaryButton from "../components/PrimaryButton";
import { colors, spacing } from "../theme";

export default function TrajetScreen({ navigation }) {
  const { quartiersList } = useQuartiers();
  const [depart, setDepart] = useState("");
  const [destination, setDestination] = useState("");
  const [resultat, setResultat] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [conseil, setConseil] = useState("");
  const [alerte, setAlerte] = useState(null);
  const [erreur, setErreur] = useState("");
  const [loading, setLoading] = useState(false);

  const calculer = async () => {
    if (!depart || !destination) {
      setErreur("Sélectionnez départ et destination");
      return;
    }
    if (depart === destination) {
      setErreur("Départ et destination identiques");
      return;
    }
    setErreur("");
    setResultat(null);
    setAlternatives([]);
    setConseil("");
    setAlerte(null);
    setLoading(true);

    const data = await getCheminsAlternatifs(depart, destination);
    if (data.erreur) {
      const simple = await calculerChemin(depart, destination);
      if (simple.erreur) setErreur(simple.erreur);
      else if (simple.chemin) {
        setResultat(simple);
        setAlternatives([]);
      } else setErreur("Aucun chemin trouvé");
    } else if (data.chemins?.length > 0) {
      setResultat(data.chemins[0]);
      setAlternatives(data.chemins.slice(1));
      setConseil(data.conseil || data.recommandation?.message || "");
      if (data.alerte) setAlerte(data.alerte);
    } else {
      setErreur("Aucun chemin trouvé");
    }
    setLoading(false);
  };

  const voirSurCarte = () => {
    navigation.navigate("Carte", {
      depart,
      destination,
      autoCalc: true,
    });
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Calcul du trajet</Text>
      <Text style={styles.sub}>
        Dijkstra + alternatives Yen ({quartiersList.length} quartiers)
      </Text>

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

        <PrimaryButton label="Calculer" onPress={calculer} loading={loading} />

        {erreur ? <Text style={styles.error}>{erreur}</Text> : null}

        {conseil ? (
          <View style={styles.conseilBox}>
            <Text style={styles.conseilText}>{conseil}</Text>
          </View>
        ) : null}

        {alerte && (
          <View style={styles.alerte}>
            <Text style={styles.alerteText}>
              {alerte.message || "Embouteillage sur votre trajet"}
            </Text>
          </View>
        )}

        {resultat?.chemin && (
          <View style={styles.result}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>Trajet recommande</Text>
              {resultat.evite_trafic !== false && (
                <Text style={styles.badgeVert}>Sans trafic</Text>
              )}
              {resultat.evite_trafic === false && (
                <Text style={styles.badgeOrange}>Passe par trafic</Text>
              )}
            </View>
            <CheminSteps chemin={resultat.chemin} maxVisible={10} />
            <Text style={styles.meta}>
              {resultat.distance} km ·{" "}
              {resultat.etapes ?? resultat.chemin.length - 1} étapes
            </Text>
            <PrimaryButton
              label="Voir sur la carte (OSRM)"
              onPress={voirSurCarte}
              color={colors.violet}
              style={{ marginTop: 12 }}
            />
          </View>
        )}

        {alternatives.length > 0 && (
          <View style={styles.altBlock}>
            <Text style={styles.altTitle}>
              Alternatives ({alternatives.length})
            </Text>
            {alternatives.slice(0, 3).map((alt, i) => (
              <Pressable
                key={i}
                style={styles.altItem}
                onPress={() => setResultat(alt)}
              >
                <View style={styles.altHeader}>
                  <Text style={styles.altBadge}>Alt. {i + 1}</Text>
                  {alt.evite_trafic ? (
                    <Text style={styles.badgeVertSmall}>Sans trafic</Text>
                  ) : (
                    <Text style={styles.badgeOrangeSmall}>Trafic</Text>
                  )}
                  <Text style={styles.altDist}>{alt.distance} km</Text>
                </View>
                <CheminSteps chemin={alt.chemin} maxVisible={4} compact />
              </Pressable>
            ))}
          </View>
        )}
      </View>
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
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  error: {
    marginTop: 12,
    color: colors.orange,
    fontSize: 13,
    backgroundColor: "#FFF3E0",
    padding: 10,
    borderRadius: 8,
  },
  conseilBox: {
    marginTop: 12,
    backgroundColor: "#E8F5E9",
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: colors.vert,
  },
  conseilText: { fontSize: 13, color: colors.texte },
  alerte: {
    marginTop: 12,
    backgroundColor: "#FFEBEE",
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: colors.rouge,
  },
  alerteText: { fontSize: 13, color: "#C62828" },
  result: {
    marginTop: spacing.md,
    backgroundColor: "#E8F5E9",
    padding: 14,
    borderRadius: 12,
  },
  resultHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  resultTitle: { fontWeight: "700", color: colors.vert },
  badgeVert: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.vert,
    backgroundColor: "#C8E6C9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeOrange: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.orange,
    backgroundColor: "#FFE0B2",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeVertSmall: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.vert,
  },
  badgeOrangeSmall: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.orange,
  },
  meta: { marginTop: 10, fontSize: 13, fontWeight: "600" },
  altBlock: { marginTop: spacing.md },
  altTitle: { fontWeight: "600", marginBottom: 8 },
  altItem: {
    backgroundColor: colors.grisClair,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  altHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  altBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.violet,
    backgroundColor: `${colors.violet}22`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  altDist: { fontWeight: "700", marginLeft: "auto" },
});
