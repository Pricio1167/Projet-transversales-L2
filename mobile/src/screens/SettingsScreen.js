import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
} from "react-native";
import {
  checkServer,
  getApiUrl,
  getStats,
  getStoredApiUrl,
  setStoredApiUrl,
} from "../api";
import { colors, spacing } from "../theme";

function getDefaultHint() {
  return getApiUrl();
}

export default function SettingsScreen({ navigation }) {
  const [apiUrl, setApiUrl] = useState("");
  const [status, setStatus] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    getStoredApiUrl().then((url) => setApiUrl(url));
    testConnection();
  }, []);

  const testConnection = async () => {
    setStatus("testing");
    const result = await checkServer();
    const stats = result.ok ? await getStats() : {};
    setStatus(result.ok ? "ok" : "error");
    if (result.ok) {
      const n = stats.quartiers || result.quartiers || 0;
      const c = stats.connexions || result.connexions || 0;
      const connexe = stats.graphe_connexe ? " · reseau connexe" : "";
      setMsg(`Connecte — ${n} quartiers, ${c} liaisons${connexe}`);
    } else {
      setMsg(`Serveur inaccessible (${result.url})`);
    }
  };

  const save = async () => {
    await setStoredApiUrl(apiUrl);
    setMsg("URL enregistree");
    await testConnection();
  };

  const reset = async () => {
    await setStoredApiUrl("");
    const def = getDefaultHint();
    setApiUrl(def);
    setMsg("URL par defaut restauree");
    await testConnection();
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Pressable
        style={styles.back}
        onPress={() => navigation?.goBack?.()}
      >
        <Text style={styles.backText}>Retour</Text>
      </Pressable>
      <Text style={styles.title}>Parametres</Text>
      <Text style={styles.sub}>
        Sur telephone physique, entre l'IP de ton PC (meme Wi-Fi).
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>URL du serveur Flask</Text>
        <TextInput
          style={styles.input}
          value={apiUrl}
          onChangeText={setApiUrl}
          placeholder="http://192.168.1.42:5000"
          placeholderTextColor={colors.texteMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.hint}>Defaut : {getDefaultHint()}</Text>

        <Pressable style={styles.btn} onPress={save}>
          <Text style={styles.btnText}>Enregistrer</Text>
        </Pressable>
        <Pressable style={styles.btnGhost} onPress={reset}>
          <Text style={styles.btnGhostText}>Reinitialiser</Text>
        </Pressable>
        <Pressable style={styles.btnGhost} onPress={testConnection}>
          <Text style={styles.btnGhostText}>Tester la connexion</Text>
        </Pressable>

        {msg ? (
          <View
            style={[
              styles.statusBox,
              status === "ok" && styles.statusOk,
              status === "error" && styles.statusErr,
            ]}
          >
            <Text style={styles.statusText}>{msg}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Aide</Text>
        <Text style={styles.help}>
          1. Demarre le backend : python main.py{"\n"}
          2. PC et telephone sur le meme Wi-Fi{"\n"}
          3. Utilise l'IP locale du PC (ipconfig){"\n"}
          4. Exemple : http://192.168.1.42:5000
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.grisClair },
  content: { padding: spacing.md, paddingBottom: 40 },
  back: { alignSelf: "flex-start", marginBottom: spacing.sm },
  backText: { color: colors.bleu, fontWeight: "700", fontSize: 13 },
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
  label: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.bordure,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: colors.texte,
  },
  hint: { fontSize: 11, color: colors.texteMuted, marginTop: 6 },
  btn: {
    backgroundColor: colors.bleu,
    borderRadius: 40,
    padding: 14,
    alignItems: "center",
    marginTop: spacing.md,
  },
  btnText: { color: colors.blanc, fontWeight: "700" },
  btnGhost: {
    padding: 12,
    alignItems: "center",
    marginTop: 8,
  },
  btnGhostText: { color: colors.bleu, fontWeight: "600" },
  statusBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.grisClair,
  },
  statusOk: { backgroundColor: "#E8F5E9" },
  statusErr: { backgroundColor: "#FFEBEE" },
  statusText: { fontSize: 13, color: colors.texte },
  cardTitle: { fontWeight: "700", fontSize: 16, marginBottom: 8 },
  help: { fontSize: 13, color: colors.texteMuted, lineHeight: 22 },
});
