import React from "react";
import { Animated, ActivityIndicator, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme/colors";

export function Screen({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const orbOne = React.useRef(new Animated.Value(0)).current;
  const orbTwo = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const drift = (value: Animated.Value, toValue: number, duration: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, { toValue, duration, useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration, useNativeDriver: true }),
        ])
      ).start();
    };

    drift(orbOne, 1, 9000);
    drift(orbTwo, 1, 11000);
  }, [orbOne, orbTwo]);

  const glowOne = {
    transform: [
      {
        translateX: orbOne.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.08, width * 0.12] }),
      },
      {
        translateY: orbOne.interpolate({ inputRange: [0, 1], outputRange: [0, 40] }),
      },
      {
        scale: orbOne.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }),
      },
    ],
  };

  const glowTwo = {
    transform: [
      {
        translateX: orbTwo.interpolate({ inputRange: [0, 1], outputRange: [width * 0.22, width * 0.04] }),
      },
      {
        translateY: orbTwo.interpolate({ inputRange: [0, 1], outputRange: [60, -10] }),
      },
      {
        scale: orbTwo.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] }),
      },
    ],
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.screen}>
        <View style={styles.background} pointerEvents="none">
          <Animated.View style={[styles.orb, styles.orbOne, glowOne]} />
          <Animated.View style={[styles.orb, styles.orbTwo, glowTwo]} />
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

  return (
    <Pressable
      style={({ pressed }) => [
        buttonStyle,
        pressed ? styles.buttonPressed : null,
      ]}
      onPress={onPress}
      disabled={Boolean(loading)}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{label}</Text>}
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
    width: 220,
    height: 220,
    top: -60,
    left: -60,
    backgroundColor: "rgba(124,92,255,0.26)",
  },
  orbTwo: {
    width: 180,
    height: 180,
    top: 80,
    right: -40,
    backgroundColor: "rgba(39,211,162,0.16)",
  },
  grid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.18,
    backgroundColor: "transparent",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    gap: 14,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.8,
    flexShrink: 1,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 2.2,
    color: colors.brandSoft,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: colors.text,
  },
  button: {
    marginTop: 8,
    backgroundColor: colors.brand,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: colors.brand,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  buttonAccent: {
    marginTop: 8,
    backgroundColor: colors.accent,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: colors.accent,
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  buttonGhost: {
    marginTop: 8,
    backgroundColor: "transparent",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  buttonText: {
    color: "#fff",
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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 4,
  },
  statChip: {
    flex: 1,
    minWidth: 110,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: colors.border,
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
