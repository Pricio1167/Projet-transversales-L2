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
  ScrollView,
} from "react-native";
import { register } from "../api";
import { useAuth } from "../context/AuthContext";
import { colors, spacing } from "../theme";

export default function RegisterScreen({ navigation }) {
  const { signIn } = useAuth();
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [erreur, setErreur] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!nom || !email || !password || !confirm) {
      setErreur("Tous les champs sont requis");
      return;
    }
    if (password !== confirm) {
      setErreur("Les mots de passe ne correspondent pas");
      return;
    }
    if (password.length < 6) {
      setErreur("Mot de passe : 6 caracteres minimum");
      return;
    }
    setErreur("");
    setLoading(true);
    const data = await register(nom.trim(), email.trim(), password);
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
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Créer un compte</Text>
        <View style={styles.card}>
          {erreur ? <Text style={styles.error}>{erreur}</Text> : null}

          <Text style={styles.label}>Nom</Text>
          <TextInput
            style={styles.input}
            value={nom}
            onChangeText={setNom}
            placeholder="Votre nom"
            placeholderTextColor={colors.texteMuted}
          />

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
            placeholderTextColor={colors.texteMuted}
          />

          <Text style={styles.label}>Confirmation</Text>
          <TextInput
            style={styles.input}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            placeholderTextColor={colors.texteMuted}
          />

          <Pressable
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.blanc} />
            ) : (
              <Text style={styles.btnText}>S'inscrire</Text>
            )}
          </Pressable>

          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.link}>Deja un compte ? Se connecter</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.grisClair },
  scroll: { padding: spacing.lg, paddingTop: 56 },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.bleu,
    marginBottom: spacing.lg,
    textAlign: "center",
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
  },
  btn: {
    backgroundColor: colors.bleu,
    borderRadius: 40,
    padding: 14,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: colors.blanc, fontWeight: "700" },
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
  },
});
