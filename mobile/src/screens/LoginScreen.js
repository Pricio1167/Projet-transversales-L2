import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { login } from "../api";
import { useAuth } from "../context/AuthContext";
import { colors, spacing } from "../theme";

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErreur("Veuillez remplir tous les champs");
      return;
    }
    setErreur("");
    setLoading(true);
    const data = await login(email.trim(), password);
    if (data.erreur) {
      setErreur(data.erreur);
    } else {
      await signIn(data.token, data.user);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>S</Text>
        </View>
        <Text style={styles.title}>SIOTUM</Text>
        <Text style={styles.subtitle}>
          Navigation intelligente — Antananarivo
        </Text>
      </View>

      <View style={styles.card}>
        {erreur ? <Text style={styles.error}>{erreur}</Text> : null}

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="votre@email.com"
          placeholderTextColor={colors.texteMuted}
        />

        <Text style={styles.label}>Mot de passe</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="********"
          placeholderTextColor={colors.texteMuted}
        />

        <Pressable
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.blanc} />
          ) : (
            <Text style={styles.btnText}>Se connecter</Text>
          )}
        </Pressable>

        <Pressable onPress={() => navigation.navigate("Register")}>
          <Text style={styles.link}>Créer un compte</Text>
        </Pressable>

        <Text style={styles.hint}>Compte de démonstration : admin@admin.com / admin123</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.grisClair,
    justifyContent: "center",
    padding: spacing.lg,
  },
  header: { alignItems: "center", marginBottom: spacing.lg },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.bleu,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  logoText: { color: colors.blanc, fontSize: 28, fontWeight: "700" },
  title: { fontSize: 26, fontWeight: "700", color: colors.texte },
  subtitle: {
    fontSize: 13,
    color: colors.texteMuted,
    textAlign: "center",
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.blanc,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.texte,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.bordure,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: colors.texte,
    backgroundColor: colors.blanc,
  },
  btn: {
    backgroundColor: colors.bleu,
    borderRadius: 40,
    padding: 14,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: colors.blanc, fontWeight: "700", fontSize: 15 },
  error: {
    color: colors.orange,
    backgroundColor: "#FFF3E0",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    fontSize: 13,
  },
  link: {
    textAlign: "center",
    color: colors.bleu,
    fontWeight: "600",
    marginTop: spacing.md,
    fontSize: 14,
  },
  hint: {
    textAlign: "center",
    color: colors.texteMuted,
    fontSize: 11,
    marginTop: spacing.md,
  },
});
