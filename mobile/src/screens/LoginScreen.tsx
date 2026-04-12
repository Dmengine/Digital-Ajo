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
        <View style={{ width: "100%", maxWidth: 460, alignSelf: "center", gap: 14 }}>
          <View style={{ gap: 8, alignItems: "center" }}>
            <Eyebrow>contripay</Eyebrow>
            <View style={{ alignItems: "center", gap: 6 }}>
              <Text style={{ color: colors.text, fontSize: 30, fontWeight: "800", textAlign: "center" }}>Sign in</Text>
              <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: "center" }}>
                Welcome back. Enter your account details to continue.
              </Text>
            </View>
          </View>

          <Card>
            <View style={{ gap: 12 }}>
              <View style={{ gap: 12 }}>
                <Text style={{ color: colors.text, fontWeight: "700" }}>Email or username</Text>
                <Field placeholder="Enter email or username" autoCapitalize="none" value={emailOrUsername} onChangeText={setEmailOrUsername} />
                <Text style={{ color: colors.text, fontWeight: "700" }}>Password</Text>
                <Field placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
              </View>

              <ErrorText message={error} />
              <PrimaryButton label="Login" onPress={onSubmit} loading={loading} />
            </View>
          </Card>

          <Pressable onPress={onGoRegister} style={{ alignSelf: "center", paddingVertical: 8 }}>
            <Text style={{ color: colors.brandSoft, fontWeight: "700" }}>Don't have an account? Register</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}
