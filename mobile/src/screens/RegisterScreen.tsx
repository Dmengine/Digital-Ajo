import { useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Text, View } from "react-native";
import Constants from "expo-constants";
import { register } from "../api/auth.api";
import { extractApiMessage } from "../api/client";
import { Card, ErrorText, Eyebrow, Field, NonCustodialNotice, PrimaryButton, Screen, Subtitle, Title } from "../components/Ui";
import { useAuth } from "../store/AuthContext";
import { colors } from "../theme/colors";

const privacyUrl = String((Constants.expoConfig?.extra as { privacyUrl?: string } | undefined)?.privacyUrl ?? "").trim();

const PRIVACY_SUMMARY =
  "We collect your name, email, phone number, payout bank details (account number, bank, account name) and the last 4 digits of your BVN/NIN, so your group can coordinate contributions and pay you on your turn. ContriPay does not hold your money.";

const openPrivacyNotice = () => {
  if (privacyUrl) {
    void Linking.openURL(privacyUrl);
    return;
  }
  Alert.alert("Privacy notice", PRIVACY_SUMMARY);
};

export function RegisterScreen({ onGoLogin }: { onGoLogin: () => void }) {
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!consentAccepted) {
      setError("You must accept the privacy notice to create an account.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await register({ name, email, phone, username, password, consentAccepted });
      await login(data.token, data.user);
    } catch (e) {
      setError(extractApiMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 18, gap: 16 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: colors.brand, fontSize: 18, fontWeight: "800" }}>Step 1 of 3</Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>Personal Info</Text>
          </View>
          <View style={{ height: 7, borderRadius: 999, backgroundColor: colors.panelElevated, overflow: "hidden" }}>
            <View style={{ width: "34%", height: "100%", borderRadius: 999, backgroundColor: colors.brand }} />
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Eyebrow>ContriPay</Eyebrow>
          <Title>Create your account</Title>
          <Subtitle>Organise your ajo group: clear turns, payment tracking and reminders.</Subtitle>
        </View>

        <NonCustodialNotice />

        <Card style={{ borderRadius: 28 }}>
          <View style={{ gap: 12 }}>
            <Text style={{ color: colors.muted, fontWeight: "800", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.4 }}>Full name</Text>
            <Field placeholder="Enter your full name" value={name} onChangeText={setName} />
            <Text style={{ color: colors.muted, fontWeight: "800", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.4 }}>Email address</Text>
            <Field placeholder="name@domain.com" autoCapitalize="none" value={email} onChangeText={setEmail} />
            <Text style={{ color: colors.muted, fontWeight: "800", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.4 }}>Phone number</Text>
            <Field placeholder="+234 000 000 0000" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
            <Text style={{ color: colors.muted, fontWeight: "800", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.4 }}>Username</Text>
            <Field placeholder="Choose a username" autoCapitalize="none" value={username} onChangeText={setUsername} />
            <Text style={{ color: colors.muted, fontWeight: "800", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.4 }}>Password</Text>
            <Field placeholder="Create a password (min. 8 characters)" secureTextEntry value={password} onChangeText={setPassword} />

            <Pressable
              onPress={() => setConsentAccepted((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: consentAccepted }}
              style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: consentAccepted ? colors.accent : colors.borderSoft,
                  backgroundColor: consentAccepted ? colors.accent : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 1,
                }}
              >
                {consentAccepted ? <Text style={{ color: colors.inkOnAccent, fontWeight: "900", fontSize: 13 }}>✓</Text> : null}
              </View>
              <Text style={{ flex: 1, color: colors.muted, lineHeight: 19, fontSize: 12 }}>
                I have read the{" "}
                <Text onPress={openPrivacyNotice} style={{ color: colors.accent, fontWeight: "800", textDecorationLine: "underline" }}>
                  privacy notice
                </Text>{" "}
                and agree to ContriPay processing my personal data as described there.
              </Text>
            </Pressable>

            <ErrorText message={error} />
            <PrimaryButton label="Next" onPress={onSubmit} loading={loading} tone="accent" />
          </View>
        </Card>

        <View style={{ gap: 10 }}>
          <Card style={{ backgroundColor: colors.panel, borderRadius: 22 }}>
            <Text style={{ color: colors.text, fontWeight: "800", fontSize: 16 }}>Pay each other directly</Text>
            <Text style={{ color: colors.muted, marginTop: 4, lineHeight: 20 }}>
              Each round, members send their contribution straight to the recipient's bank account.
            </Text>
          </Card>
          <Card style={{ backgroundColor: colors.panel, borderRadius: 22 }}>
            <Text style={{ color: colors.text, fontWeight: "800", fontSize: 16 }}>Save with people you trust</Text>
            <Text style={{ color: colors.muted, marginTop: 4, lineHeight: 20 }}>
              Groups are invite-only, so you choose who you save with.
            </Text>
          </Card>
        </View>

        <Pressable onPress={onGoLogin} style={{ alignSelf: "center", paddingVertical: 8 }}>
          <Text style={{ color: colors.muted, fontWeight: "600" }}>Already have an account? <Text style={{ color: colors.brand, fontWeight: "800" }}>Sign in to ContriPay</Text></Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
