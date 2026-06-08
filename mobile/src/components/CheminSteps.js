import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme";

/** Affiche un chemin sous forme de pastilles */
export default function CheminSteps({ chemin = [], maxVisible = 6, compact = false }) {
  if (!chemin?.length) return null;

  const visible = chemin.slice(0, maxVisible);
  const rest = chemin.length - visible.length;

  return (
    <View style={styles.row}>
      {visible.map((q, i) => (
        <View key={`${q}-${i}`} style={styles.itemWrap}>
          <View style={[styles.chip, compact && styles.chipCompact]}>
            <Text style={[styles.chipText, compact && styles.chipTextCompact]} numberOfLines={1}>
              {q}
            </Text>
          </View>
          {i < visible.length - 1 && <Text style={styles.arrow}>→</Text>}
        </View>
      ))}
      {rest > 0 && <Text style={styles.more}>+{rest}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 4 },
  itemWrap: { flexDirection: "row", alignItems: "center" },
  chip: {
    backgroundColor: `${colors.primary || colors.bleu}18`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    maxWidth: 100,
  },
  chipCompact: { paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontSize: 11, fontWeight: "500", color: colors.primary || colors.bleu },
  chipTextCompact: { fontSize: 11 },
  arrow: { color: colors.texteMuted, fontSize: 10, marginHorizontal: 4 },
  more: { fontSize: 12, color: colors.texteMuted, fontWeight: "600" },
});
