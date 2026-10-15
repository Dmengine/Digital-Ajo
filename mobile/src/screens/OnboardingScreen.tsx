import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Card, Eyebrow, PrimaryButton, Screen, Subtitle, Title } from "../components/Ui";
import { colors } from "../theme/colors";

const slides = [
  {
    eyebrow: "Welcome",
    title: "Save together with people you trust.",
    body: "ContriPay keeps your ajo group organised: whose turn it is, who has paid, and reminders before each due date.",
  },
  {
    eyebrow: "Take turns",
    title: "Each round, one member receives.",
    body: "Everyone else sends their contribution straight to that member's bank account, and the group admin confirms each payment.",
  },
  {
    eyebrow: "Your money stays yours",
    title: "ContriPay does not hold your money.",
    body: "Contributions are paid directly between group members. We only help you coordinate and remind each other.",
  },
];

const circleMembers = ["A", "B", "C", "D", "E", "F"];

function SavingCircleIllustration() {
  const size = 220;
  const radius = 82;
  return (
    <View style={{ alignSelf: "center", width: size, height: size, borderRadius: size / 2, backgroundColor: colors.panelElevated }}>
      <View
        style={{
          position: "absolute",
          left: size / 2 - 52,
          top: size / 2 - 52,
          width: 104,
          height: 104,
          borderRadius: 52,
          backgroundColor: colors.panel,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 10,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 13, fontWeight: "800", textAlign: "center" }}>Take turns</Text>
        <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "700", textAlign: "center", marginTop: 2 }}>one receives each round</Text>
      </View>
      {circleMembers.map((label, i) => {
        const angle = (i / circleMembers.length) * 2 * Math.PI - Math.PI / 2;
        const x = size / 2 + radius * Math.cos(angle) - 18;
        const y = size / 2 + radius * Math.sin(angle) - 18;
        const receiving = i === 0;
        return (
          <View
            key={label}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: receiving ? colors.accent : colors.panel,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: receiving ? colors.bg : colors.text, fontWeight: "900" }}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

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
            <SavingCircleIllustration />

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
            Coordination & reminders · no money held
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}