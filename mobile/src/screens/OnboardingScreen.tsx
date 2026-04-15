import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Card, Eyebrow, PrimaryButton, Screen, Subtitle, Title } from "../components/Ui";
import { colors } from "../theme/colors";

const slides = [
  {
    eyebrow: "Welcome",
    title: "ContriPay helps you manage contribution circles clearly.",
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

export function OnboardingScreen({ onFinish }: OnboardingScreenProps): React.JSX.Element {
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const isLast = index === slides.length - 1;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 18, paddingBottom: 12 }}>
        <View style={{ alignItems: "center", gap: 10, marginTop: 4 }}>
          <View style={{ width: 68, height: 68, borderRadius: 20, backgroundColor: colors.panel, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: colors.brand, fontSize: 30, fontWeight: "900" }}>▦</Text>
          </View>
          <Eyebrow>ContriPay</Eyebrow>
        </View>

        <Card style={{ padding: 20, alignItems: "center" }}>
          <View style={{ gap: 14, width: "100%" }}>
            <View style={{ alignSelf: "center", width: 220, height: 220, borderRadius: 110, backgroundColor: colors.panelElevated, alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 154, height: 154, borderRadius: 28, backgroundColor: colors.panel, alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Text style={{ color: colors.text, fontSize: 30, fontWeight: "900" }}>₦42,850</Text>
                <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.2 }}>Vault balance</Text>
              </View>
              <View style={{ position: "absolute", top: 26, right: -8, backgroundColor: colors.panel, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text style={{ color: colors.accent, fontWeight: "800" }}>+12.4%</Text>
              </View>
            </View>

            <View style={{ gap: 8, alignItems: "center" }}>
              <Eyebrow>{slide.eyebrow}</Eyebrow>
              <Title>{slide.title}</Title>
              <Subtitle>{slide.body}</Subtitle>
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
              {slides.map((_, dotIndex) => (
                <View
                  key={dotIndex}
                  style={{
                    height: 8,
                    flex: 1,
                    borderRadius: 999,
                    backgroundColor: dotIndex === index ? colors.brand : "rgba(75,68,84,0.45)",
                  }}
                />
              ))}
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

        <View style={{ alignSelf: "center", backgroundColor: colors.panel, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}>
          <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.3 }}>
            ContriPay Encryption Level 4
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}