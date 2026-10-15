import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import {
  confirmRoundPayment,
  getCurrentRound,
  markRoundSent,
  unconfirmRoundPayment,
  type ContributionStatus,
  type CurrentRoundResponse,
} from "../api/groups.api";
import { extractApiMessage } from "../api/client";
import { Card, ErrorText, Field, NON_CUSTODIAL_NOTICE, PrimaryButton, SectionLabel } from "./Ui";
import { colors } from "../theme/colors";

const STATUS_LABEL: Record<ContributionStatus, string> = {
  pending: "Not paid yet",
  marked_paid: "Awaiting admin confirmation",
  confirmed: "Confirmed by admin",
  unpaid: "Unpaid",
  defaulted: "Defaulted",
};

const STATUS_COLOR: Record<ContributionStatus, string> = {
  pending: colors.muted,
  marked_paid: colors.brand,
  confirmed: colors.accent,
  unpaid: colors.warning,
  defaulted: colors.danger,
};

export function StatusBadge({ status }: { status: ContributionStatus }) {
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.06)" }}>
      <Text style={{ color: STATUS_COLOR[status], fontSize: 10, fontWeight: "800", textTransform: "uppercase" }}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

const fmtMoney = (n: number) => `₦${Number(n || 0).toLocaleString()}`;
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : "—");

