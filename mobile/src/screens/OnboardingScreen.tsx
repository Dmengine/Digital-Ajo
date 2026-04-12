import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Card, Eyebrow, PrimaryButton, Screen, Subtitle, Title } from "../components/Ui";
import { colors } from "../theme/colors";

const slides = [
  {
    eyebrow: "Welcome",
    title: "contripay helps you manage group contributions clearly.",
    body: "Track wallet activity, contribution cycles, and payout readiness in one simple flow.",
  },
  {
    eyebrow: "Groups",
    title: "Join circles, view member progress, and chat live.",
    body: "Open any group to see contribution metrics, defaulter signals, and current round details.",
  },
  {
    eyebrow: "Wallet",
    title: "Deposit, verify, and withdraw with safer operations.",
    body: "Your mobile actions are aligned with backend idempotency and transfer status handling.",
  },
];

type OnboardingScreenProps = {
  onFinish: () => void;
};

export function OnboardingScreen({ onFinish }: OnboardingScreenProps): JSX.Element {
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const isLast = index === slides.length - 1;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 12 }}>
        <View style={{ gap: 8 }}>
          <Eyebrow>{slide.eyebrow}</Eyebrow>
          <Title>{slide.title}</Title>
          <Subtitle>{slide.body}</Subtitle>
        </View>

        <Card>
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {slides.map((_, dotIndex) => (
                <View
                  key={dotIndex}
                  style={{
                    height: 8,
                    flex: 1,
                    borderRadius: 999,
                    backgroundColor: dotIndex === index ? colors.brand : "rgba(255,255,255,0.10)",
                  }}
                />
              ))}
            </View>

            <View style={{ borderRadius: 18, backgroundColor: colors.panelElevated, padding: 14, gap: 8 }}>
              <Text style={{ color: colors.text, fontWeight: "800", fontSize: 16 }}>Why contripay</Text>
              <Text style={{ color: colors.muted, lineHeight: 20 }}>
                A focused mobile experience for cooperative finance with clear, non-overlapping layouts and backend-aligned actions.
              </Text>
            </View>
          </View>
        </Card>

        <View style={{ gap: 10 }}>
          <PrimaryButton
            label={isLast ? "Get started" : "Next"}
            onPress={() => {
              if (isLast) {
                onFinish();
                return;
              }
              setIndex((prev) => prev + 1);
            }}
          />

          {!isLast ? (
            <Pressable onPress={onFinish} style={{ alignSelf: "center", paddingVertical: 8, paddingHorizontal: 12 }}>
              <Text style={{ color: colors.muted, fontWeight: "700" }}>Skip</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}