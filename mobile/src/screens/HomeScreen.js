import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { getHistorique, checkServer, getStats } from "../api";
import { useAuth } from "../context/AuthContext";
import { colors, spacing } from "../theme";

export default function HomeScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const [historique, setHistorique] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [serverOk, setServerOk] = useState(null);
  const [nodeCount, setNodeCount] = useState(0);
  const [connexions, setConnexions] = useState(0);

  const load = async () => {
    const [hist, server, stats] = await Promise.all([
      getHistorique(),
      checkServer(),
      getStats(),
    ]);
    if (hist.trajets) setHistorique(hist.trajets);
    setServerOk(server.ok);
    setNodeCount(stats.quartiers || server.nodes || 0);
    setConnexions(stats.connexions || server.connexions || 0);
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const distanceMoyenne =
    historique.length > 0
      ? Math.round(
          (historique.reduce((a, t) => a + (t.distance || 0), 0) /
            historique.length) *
            10
        ) / 10
      : 0;

  const shortcuts = [
    { label: "Calculer un trajet", screen: "Trajet", color: colors.vert },
    { label: "Carte interactive", screen: "Carte", color: colors.bleu },
    { label: "Gestion du trafic", screen: "Trafic", color: colors.orange },
    { label: "Performances", screen: "Performances", color: colors.violet },
  ];

  const openTrajet = (depart, destination) => {
    navigation.getParent()?.navigate("Trajet");
    // Params passed via Carte for map; Trajet could read from global later
    if (depart && destination) {
      navigation.getParent()?.navigate("Carte", {
        depart,
        destination,
        autoCalc: true,
      });
    }
  };

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.welcome}>
            Bienvenue, {user?.nom || "Utilisateur"}
          </Text>
          <Text style={styles.sub}>Tableau de bord SIOTUM</Text>
        </View>
        <Pressable
          style={styles.iconBtn}
          onPress={() => navigation.navigate("Settings")}
        >
          <Ionicons name="settings-outline" size={22} color={colors.bleu} />
        </Pressable>
        <Pressable style={styles.logout} onPress={signOut}>
          <Text style={styles.logoutText}>Déconnexion</Text>
        </Pressable>
      </View>

      <View
        style={[
          styles.serverBanner,
          serverOk === true && styles.serverOk,
          serverOk === false && styles.serverErr,
        ]}
      >
        <Ionicons
          name={serverOk ? "cloud-done" : "cloud-offline"}
          size={18}
          color={serverOk ? colors.vert : colors.rouge}
        />
        <Text style={styles.serverText}>
          {serverOk === null
            ? "Vérification..."
            : serverOk
            ? `Serveur connecté · ${nodeCount} quartiers`
            : "Serveur inaccessible — Paramètres"}
        </Text>
        {!serverOk && serverOk !== null && (
          <Pressable onPress={() => navigation.navigate("Settings")}>
            <Text style={styles.serverLink}>Configurer</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.stat, { borderColor: "#A5D6A7" }]}>
          <Text style={styles.statVal}>{historique.length}</Text>
          <Text style={styles.statLbl}>Trajets</Text>
        </View>
        <View style={[styles.stat, { borderColor: "#90CAF9" }]}>
          <Text style={styles.statVal}>{nodeCount || "—"}</Text>
          <Text style={styles.statLbl}>Quartiers</Text>
        </View>
        <View style={[styles.stat, { borderColor: "#FFCC80" }]}>
          <Text style={styles.statVal}>{connexions || "—"}</Text>
          <Text style={styles.statLbl}>Liens</Text>
        </View>
        <View style={[styles.stat, { borderColor: "#B39DDB" }]}>
          <Text style={styles.statVal}>{distanceMoyenne}</Text>
          <Text style={styles.statLbl}>Dist. moy.</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Accès rapide</Text>
      {shortcuts.map((s) => (
        <Pressable
          key={s.screen}
          style={styles.shortcut}
          onPress={() => navigation.getParent()?.navigate(s.screen)}
        >
          <View style={[styles.dot, { backgroundColor: s.color }]} />
          <Text style={styles.shortcutText}>{s.label}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.texteMuted} />
        </Pressable>
      ))}

      <Text style={styles.sectionTitle}>Derniers trajets</Text>
      {historique.length === 0 ? (
        <Text style={styles.empty}>Aucun trajet enregistré.</Text>
      ) : (
        historique.slice(0, 8).map((t) => (
          <Pressable
            key={t.id}
            style={styles.trajet}
            onPress={() => openTrajet(t.depart, t.destination)}
          >
            <Text style={styles.trajetRoute}>
              {t.depart} → {t.destination}
            </Text>
            <Text style={styles.trajetMeta}>
              {t.distance} km · {t.etapes} étapes · Appuyer pour afficher la carte
            </Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.grisClair },
  content: { padding: spacing.md, paddingBottom: 32 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: spacing.md,
  },
  welcome: { fontSize: 22, fontWeight: "700", color: colors.texte },
  sub: { fontSize: 13, color: colors.texteMuted, marginTop: 4 },
  iconBtn: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.blanc,
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  logout: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.bordure,
    backgroundColor: colors.blanc,
  },
  logoutText: { fontSize: 12, color: colors.texteMuted, fontWeight: "600" },
  serverBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: spacing.md,
    backgroundColor: colors.blanc,
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  serverOk: { backgroundColor: "#E8F5E9", borderColor: "#A5D6A7" },
  serverErr: { backgroundColor: "#FFEBEE", borderColor: "#FFCDD2" },
  serverText: { flex: 1, fontSize: 12, color: colors.texte },
  serverLink: { fontSize: 12, color: colors.bleu, fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: spacing.lg },
  stat: {
    flex: 1,
    backgroundColor: colors.blanc,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  statVal: { fontSize: 22, fontWeight: "700", color: colors.texte },
  statLbl: { fontSize: 10, color: colors.texteMuted, marginTop: 4 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.texte,
    marginBottom: 10,
    marginTop: 4,
  },
  shortcut: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.blanc,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  shortcutText: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.texte },
  trajet: {
    backgroundColor: colors.blanc,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  trajetRoute: { fontWeight: "600", fontSize: 14, color: colors.texte },
  trajetMeta: { fontSize: 12, color: colors.texteMuted, marginTop: 4 },
  empty: {
    textAlign: "center",
    color: colors.texteMuted,
    padding: 24,
    fontSize: 13,
  },
});
