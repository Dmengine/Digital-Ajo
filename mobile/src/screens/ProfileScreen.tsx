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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 10 }}>
        <View style={{ gap: 8 }}>
          <Eyebrow>ContriPay</Eyebrow>
          <Title>Profile & KYC</Title>
          <Subtitle>Manage your account identity, security status, and settlement details.</Subtitle>
        </View>

        <Card style={{ alignItems: "center", gap: 6, paddingTop: 22, paddingBottom: 22 }}>
          <View style={{ width: 104, height: 104, borderRadius: 52, backgroundColor: colors.panelElevated, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: colors.brand, fontSize: 30, fontWeight: "900" }}>{(user?.name ?? "M").slice(0, 1).toUpperCase()}</Text>
          </View>
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: "900", letterSpacing: -0.8 }}>{user?.name ?? "Member"}</Text>
          <Text style={{ color: colors.muted, fontWeight: "600" }}>Vault Member</Text>
        </Card>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Card style={{ flex: 1 }}>
            <SectionLabel>Identity status</SectionLabel>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900", marginTop: 6 }}>Tier {user?.kycTier ?? 1}</Text>
            <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "800", marginTop: 6 }}>Fully verified</Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <SectionLabel>Settlement</SectionLabel>
            <Text style={{ color: colors.brand, fontSize: 20, fontWeight: "900", marginTop: 6 }}>•••• {accountNumber.slice(-4) || "----"}</Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6 }}>{bankName || "No bank selected"}</Text>
          </Card>
        </View>

        <Card>
          <View style={{ gap: 8 }}>
            <SectionLabel>Account snapshot</SectionLabel>
            <Text style={{ color: colors.muted, lineHeight: 20 }}>
              Reliability {Number(user?.reliabilityScore ?? 100)}% · Wallet ₦{Number(user?.wallets?.main ?? 0).toLocaleString()}
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
            <PrimaryButton label="Log Out" onPress={() => void logout()} tone="ghost" />
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
