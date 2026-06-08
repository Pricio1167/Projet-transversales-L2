import { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  Modal,
} from "react-native";
import { colors, spacing } from "../theme";

export default function QuartierPicker({
  label,
  value,
  onChange,
  quartiers = [],
  placeholder = "Rechercher un quartier...",
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return quartiers.slice(0, 60);
    return quartiers.filter((n) => n.toLowerCase().includes(q)).slice(0, 100);
  }, [quartiers, search]);

  const select = (name) => {
    onChange(name);
    setSearch("");
    setOpen(false);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={value ? styles.value : styles.placeholder}>
          {value || placeholder}
        </Text>
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>{label}</Text>
              <Text style={styles.modalCount}>
                {quartiers.length} quartiers · {filtered.length} affiches
              </Text>
            </View>
            <Pressable onPress={() => setOpen(false)}>
              <Text style={styles.close}>Fermer</Text>
            </Pressable>
          </View>
          <TextInput
            style={styles.search}
            value={search}
            onChangeText={setSearch}
            placeholder={placeholder}
            placeholderTextColor={colors.texteMuted}
            autoFocus
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={[styles.item, value === item && styles.itemActive]}
                onPress={() => select(item)}
              >
                <Text style={styles.itemText}>{item}</Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>Aucun quartier trouve</Text>
            }
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.texte,
    marginBottom: 6,
  },
  trigger: {
    borderWidth: 1,
    borderColor: colors.bordure,
    borderRadius: 10,
    padding: 12,
    backgroundColor: colors.blanc,
  },
  value: { fontSize: 14, color: colors.texte },
  placeholder: { fontSize: 14, color: colors.texteMuted },
  modal: {
    flex: 1,
    backgroundColor: colors.grisClair,
    paddingTop: 48,
    paddingHorizontal: spacing.md,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.bleu },
  modalCount: { fontSize: 11, color: colors.texteMuted, marginTop: 2 },
  close: { fontSize: 15, color: colors.bleu, fontWeight: "600" },
  search: {
    borderWidth: 1,
    borderColor: colors.bordure,
    borderRadius: 10,
    padding: 12,
    backgroundColor: colors.blanc,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  item: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.bordure,
    backgroundColor: colors.blanc,
  },
  itemActive: { backgroundColor: "#E3F2FD" },
  itemText: { fontSize: 14, color: colors.texte },
  empty: {
    textAlign: "center",
    color: colors.texteMuted,
    marginTop: 24,
    fontSize: 14,
  },
});