export function ThisRound({ groupId, onChanged }: { groupId: string; onChanged?: () => void }) {
  const [data, setData] = useState<CurrentRoundResponse | null>(null);
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await getCurrentRound(groupId));
    } catch (e) {
      setError(extractApiMessage(e));
    }
  }, [groupId]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (key: string, action: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await action();
      await load();
      onChanged?.();
    } catch (e) {
      setError(extractApiMessage(e));
    } finally {
      setBusy(null);
    }
  };

  if (!data) {
    return (
      <Card>
        <SectionLabel>This round</SectionLabel>
        <Text style={{ color: colors.muted, marginTop: 8 }}>{error ?? "Loading this round..."}</Text>
      </Card>
    );
  }

  const round = data.round;
  if (!round) {
    const message =
      data.groupStatus === "open"
        ? `Round 1 opens on ${fmtDate(data.membershipLocksAt)}. New members can join until then.`
        : data.groupStatus === "completed"
          ? "This group is complete. Every member has received their turn."
          : data.groupStatus === "cancelled"
            ? "This group was cancelled."
            : "No round is in progress.";
    return (
      <Card>
        <SectionLabel>This round</SectionLabel>
        <Text style={{ color: colors.muted, marginTop: 8, lineHeight: 20 }}>{message}</Text>
      </Card>
    );
  }

  const bank = round.recipient.bankAccount;
  const my = round.myPayment;
  const canMarkSent = my && (my.status === "pending" || my.status === "unpaid" || my.status === "defaulted");

  return (
    <Card>
      <SectionLabel>
        This round · {round.number} of {data.totalRounds}
      </SectionLabel>
      <View style={{ gap: 12, marginTop: 10 }}>
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>{NON_CUSTODIAL_NOTICE}</Text>

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: "900" }}>{fmtMoney(round.amount)}</Text>
          <Text style={{ color: colors.muted, fontSize: 12, alignSelf: "flex-end" }}>due {fmtDate(round.dueAt)}</Text>
        </View>
        <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>
          {round.progress.confirmed} of {round.progress.total} confirmed by admin
        </Text>

        {round.status === "paused" ? (
          <Text style={{ color: colors.warning, fontSize: 12, lineHeight: 18 }}>
            The due date has passed and the admin hasn't confirmed every payment yet.
            {round.graceEndsAt ? ` Grace period ends ${fmtDate(round.graceEndsAt)}.` : ""}
          </Text>
        ) : null}

        <View style={{ borderRadius: 14, backgroundColor: colors.panelElevated, padding: 12, gap: 6 }}>
          <Text style={{ color: colors.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Receiving this round</Text>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "900" }}>
            {round.isRecipient ? "You" : round.recipient.name ?? "Member"}
          </Text>
          {bank ? (
            <>
              <Text style={{ color: colors.muted }}>{bank.bankName ?? "—"}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900", letterSpacing: 1 }}>{bank.accountNumber}</Text>
                <Pressable
                  onPress={async () => {
                    await Clipboard.setStringAsync(bank.accountNumber);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  style={({ pressed }) => ({
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 999,
                    backgroundColor: "rgba(214,186,255,0.15)",
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ color: colors.brand, fontWeight: "800", fontSize: 12 }}>{copied ? "Copied" : "Copy"}</Text>
                </Pressable>
              </View>
              <Text style={{ color: colors.muted }}>{bank.accountName ?? "—"}</Text>
              <Text style={{ color: bank.confirmed ? colors.accent : colors.warning, fontSize: 12, fontWeight: "700" }}>
                {bank.confirmed ? "Bank account confirmed" : "Bank account not confirmed. Double-check with the recipient."}
              </Text>
            </>
          ) : (
            <Text style={{ color: colors.warning, fontSize: 12 }}>
              {round.isRecipient
                ? "Add your payout bank account in Profile so members can pay you."
                : "The recipient hasn't added a bank account yet. Ask them in the group chat."}
            </Text>
          )}
        </View>

        {my ? (
          <View style={{ borderRadius: 14, backgroundColor: colors.panelElevated, padding: 12, gap: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: colors.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Your payment</Text>
              <StatusBadge status={my.status} />
            </View>
            {my.payerReference ? <Text style={{ color: colors.muted, fontSize: 12 }}>Reference: {my.payerReference}</Text> : null}
            {my.status === "marked_paid" ? (
              <Text style={{ color: colors.text, fontSize: 12, lineHeight: 18 }}>
                The admin has been notified. It counts as paid only once the admin confirms it.
              </Text>
            ) : null}
            {my.unconfirmedAt && my.status === "unpaid" ? (
              <Text style={{ color: colors.warning, fontSize: 12 }}>
                The admin removed the confirmation of your payment. Contact the admin if you have already paid.
              </Text>
            ) : null}
            {canMarkSent ? (
              <>
                <Text style={{ color: colors.text, fontSize: 13, lineHeight: 19 }}>
                  Send {fmtMoney(round.amount)} from your bank app to the account above, then let the admin know.
                </Text>
                <Field placeholder="Transfer reference (optional)" value={reference} onChangeText={setReference} maxLength={120} />
                <PrimaryButton
                  label="I've sent my payment"
                  tone="accent"
                  loading={busy === "sent"}
                  onPress={() =>
                    void run("sent", async () => {
                      await markRoundSent(groupId, reference);
                      setReference("");
                    })
                  }
                />
              </>
            ) : null}
          </View>
        ) : null}

        {data.isAdmin ? (
          <>
            <Text style={{ color: colors.text, fontWeight: "800", marginTop: 4 }}>Admin checklist</Text>
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
              Only you can mark a contribution as paid. Check the money reached the recipient before confirming.
            </Text>
            {round.payments.map((p) => (
              <View key={p.userId} style={{ borderRadius: 14, backgroundColor: colors.panelElevated, padding: 12, gap: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: "800" }}>{p.name ?? "Member"}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      @{p.username ?? "—"}
                      {p.markedPaidAt ? ` · says sent ${fmtDate(p.markedPaidAt)}` : ""}
                      {p.payerReference ? ` · ref ${p.payerReference}` : ""}
                    </Text>
                  </View>
                  <StatusBadge status={p.status} />
                </View>
                {p.status === "confirmed" ? (
                  <Pressable
                    disabled={busy !== null}
                    onPress={() =>
                      Alert.alert("Undo confirmation", `Undo the confirmation for ${p.name ?? "this member"}? It goes back to unpaid and they'll be notified.`, [
                        { text: "Cancel", style: "cancel" },
                        { text: "Undo", style: "destructive", onPress: () => void run(`undo-${p.userId}`, () => unconfirmRoundPayment(groupId, p.userId)) },
                      ])
                    }
                    style={({ pressed }) => ({
                      paddingVertical: 10,
                      borderRadius: 12,
                      alignItems: "center",
                      backgroundColor: "rgba(255,180,171,0.16)",
                      opacity: pressed || busy !== null ? 0.6 : 1,
                    })}
                  >
                    <Text style={{ color: colors.danger, fontWeight: "800", fontSize: 12 }}>Undo</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    disabled={busy !== null}
                    onPress={() =>
                      Alert.alert("Confirm paid", `Confirm ${p.name ?? "this member"} paid ${fmtMoney(round.amount)} to the recipient?`, [
                        { text: "Cancel", style: "cancel" },
                        { text: "Confirm", onPress: () => void run(`confirm-${p.userId}`, () => confirmRoundPayment(groupId, p.userId)) },
                      ])
                    }
                    style={({ pressed }) => ({
                      paddingVertical: 10,
                      borderRadius: 12,
                      alignItems: "center",
                      backgroundColor: "rgba(64,229,108,0.18)",
                      opacity: pressed || busy !== null ? 0.6 : 1,
                    })}
                  >
                    <Text style={{ color: colors.accent, fontWeight: "800", fontSize: 12 }}>Confirm paid</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </>
        ) : null}

        <ErrorText message={error} />
      </View>
    </Card>
  );
}
