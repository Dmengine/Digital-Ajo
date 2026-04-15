import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme/colors";

export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.screen}>
        <View style={styles.background} pointerEvents="none">
          <View style={[styles.orb, styles.orbOne]} />
          <View style={[styles.orb, styles.orbTwo]} />
          <View style={styles.grid} />
        </View>
        <View style={styles.content}>{children}</View>
      </View>
    </SafeAreaView>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

export function Subtitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.subtitle}>{children}</Text>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export function Field(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput {...props} style={[styles.input, props.style]} placeholderTextColor={colors.muted} />;
}

export function PrimaryButton({
  label,
  onPress,
  loading,
  tone = "brand",
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  tone?: "brand" | "accent" | "ghost";
}) {
  const buttonStyle =
    tone === "accent"
      ? styles.buttonAccent
      : tone === "ghost"
        ? styles.buttonGhost
        : styles.button;

  const buttonTextStyle =
    tone === "accent"
      ? styles.buttonTextAccent
      : tone === "ghost"
        ? styles.buttonTextGhost
        : styles.buttonText;

  return (
    <Pressable
      style={({ pressed }) => [
        buttonStyle,
        pressed ? styles.buttonPressed : null,
      ]}
      onPress={onPress}
      disabled={Boolean(loading)}
    >
      {loading ? <ActivityIndicator color={tone === "accent" ? colors.inkOnAccent : colors.inkOnBrand} /> : <Text style={buttonTextStyle}>{label}</Text>}
    </Pressable>
  );
}

export function ErrorText({ message }: { message?: string | null }) {
  if (!message) return null;
  return <Text style={styles.error}>{message}</Text>;
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  orb: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.75,
  },
  orbOne: {
    width: 260,
    height: 260,
    top: -80,
    left: -90,
    backgroundColor: "rgba(171,115,255,0.24)",
  },
  orbTwo: {
    width: 210,
    height: 210,
    top: 96,
    right: -72,
    backgroundColor: "rgba(64,229,108,0.10)",
  },
  grid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.08,
    backgroundColor: "transparent",
    borderTopWidth: 0.5,
    borderLeftWidth: 0.5,
    borderColor: "rgba(255,255,255,0.04)",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 16,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: -1.25,
    flexShrink: 1,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 2.4,
    color: colors.muted,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 23,
    color: colors.muted,
    flexShrink: 1,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.8,
    color: colors.muted,
  },
  input: {
    backgroundColor: colors.panelElevated,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  button: {
    marginTop: 8,
    backgroundColor: colors.brand,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: colors.brand,
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  buttonAccent: {
    marginTop: 8,
    backgroundColor: colors.accent,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: colors.accent,
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  buttonGhost: {
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  buttonText: {
    color: colors.inkOnBrand,
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  buttonTextAccent: {
    color: colors.inkOnAccent,
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  buttonTextGhost: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  buttonPressed: {
    transform: [{ scale: 0.985 }],
  },
  error: {
    color: colors.danger,
    fontWeight: "600",
  },
  card: {
    backgroundColor: colors.panel,
    borderRadius: 24,
    padding: 18,
    shadowColor: "#4b4454",
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  statChip: {
    flex: 1,
    minWidth: 110,
    backgroundColor: colors.panelElevated,
    borderRadius: 18,
    padding: 12,
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "700",
  },
  statValue: {
    fontSize: 18,
    color: colors.text,
    fontWeight: "800",
  },
});
