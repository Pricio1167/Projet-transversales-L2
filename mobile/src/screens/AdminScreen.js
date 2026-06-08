import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  adminClearData,
  adminClearTrafic,
  adminDbHealth,
  adminAudit,
  adminExportCsv,
  adminOverview,
  adminBlockUser,
  adminSetUserRole,
  adminTraficDelete,
  adminReloadGraph,
  adminTrajets,
  adminUsers,
  getQuartiers,
  getTraficActif,
  simulerTraficAvance,
} from "../api";
import QuartierPicker from "../components/QuartierPicker";
import { colors, spacing } from "../theme";
import { Share } from "react-native";

export default function AdminScreen() {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [trajets, setTrajets] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [msg, setMsg] = useState("");
  const [dbOk, setDbOk] = useState(null);
  const [events, setEvents] = useState([]);
  const [traficActif, setTraficActif] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState([]);
  const [traficSrc, setTraficSrc] = useState("");
  const [traficDest, setTraficDest] = useState("");
  const [traficPoids, setTraficPoids] = useState(5);

  const load = async () => {
    setLoading(true);
    setMsg("");
    const [o, u, t, a, tr, q] = await Promise.all([
      adminOverview(),
      adminUsers(),
      adminTrajets(),
      adminAudit(60),
      getTraficActif(),
      getQuartiers(),
    ]);
    const errors = [o?.erreur, u?.erreur, t?.erreur, a?.erreur, tr?.erreur].filter(Boolean);
    if (errors.length) setMsg(errors.join(" — "));
    setOverview(o?.stats ? o : null);
    setUsers(u?.users || []);
    setTrajets(t?.trajets || []);
    setEvents(a?.events || []);
    setTraficActif(tr?.trafics || []);
    if (q?.quartiers) setNodes(Object.keys(q.quartiers).sort());
    const db = await adminDbHealth();
    if (db?.ok === true) setDbOk(true);
    else if (db?.ok === false) setDbOk(false);
    setLoading(false);
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

  const clearTrafic = async () => {
    const res = await adminClearTrafic();
    if (res?.message) setMsg(res.message);
    else if (res?.erreur) setMsg(res.erreur);
    await load();
  };

  const reloadGraph = async () => {
    const res = await adminReloadGraph();
    if (res?.message) setMsg(`${res.message} (${res.quartiers} quartiers)`);
    else if (res?.erreur) setMsg(res.erreur);
    await load();
  };

  const clearData = async (tables) => {
    const res = await adminClearData(tables);
    if (res?.message) setMsg(`${res.message} (${(res.cleared || []).join(", ")})`);
    else if (res?.erreur) setMsg(res.erreur);
    await load();
  };

  const purgeUser = async (userId) => {
    const res = await adminPurgeUser(userId);
    if (res?.message) setMsg(res.message);
    else if (res?.erreur) setMsg(res.erreur);
    await load();
  };

  const toggleBlock = async (userId, nextBlocked) => {
    const res = await adminBlockUser(userId, nextBlocked);
    if (res?.message) setMsg(res.message);
    else if (res?.erreur) setMsg(res.erreur);
    await load();
  };

  const changeUserRole = async (userId, nextRole) => {
    const res = await adminSetUserRole(userId, nextRole);
    if (res?.message) setMsg(res.message);
    else if (res?.erreur) setMsg(res.erreur);
    await load();
  };

  const deleteTrafic = async (id) => {
    const res = await adminTraficDelete(id);
    if (res?.message) setMsg(res.message);
    else if (res?.erreur) setMsg(res.erreur);
    await load();
  };

  const simulateTrafic = async () => {
    if (!traficSrc || !traficDest) {
      setMsg("Veuillez sélectionner une source et une destination");
      return;
    }
    const res = await simulerTraficAvance(traficSrc, traficDest, traficPoids);
    if (res?.message) setMsg(`Embouteillage simulé : ${res.message}`);
    else if (res?.erreur) setMsg(res.erreur);
    if (res?.alerte) setMsg(`⚠️ ${res.alerte.message}`);
    await load();
  };

  const exportCsv = async (kind) => {
    const res = await adminExportCsv(kind);
    if (res?.erreur) {
      setMsg(res.erreur);
      return;
    }
    try {
      await Share.share({
        title: `${kind}.csv`,
        message: res.text,
      });
    } catch {
      setMsg("Impossible de partager le CSV");
    }
  };

  if (loading) {
    return (
      <View style={[styles.page, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.bleu} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Espace Admin</Text>
          <Text style={styles.sub}>Monitoring + gestion simple</Text>
        </View>
        <Pressable style={styles.refreshBtn} onPress={load}>
          <Text style={styles.refreshText}>Rafraîchir</Text>
        </Pressable>
      </View>

      {msg ? <Text style={styles.msg}>{msg}</Text> : null}
      <View style={styles.healthRow}>
        <Text style={styles.healthText}>
          DB:{" "}
          {dbOk === null ? "—" : dbOk ? "OK" : "KO"}
        </Text>
      </View>

      <View style={styles.row}>
        <View style={[styles.stat, { borderColor: "#90CAF9" }]}>
          <Text style={styles.statVal}>{overview?.users ?? "—"}</Text>
          <Text style={styles.statLbl}>Utilisateurs</Text>
        </View>
        <View style={[styles.stat, { borderColor: "#A5D6A7" }]}>
          <Text style={styles.statVal}>{overview?.trajets ?? "—"}</Text>
          <Text style={styles.statLbl}>Trajets</Text>
        </View>
        <View style={[styles.stat, { borderColor: "#FFCC80" }]}>
          <Text style={styles.statVal}>{overview?.trafics_actifs ?? "—"}</Text>
          <Text style={styles.statLbl}>Trafics actifs</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Actions</Text>
        <Pressable style={styles.btnDanger} onPress={clearTrafic}>
          <Text style={styles.btnDangerText}>Désactiver tous les trafics</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={reloadGraph}>
          <Text style={styles.btnText}>Recharger le graphe</Text>
        </Pressable>
        <Pressable style={styles.btnGhost} onPress={() => clearData(["trajets"])}>
          <Text style={styles.btnGhostText}>Vider tous les trajets</Text>
        </Pressable>
        <Pressable style={styles.btnGhost} onPress={() => clearData(["performances"])}>
          <Text style={styles.btnGhostText}>Vider les performances</Text>
        </Pressable>
        <Pressable
          style={styles.btnGhost}
          onPress={() => clearData(["recherches_alternatives"])}
        >
          <Text style={styles.btnGhostText}>Vider recherches alternatives</Text>
        </Pressable>
        <Pressable style={styles.btnExport} onPress={() => exportCsv("users")}>
          <Text style={styles.btnExportText}>Exporter users.csv</Text>
        </Pressable>
        <Pressable style={styles.btnExport} onPress={() => exportCsv("trajets")}>
          <Text style={styles.btnExportText}>Exporter trajets.csv</Text>
        </Pressable>
        <Pressable style={styles.btnExport} onPress={() => exportCsv("trafic")}>
          <Text style={styles.btnExportText}>Exporter trafic.csv</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Simuler un embouteillage</Text>
        <QuartierPicker label="Source" value={traficSrc} onChange={setTraficSrc} quartiers={nodes} />
        <QuartierPicker label="Destination" value={traficDest} onChange={setTraficDest} quartiers={nodes} />
        <Text style={{ fontSize: 12, color: colors.texteMuted, marginBottom: 4 }}>Poids</Text>
        <TextInput
          value={String(traficPoids)}
          onChangeText={(v) => setTraficPoids(Number(v))}
          keyboardType="numeric"
          style={{
            borderWidth: 1, borderColor: colors.bordure, borderRadius: 12,
            padding: 12, fontSize: 14, backgroundColor: colors.grisClair, marginBottom: 12,
          }}
        />
        <Pressable style={styles.btn} onPress={simulateTrafic}>
          <Text style={styles.btnText}>Simuler l'embouteillage</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Derniers trajets (global)</Text>
        {trajets.length === 0 ? (
          <Text style={styles.empty}>Aucun trajet.</Text>
        ) : (
          trajets.slice(0, 12).map((t) => (
            <View key={t.id} style={styles.item}>
              <Text style={styles.itemTitle}>
                {t.depart} → {t.destination}
              </Text>
              <Text style={styles.itemMeta}>
                {t.distance} km · {t.etapes} étapes · {t.email || "—"}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <Text style={styles.cardTitle}>Trafic actif</Text>
          <Pressable style={styles.smallDanger} onPress={clearTrafic}>
            <Text style={styles.smallDangerText}>Tout desactiver</Text>
          </Pressable>
        </View>
        {traficActif.length === 0 ? (
          <Text style={styles.empty}>Aucun trafic actif.</Text>
        ) : (
          traficActif.slice(0, 10).map((t) => (
            <View key={t.id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{t.src} → {t.dest}</Text>
                <Text style={styles.itemMeta}>{t.utilisateur_nom || t.utilisateur_email || "—"} · {t.poids_original} → {t.poids_actuel}</Text>
              </View>
              <Pressable style={styles.smallDanger} onPress={() => deleteTrafic(t.id)}>
                <Text style={styles.smallDangerText}>Supprimer</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Utilisateurs</Text>
        {users.length === 0 ? (
          <Text style={styles.empty}>Aucun utilisateur.</Text>
        ) : (
          users.slice(0, 20).map((u) => (
            <View key={u.id} style={styles.item}>
              <Text style={styles.itemTitle}>
                {u.nom} {u.is_admin ? "(admin)" : ""}
              </Text>
              <Text style={styles.itemMeta}>
                {u.email} · Statut: {u.blocked ? "Bloqué" : "Actif"} · Role: {u.is_admin ? "admin" : "user"}
              </Text>
              {!u.is_admin ? (
                <View style={styles.userActions}>
                  <Pressable
                    style={styles.smallDanger}
                    onPress={() => toggleBlock(u.id, !u.blocked)}
                  >
                    <Text style={styles.smallDangerText}>
                      {u.blocked ? "Débloquer" : "Bloquer"}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.smallDanger}
                    onPress={() => purgeUser(u.id)}
                  >
                    <Text style={styles.smallDangerText}>Purger données</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.smallBtn, u.role === "admin" ? styles.smallBtnOn : null]}
                    onPress={() => changeUserRole(u.id, u.role === "admin" ? "user" : "admin")}
                  >
                    <Text style={[styles.smallBtnText, u.role === "admin" ? styles.smallBtnTextOn : null]}>Passer {u.role === "admin" ? "user" : "admin"}</Text>
                  </Pressable>
                </View>
              ) : (
                <Text style={styles.itemMeta}>Compte admin protégé</Text>
              )}
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Journal admin</Text>
        {events.length === 0 ? (
          <Text style={styles.empty}>Aucun événement.</Text>
        ) : (
          events.slice(0, 25).map((e) => (
            <View key={e.id} style={styles.item}>
              <Text style={styles.itemTitle}>
                {e.action} — {e.email || "admin"}
              </Text>
              <Text style={styles.itemMeta}>
                {String(e.created_at)}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.grisClair },
  content: { padding: spacing.md, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "700", color: colors.bleu },
  sub: { fontSize: 13, color: colors.texteMuted, marginBottom: spacing.md },
  msg: {
    marginBottom: spacing.md,
    color: colors.orange,
    backgroundColor: "#FFF3E0",
    padding: 10,
    borderRadius: 10,
  },
  healthRow: {
    marginBottom: spacing.md,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.blanc,
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  healthText: { color: colors.texteMuted, fontWeight: "600" },
  row: { flexDirection: "row", gap: 8, marginBottom: spacing.md },
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
  card: {
    backgroundColor: colors.blanc,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  cardTitle: { fontWeight: "700", fontSize: 16, marginBottom: 10, color: colors.texte },
  btnDanger: {
    backgroundColor: "#D32F2F",
    padding: 14,
    borderRadius: 40,
    alignItems: "center",
  },
  btnDangerText: { color: colors.blanc, fontWeight: "700" },
  btn: {
    backgroundColor: colors.bleu,
    padding: 14,
    borderRadius: 40,
    alignItems: "center",
    marginTop: 10,
  },
  btnText: { color: colors.blanc, fontWeight: "700" },
  btnGhost: {
    marginTop: 10,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.bordure,
    borderRadius: 40,
    backgroundColor: colors.blanc,
  },
  btnGhostText: { color: colors.texte, fontWeight: "600" },
  empty: { color: colors.texteMuted, paddingVertical: 8 },
  item: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.bordure,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.bordure,
  },
  itemTitle: { fontWeight: "600", color: colors.texte },
  itemMeta: { marginTop: 4, fontSize: 12, color: colors.texteMuted },
  userActions: { flexDirection: "row", gap: 10, marginTop: 8, flexWrap: "wrap" },
  smallBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#E3F2FD",
    borderColor: "#90CAF9",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  smallBtnOn: { backgroundColor: "#FFEBEE", borderColor: "#FFCDD2" },
  smallBtnText: { color: colors.bleu, fontWeight: "700", fontSize: 12 },
  smallBtnTextOn: { color: "#C62828" },
  smallDanger: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#FFEBEE",
    borderColor: "#FFCDD2",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  smallDangerText: { color: "#C62828", fontWeight: "700", fontSize: 12 },
  refreshBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#0ea5e9",
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  refreshText: {
    color: colors.blanc,
    fontWeight: "700",
    fontSize: 12,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  btnExport: {
    marginTop: 10,
    backgroundColor: "#0ea5e9",
    padding: 12,
    borderRadius: 40,
    alignItems: "center",
  },
  btnExportText: { color: colors.blanc, fontWeight: "700" },
});

