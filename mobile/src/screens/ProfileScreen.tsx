import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { submitTier1Kyc } from "../api/auth.api";
import { extractApiMessage } from "../api/client";
import { Card, ErrorText, Eyebrow, Field, PrimaryButton, Screen, SectionLabel, Subtitle, Title } from "../components/Ui";
import { useAuth } from "../store/AuthContext";
import { colors } from "../theme/colors";

export function ProfileScreen() {
  const { logout, user } = useAuth();
  const [bvnOrNin, setBvnOrNin] = useState("");
  const [dob, setDob] = useState("");
  const [residentialAddress, setResidentialAddress] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountName, setAccountName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setMessage(null);
    setError(null);
    try {
      const data = await submitTier1Kyc({
        bvnOrNin,
        dob,
        residentialAddress,
        accountNumber,
        bankName,
        bankCode: bankCode || undefined,
        accountName,
      });
      setMessage(data.message);
    } catch (e) {
      setError(extractApiMessage(e));
    }
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 10 }}>
        <View style={{ gap: 8 }}>
          <Eyebrow>Profile</Eyebrow>
          <Title>Verification and bank details.</Title>
          <Subtitle>Keep your identity and withdrawal details current so transfers and group access stay smooth.</Subtitle>
        </View>

        <Card>
          <View style={{ gap: 8 }}>
            <SectionLabel>Account status</SectionLabel>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>{user?.name ?? "Member"}</Text>
            <Text style={{ color: colors.muted, lineHeight: 20 }}>
              KYC tier {user?.kycTier ?? 1} · Reliability {Number(user?.reliabilityScore ?? 100)}% · Wallet N{Number(user?.wallets?.main ?? 0).toLocaleString()}
            </Text>
          </View>
        </Card>

        <Card>
          <SectionLabel>KYC details</SectionLabel>
          <View style={{ gap: 12, marginTop: 10 }}>
            <Field placeholder="BVN or NIN" value={bvnOrNin} onChangeText={setBvnOrNin} />
            <Field placeholder="Date of birth (YYYY-MM-DD)" value={dob} onChangeText={setDob} />
            <Field placeholder="Residential address" value={residentialAddress} onChangeText={setResidentialAddress} />
          </View>
        </Card>

        <Card>
          <SectionLabel>Bank details</SectionLabel>
          <View style={{ gap: 12, marginTop: 10 }}>
            <Field placeholder="Account number" value={accountNumber} onChangeText={setAccountNumber} keyboardType="numeric" />
            <Field placeholder="Bank name" value={bankName} onChangeText={setBankName} />
            <Field placeholder="Bank code (optional)" value={bankCode} onChangeText={setBankCode} />
            <Field placeholder="Account name" value={accountName} onChangeText={setAccountName} />
          </View>
        </Card>

        <Card>
          <View style={{ gap: 10 }}>
            <PrimaryButton label="Submit Tier 1 KYC" onPress={onSubmit} tone="accent" />
            <PrimaryButton label="Logout" onPress={() => void logout()} tone="ghost" />
          </View>
        </Card>

        <ErrorText message={error} />
        {message ? (
          <Card>
            <Text style={{ color: colors.text, fontWeight: "700" }}>{message}</Text>
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
