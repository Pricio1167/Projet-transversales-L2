import { Pressable, Text, ActivityIndicator, StyleSheet } from "react-native";
import { colors } from "../theme";

export default function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  color = colors.bleu,
  style,
}) {
  const off = disabled || loading;
  return (
    <Pressable
      style={[styles.btn, { backgroundColor: color }, off && styles.off, style]}
      onPress={onPress}
      disabled={off}
    >
      {loading ? (
        <ActivityIndicator color={colors.blanc} />
      ) : (
        <Text style={styles.text}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 40,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  off: { opacity: 0.65 },
  text: { color: colors.blanc, fontWeight: "700", fontSize: 15 },
});
