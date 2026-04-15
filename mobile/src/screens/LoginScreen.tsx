import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { login } from "../api/auth.api";
import { extractApiMessage } from "../api/client";
import { Card, ErrorText, Eyebrow, Field, PrimaryButton, Screen, Subtitle, Title } from "../components/Ui";
import { useAuth } from "../store/AuthContext";
import { colors } from "../theme/colors";

export function LoginScreen({ onGoRegister }: { onGoRegister: () => void }) {
  const { login: loginSession } = useAuth();
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await login(emailOrUsername.trim(), password);
      await loginSession(data.token, data.user);
    } catch (e) {
      setError(extractApiMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingBottom: 8 }}
      >
        <View style={{ width: "100%", maxWidth: 460, alignSelf: "center", gap: 18 }}>
          <View style={{ gap: 8, alignItems: "center", marginBottom: 4 }}>
            <Eyebrow>ContriPay</Eyebrow>
            <View style={{ alignItems: "center", gap: 8 }}>
              <Title>ContriPay</Title>
              <Subtitle>Enter your secure access credentials.</Subtitle>
            </View>
          </View>

          <Card style={{ borderRadius: 28, padding: 20 }}>
            <View style={{ gap: 14 }}>
              <View style={{ gap: 12 }}>
                <Text style={{ color: colors.muted, fontWeight: "800", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.6 }}>Vault ID / Email</Text>
                <Field placeholder="name@vault.com" autoCapitalize="none" value={emailOrUsername} onChangeText={setEmailOrUsername} />
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: colors.muted, fontWeight: "800", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.6 }}>Access key</Text>
                  <Text style={{ color: colors.brand, fontSize: 11, fontWeight: "800" }}>Forgot key?</Text>
                </View>
                <Field placeholder="••••••••••••" secureTextEntry value={password} onChangeText={setPassword} />
              </View>

              <ErrorText message={error} />
              <PrimaryButton label="Sign In" onPress={onSubmit} loading={loading} tone="accent" />

              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: "rgba(150,141,160,0.28)" }} />
                <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.4 }}>Biometric Access</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: "rgba(150,141,160,0.28)" }} />
              </View>

              <View style={{ alignItems: "center", gap: 8 }}>
                <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: colors.panelElevated, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: colors.brand, fontSize: 20, fontWeight: "900" }}>◉</Text>
                </View>
                <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.4 }}>Face ID</Text>
              </View>
            </View>
          </Card>

          <Pressable onPress={onGoRegister} style={{ alignSelf: "center", paddingVertical: 8 }}>
            <Text style={{ color: colors.muted, fontWeight: "600" }}>New to the collective? <Text style={{ color: colors.accent, fontWeight: "800" }}>Create an account</Text></Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}
