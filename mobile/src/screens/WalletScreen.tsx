import { useCallback, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Linking, ScrollView, Text, View } from "react-native";
import { initDeposit, verifyDeposit, withdraw } from "../api/wallet.api";
import { extractApiMessage } from "../api/client";
import { Card, ErrorText, Eyebrow, Field, PrimaryButton, Screen, SectionLabel, Subtitle, Title } from "../components/Ui";
import { useAuth } from "../store/AuthContext";
import { colors } from "../theme/colors";

function makeIdempotencyKey() {
  return `wd-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const pendingDepositKey = "contripay.pendingDepositReference";

export function WalletScreen() {
  const { refreshProfile } = useAuth();
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const parsedAmount = Number(amount);

  const verifyReference = async (nextReference: string) => {
    const trimmed = nextReference.trim();
    if (!trimmed) return;

    const data = await verifyDeposit(trimmed);
    setStatus(data.message);
    if (data.settled) {
      await AsyncStorage.removeItem(pendingDepositKey);
      await refreshProfile();
    }
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const syncPendingDeposit = async () => {
        const pendingReference = await AsyncStorage.getItem(pendingDepositKey);
        if (!active || !pendingReference?.trim()) return;
        setReference(pendingReference);
        try {
          await verifyReference(pendingReference);
        } catch {
          // Keep the pending reference so the user can retry after the app returns.
        }
      };

      void syncPendingDeposit();

      return () => {
        active = false;
      };
    }, [refreshProfile])
  );

  const onInitDeposit = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await initDeposit(parsedAmount);
      setReference(data.reference);
      await AsyncStorage.setItem(pendingDepositKey, data.reference);
      setStatus("Deposit initialized. Opening Paystack checkout link.");
      await Linking.openURL(data.paymentURL);
    } catch (e) {
      setError(extractApiMessage(e));
    } finally {
      setLoading(false);
    }
  }; 

  const onVerifyDeposit = async () => {
    setLoading(true);
    setError(null);
    try {
      await verifyReference(reference);
    } catch (e) {
      setError(extractApiMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const onWithdraw = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await withdraw(parsedAmount, makeIdempotencyKey());
      setStatus(data.message);
    } catch (e) {
      setError(extractApiMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 10 }}>
        <View style={{ gap: 8 }}>
          <Eyebrow>Wallet studio</Eyebrow>
          <Title>Move money with precision.</Title>
          <Subtitle>Make deposits, verify payments, and withdraw to your bank account from a cleaner, faster mobile flow.</Subtitle>
        </View>

        <Card>
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(124,92,255,0.14)" }}>
                <Text style={{ color: colors.brandSoft, fontWeight: "800", fontSize: 12 }}>Paystack</Text>
              </View>
              <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(39,211,162,0.14)" }}>
                <Text style={{ color: colors.accent, fontWeight: "800", fontSize: 12 }}>Idempotent</Text>
              </View>
            </View>

            <View style={{ gap: 12 }}>
              <Field placeholder="Amount" keyboardType="numeric" value={amount} onChangeText={setAmount} />
              <PrimaryButton label="Deposit with Paystack" onPress={onInitDeposit} loading={loading} />
            </View>
          </View>
        </Card>

        <Card>
          <SectionLabel>Verify deposit</SectionLabel>
          <View style={{ gap: 12, marginTop: 10 }}>
            <Field placeholder="Deposit reference" value={reference} onChangeText={setReference} autoCapitalize="none" />
            <PrimaryButton label="Verify deposit" onPress={onVerifyDeposit} loading={loading} tone="accent" />
          </View>
        </Card>

        <Card>
          <SectionLabel>Withdraw</SectionLabel>
          <Text style={{ color: colors.muted, marginTop: 4 }}>Funds are reversed automatically if transfer fails.</Text>
          <PrimaryButton label="Withdraw to bank" onPress={onWithdraw} loading={loading} tone="ghost" />
        </Card>

        <ErrorText message={error} />
        {status ? (
          <Card>
            <Text style={{ color: colors.text, fontWeight: "700" }}>{status}</Text>
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
