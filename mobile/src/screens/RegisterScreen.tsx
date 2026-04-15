import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { register } from "../api/auth.api";
import { extractApiMessage } from "../api/client";
import { Card, ErrorText, Eyebrow, Field, PrimaryButton, Screen, Subtitle, Title } from "../components/Ui";
import { useAuth } from "../store/AuthContext";
import { colors } from "../theme/colors";

export function RegisterScreen({ onGoLogin }: { onGoLogin: () => void }) {
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await register({ name, email, phone, username, password });
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
          <Subtitle>Join the collective and secure your financial future with ContriPay.</Subtitle>
        </View>

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
            <Field placeholder="Create access key" secureTextEntry value={password} onChangeText={setPassword} />

            <Text style={{ color: colors.muted, lineHeight: 19, fontSize: 12 }}>
              By continuing, you agree to our terms and privacy policy.
            </Text>

            <ErrorText message={error} />
            <PrimaryButton label="Next" onPress={onSubmit} loading={loading} tone="accent" />
          </View>
        </Card>

        <View style={{ gap: 10 }}>
          <Card style={{ backgroundColor: colors.panel, borderRadius: 22 }}>
            <Text style={{ color: colors.text, fontWeight: "800", fontSize: 16 }}>Secure encryption</Text>
            <Text style={{ color: colors.muted, marginTop: 4, lineHeight: 20 }}>
              Your data is stored with military-grade encryption and secure access controls.
            </Text>
          </Card>
          <Card style={{ backgroundColor: colors.panel, borderRadius: 22 }}>
            <Text style={{ color: colors.text, fontWeight: "800", fontSize: 16 }}>Community built</Text>
            <Text style={{ color: colors.muted, marginTop: 4, lineHeight: 20 }}>
              Join members already using the vault for collective savings goals.
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
