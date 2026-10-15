import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { listBanks, submitTier1Kyc, type Bank } from "../api/auth.api";
import { extractApiMessage } from "../api/client";
import { Card, ErrorText, Eyebrow, Field, PrimaryButton, Screen, SectionLabel, Subtitle, Title } from "../components/Ui";
import { useAuth } from "../store/AuthContext";
import { colors } from "../theme/colors";

export function ProfileScreen() {
  const { logout, user, refreshProfile } = useAuth();
  const detailsSubmitted = Boolean(user?.basicKycCompleted);
  const bankAccount = user?.bankAccount ?? null;
  const identity = user?.identity ?? null;

  const [editing, setEditing] = useState(!detailsSubmitted);
  const [identityType, setIdentityType] = useState<"bvn" | "nin">("bvn");
  const [bvnOrNin, setBvnOrNin] = useState("");
  const [dob, setDob] = useState("");
  const [residentialAddress, setResidentialAddress] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankQuery, setBankQuery] = useState("");
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing || banks.length > 0) return;
    listBanks()
      .then((res) => setBanks(Array.isArray(res.banks) ? res.banks : []))
      .catch((e) => setError(extractApiMessage(e)));
  }, [editing, banks.length]);

  const bankMatches = useMemo(() => {
    const q = bankQuery.trim().toLowerCase();
    if (!q || selectedBank?.name === bankQuery) return [];
    return banks.filter((b) => b.name.toLowerCase().includes(q)).slice(0, 8);
  }, [bankQuery, banks, selectedBank]);

  const onSubmit = async () => {
    setMessage(null);
    setError(null);
    if (!/^\d{11}$/.test(bvnOrNin.trim())) return setError("BVN/NIN must be 11 digits.");
    if (!/^\d{10}$/.test(accountNumber.trim())) return setError("Account number must be 10 digits.");
    if (!selectedBank) return setError("Select your bank from the list.");

    setSubmitting(true);
    try {
      const data = await submitTier1Kyc({
        bvnOrNin: bvnOrNin.trim(),
        identityType,
        dob,
        residentialAddress,
        accountNumber: accountNumber.trim(),
        bankName: selectedBank.name,
        bankCode: selectedBank.code,
      });
      setMessage(`${data.message} Account name: ${data.bankAccount.accountName ?? ""}`);
      setEditing(false);
      setBvnOrNin("");
      await refreshProfile();
    } catch (e) {
      setError(extractApiMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 10 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 8 }}>
          <Eyebrow>ContriPay</Eyebrow>
          <Title>Profile & details</Title>
          <Subtitle>
            When it's your turn, members pay directly into your bank account. ContriPay never receives or holds the money.
          </Subtitle>
        </View>

        <Card style={{ alignItems: "center", gap: 6, paddingTop: 22, paddingBottom: 22 }}>
          <View style={{ width: 104, height: 104, borderRadius: 52, backgroundColor: colors.panelElevated, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: colors.brand, fontSize: 30, fontWeight: "900" }}>{(user?.name ?? "M").slice(0, 1).toUpperCase()}</Text>
          </View>
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: "900", letterSpacing: -0.8 }}>{user?.name ?? "Member"}</Text>
          <Text style={{ color: colors.muted, fontWeight: "600" }}>@{user?.username ?? "member"}</Text>
        </Card>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Card style={{ flex: 1 }}>
            <SectionLabel>{identity?.type ? identity.type.toUpperCase() : "BVN/NIN"}</SectionLabel>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900", marginTop: 6 }}>
              {identity?.last4 ? `•••• ${identity.last4}` : "—"}
            </Text>
            <Text style={{ color: detailsSubmitted ? colors.muted : colors.warning, fontSize: 12, fontWeight: "800", marginTop: 6 }}>
              {detailsSubmitted ? "Details submitted (not verified)" : "Not submitted"}
            </Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <SectionLabel>Payout account</SectionLabel>
            <Text style={{ color: colors.brand, fontSize: 20, fontWeight: "900", marginTop: 6 }}>
              •••• {bankAccount?.accountNumber?.slice(-4) ?? "----"}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6 }}>{bankAccount?.bankName ?? "No bank added"}</Text>
            {bankAccount ? (
              <Text style={{ color: bankAccount.confirmed ? colors.accent : colors.warning, fontSize: 12, fontWeight: "800", marginTop: 4 }}>
                {bankAccount.confirmed ? "Bank account confirmed" : "Not confirmed"}
              </Text>
            ) : null}
          </Card>
        </View>

        <Card>
          <View style={{ gap: 8 }}>
            <SectionLabel>Reliability</SectionLabel>
            <Text style={{ color: colors.muted, lineHeight: 20 }}>
              Score {Number(user?.reliabilityScore ?? 100)}/100. Paying on time raises it; missed payments lower it.
            </Text>
          </View>
        </Card>

        {editing ? (
          <>
            <Card>
              <SectionLabel>Your details</SectionLabel>
              <View style={{ gap: 12, marginTop: 10 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {(["bvn", "nin"] as const).map((t) => (
                    <Pressable
                      key={t}
                      onPress={() => setIdentityType(t)}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 12,
                        alignItems: "center",
                        backgroundColor: identityType === t ? colors.brand : colors.panelElevated,
                      }}
                    >
                      <Text style={{ color: identityType === t ? colors.inkOnBrand : colors.text, fontWeight: "800" }}>{t.toUpperCase()}</Text>
                    </Pressable>
                  ))}
                </View>
                <Field placeholder={`${identityType.toUpperCase()} (11 digits)`} value={bvnOrNin} onChangeText={setBvnOrNin} keyboardType="number-pad" maxLength={11} />
                <Field placeholder="Date of birth (YYYY-MM-DD)" value={dob} onChangeText={setDob} />
                <Field placeholder="Residential address" value={residentialAddress} onChangeText={setResidentialAddress} />
                <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
                  Your BVN/NIN is not verified. We keep only the last 4 digits.
                </Text>
              </View>
            </Card>

            <Card>
              <SectionLabel>Payout bank account</SectionLabel>
              <View style={{ gap: 12, marginTop: 10 }}>
                <Field placeholder="Account number (10 digits)" value={accountNumber} onChangeText={setAccountNumber} keyboardType="number-pad" maxLength={10} />
                <Field
                  placeholder={banks.length ? "Search for your bank" : "Loading banks..."}
                  value={bankQuery}
                  onChangeText={(v) => {
                    setBankQuery(v);
                    if (selectedBank && v !== selectedBank.name) setSelectedBank(null);
                  }}
                />
                {bankMatches.map((b) => (
                  <Pressable
                    key={`${b.code}-${b.name}`}
                    onPress={() => {
                      setSelectedBank(b);
                      setBankQuery(b.name);
                    }}
                    style={({ pressed }) => ({
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      backgroundColor: pressed ? colors.panelElevated : "transparent",
                    })}
                  >
                    <Text style={{ color: colors.text }}>{b.name}</Text>
                  </Pressable>
                ))}
                {selectedBank ? <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "700" }}>Selected: {selectedBank.name}</Text> : null}
                <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
                  We check the account name with your bank before saving.
                </Text>
              </View>
            </Card>

            <PrimaryButton label={submitting ? "Checking bank account..." : "Submit details"} onPress={onSubmit} loading={submitting} tone="accent" />
            {detailsSubmitted ? <PrimaryButton label="Cancel" onPress={() => setEditing(false)} tone="ghost" /> : null}
          </>
        ) : (
          <PrimaryButton label="Update details" onPress={() => setEditing(true)} tone="ghost" />
        )}

        <ErrorText message={error} />
        {message ? (
          <Card>
            <Text style={{ color: colors.text, fontWeight: "700" }}>{message}</Text>
          </Card>
        ) : null}

        <PrimaryButton label="Log Out" onPress={() => void logout()} tone="ghost" />
      </ScrollView>
    </Screen>
  );
}
