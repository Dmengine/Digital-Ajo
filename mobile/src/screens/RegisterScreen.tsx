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
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 18, gap: 14 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 8 }}>
          <Eyebrow>contripay</Eyebrow>
          <Title>Create account</Title>
          <Subtitle>Fill the form below to register your account.</Subtitle>
        </View>

        <Card>
          <View style={{ gap: 12 }}>
            <Text style={{ color: colors.text, fontWeight: "700" }}>Full name</Text>
            <Field placeholder="Enter full name" value={name} onChangeText={setName} />
            <Text style={{ color: colors.text, fontWeight: "700" }}>Email</Text>
            <Field placeholder="Enter email" autoCapitalize="none" value={email} onChangeText={setEmail} />
            <Text style={{ color: colors.text, fontWeight: "700" }}>Phone</Text>
            <Field placeholder="Enter phone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
            <Text style={{ color: colors.text, fontWeight: "700" }}>Username</Text>
            <Field placeholder="Choose username" autoCapitalize="none" value={username} onChangeText={setUsername} />
            <Text style={{ color: colors.text, fontWeight: "700" }}>Password</Text>
            <Field placeholder="Create password" secureTextEntry value={password} onChangeText={setPassword} />

            <ErrorText message={error} />
            <PrimaryButton label="Register" onPress={onSubmit} loading={loading} />
          </View>
        </Card>

        <Pressable onPress={onGoLogin} style={{ alignSelf: "center", paddingVertical: 8 }}>
          <Text style={{ color: colors.brandSoft, fontWeight: "700" }}>Already have an account? Login</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
