import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
import {
  listBanks,
  me as fetchMe,
  submitTier1Kyc,
  uploadAvatar,
} from "../api/auth.api";
import { getAxiosErrorMessage } from "../utils/apiErrors";
import { Link } from "react-router-dom";

function initials(name?: string | null) {
  if (!name) return "DA";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "D";
  const b = parts[1]?.[0] ?? "A";
  return (a + b).toUpperCase();
}

export default function Profile() {
  const { token, user, setAuth } = useAuthStore();
  const [name] = useState(user?.name ?? "");

  const avatarText = useMemo(() => initials(name), [name]);

  const { data: meData, refetch } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchMe,
    enabled: !!token,
  });

  useEffect(() => {
    if (meData?.user && token) setAuth(token, meData.user as any);
  }, [meData, token, setAuth]);

  const detailsSubmitted = meData?.user?.basicKycCompleted ?? user?.basicKycCompleted ?? false;
  const bankAccount = meData?.user?.bankAccount ?? null;
  const identity = meData?.user?.identity ?? null;
  const [editingDetails, setEditingDetails] = useState(false);
  const showKycForm = !detailsSubmitted || editingDetails;

  const { data: banksData, isLoading: banksLoading, isError: banksError } = useQuery({
    queryKey: ["auth", "banks"],
    queryFn: listBanks,
    enabled: !!token && showKycForm,
    staleTime: 60 * 60 * 1000,
  });
  const banks = banksData?.banks ?? [];
  const kycTier = meData?.user?.kycTier ?? user?.kycTier ?? 1;
  const profileImage = meData?.user?.profileImage ?? user?.profileImage ?? null;

  const kycSchema = z.object({
    identityType: z.enum(["bvn", "nin"]),
    bvnOrNin: z.string().trim().regex(/^\d{11}$/, "Must be 11 digits"),
    dob: z.string().min(1, "Required"),
    residentialAddress: z.string().trim().min(5).max(500),
    accountNumber: z.string().trim().regex(/^\d{10}$/, "Account number must be 10 digits"),
    bankCode: z.string().trim().min(3, "Select your bank"),
  });

  type KycValues = z.infer<typeof kycSchema>;

  const form = useForm<KycValues>({
    resolver: zodResolver(kycSchema),
    defaultValues: {
      identityType: "bvn",
      bvnOrNin: "",
      dob: "",
      residentialAddress: "",
      accountNumber: "",
      bankCode: "",
    },
    mode: "onChange",
  });

  const kycMut = useMutation({
    mutationFn: (values: KycValues) =>
      submitTier1Kyc({
        ...values,
        bankName: banks.find((b) => b.code === values.bankCode)?.name ?? values.bankCode,
      }),
    onSuccess: async () => {
      setEditingDetails(false);
      form.reset();
      await refetch();
    },
  });

  const avatarMut = useMutation({
    mutationFn: (imageDataUrl: string) => uploadAvatar(imageDataUrl),
    onSuccess: async () => {
      await refetch();
    },
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(profileImage ?? null);

  useEffect(() => {
    setAvatarPreview(profileImage ?? null);
  }, [profileImage]);

  const onPickAvatar = async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });
    setAvatarPreview(dataUrl);
    await avatarMut.mutateAsync(dataUrl);
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <div className="absolute -inset-1 bg-linear-to-r from-[#d6baff]/20 to-[#40e56c]/10 blur-2xl opacity-50 pointer-events-none"></div>
        <div className="relative rounded-lg border border-[#4b4454]/30 bg-[#1d2023] p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="avatar"
                  className="h-16 w-16 rounded-full object-cover border-2 border-[#d6baff]"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#d6baff]/20 text-sm font-bold text-[#d6baff] border-2 border-[#d6baff]">
                  {avatarText}
                </div>
              )}
              <div>
                <div className="text-xs uppercase tracking-wider text-[#968da0] font-bold">Member</div>
                <div className="font-headline text-2xl font-bold text-[#e1e2e7] mt-1">{user?.name ?? "—"}</div>
                <div className="mt-1 text-sm text-[#968da0]">@{user?.username ?? "username"}</div>
              </div>
            </div>

            <div
              className={
                "rounded-lg px-4 py-3 text-sm font-bold uppercase tracking-wide " +
                (detailsSubmitted
                  ? "bg-[#40e56c]/20 text-[#40e56c] border border-[#40e56c]/40"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/40")
              }
            >
              Basic KYC: {detailsSubmitted ? `Tier ${kycTier} · details submitted` : "Required"}
            </div>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-[#4b4454]/30 bg-[#323538]/30 p-4">
              <div className="text-sm font-bold text-[#e1e2e7] uppercase tracking-wide">Account Details</div>
              <div className="mt-3 space-y-2 text-sm text-[#cdc2d7]">
                <div>
                  <span className="font-bold text-[#e1e2e7]">Email:</span>
                  <span className="ml-2">{user?.email}</span>
                </div>
                <div>
                  <span className="font-bold text-[#e1e2e7]">Username:</span>
                  <span className="ml-2">{user?.username}</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[#4b4454]/30 bg-[#323538]/30 p-4">
              <div className="text-sm font-bold text-[#e1e2e7] uppercase tracking-wide">Details & payout account</div>
              <div className="mt-3 text-sm text-[#968da0]">
                Needed to create or join groups. When it's your turn, other members pay directly into this bank
                account. ContriPay never receives or holds the money.
              </div>

              {detailsSubmitted ? (
                <div className="mt-4 space-y-2 text-sm text-[#cdc2d7]">
                  <div>
                    <span className="font-bold text-[#e1e2e7]">{identity?.type ? identity.type.toUpperCase() : "BVN/NIN"}:</span>
                    <span className="ml-2">
                      {identity?.last4 ? `•••••••${identity.last4}` : "—"} · details submitted (not verified)
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-[#e1e2e7]">Payout account:</span>
                    <span className="ml-2">
                      {bankAccount
                        ? `${bankAccount.accountName ?? "—"} · ${bankAccount.bankName ?? ""} · ${bankAccount.accountNumber}`
                        : "Not added"}
                    </span>
                  </div>
                  {bankAccount?.confirmed ? (
                    <div className="inline-flex rounded-full bg-[#40e56c]/15 px-3 py-1 text-xs font-bold text-[#40e56c]">
                      Bank account confirmed
                    </div>
                  ) : (
                    <div className="inline-flex rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300">
                      Bank account not confirmed. Update your details.
                    </div>
                  )}
                </div>
              ) : null}

              {showKycForm ? (
                <form
                  className="mt-4 space-y-3"
                  onSubmit={form.handleSubmit((values) => kycMut.mutate(values))}
                >
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#968da0] uppercase tracking-wide">ID type</label>
                    <select
                      className="w-full rounded-lg border border-[#4b4454]/30 bg-[#323538] px-4 py-2 text-[#e1e2e7] outline-none focus:ring-2 focus:ring-[#d6baff]/40"
                      {...form.register("identityType")}
                    >
                      <option value="bvn">BVN</option>
                      <option value="nin">NIN</option>
                    </select>
                  </div>
                  {(
                    [
                      ["bvnOrNin", "BVN/NIN (11 digits)", "text"],
                      ["dob", "Date of Birth", "date"],
                      ["residentialAddress", "Residential Address", "text"],
                      ["accountNumber", "Bank Account Number (10 digits)", "text"],
                    ] as const
                  ).map(([key, label, type]) => (
                    <div key={key} className="space-y-2">
                      <label className="text-xs font-bold text-[#968da0] uppercase tracking-wide">{label}</label>
                      <input
                        type={type}
                        inputMode={key === "bvnOrNin" || key === "accountNumber" ? "numeric" : undefined}
                        className="w-full rounded-lg border border-[#4b4454]/30 bg-[#323538] px-4 py-2 text-[#e1e2e7] placeholder:text-[#968da0] outline-none focus:ring-2 focus:ring-[#d6baff]/40 transition-all"
                        {...form.register(key)}
                      />
                      {form.formState.errors[key] ? (
                        <div className="text-xs text-[#ffb4ab] font-bold">{form.formState.errors[key]?.message as any}</div>
                      ) : null}
                    </div>
                  ))}

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#968da0] uppercase tracking-wide">Bank</label>
                    <select
                      className="w-full rounded-lg border border-[#4b4454]/30 bg-[#323538] px-4 py-2 text-[#e1e2e7] outline-none focus:ring-2 focus:ring-[#d6baff]/40"
                      disabled={banksLoading}
                      {...form.register("bankCode")}
                    >
                      <option value="">{banksLoading ? "Loading banks..." : "Select your bank"}</option>
                      {banks.map((b) => (
                        <option key={`${b.code}-${b.name}`} value={b.code}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                    {banksError ? (
                      <div className="text-xs text-[#ffb4ab] font-bold">Couldn't load the bank list. Refresh to try again.</div>
                    ) : null}
                    {form.formState.errors.bankCode ? (
                      <div className="text-xs text-[#ffb4ab] font-bold">{form.formState.errors.bankCode.message}</div>
                    ) : null}
                  </div>

                  <div className="text-xs text-[#968da0]">
                    We check the account name with your bank. Your BVN/NIN is not verified; we keep only its last 4
                    digits.
                  </div>

                  {kycMut.isError ? (
                    <div className="rounded-lg border border-[#ffb4ab]/20 bg-[#ffb4ab]/10 px-4 py-3 text-sm text-[#ffb4ab] font-bold">
                      {getAxiosErrorMessage(kycMut.error)}
                    </div>
                  ) : null}

                  <div className="flex gap-3">
                    <button
                      disabled={kycMut.isPending}
                      className="flex-1 rounded-lg bg-linear-to-br from-[#d6baff] to-[#ab73ff] px-6 py-3 text-sm font-bold text-[#111417] uppercase tracking-wide hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 shadow-[0_8px_24px_rgba(214,186,255,0.25)]"
                      type="submit"
                    >
                      {kycMut.isPending ? "Checking bank account..." : "Submit details"}
                    </button>
                    {editingDetails ? (
                      <button
                        type="button"
                        onClick={() => setEditingDetails(false)}
                        className="rounded-lg border border-[#4b4454]/40 px-4 py-3 text-sm font-bold text-[#cdc2d7]"
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </form>
              ) : (
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    to="/groups/create"
                    className="inline-flex items-center rounded-lg bg-[#40e56c] px-6 py-2 text-sm font-bold text-[#003912] uppercase tracking-wide hover:opacity-90 transition-all"
                  >
                    Create a Group Now
                  </Link>
                  <button
                    type="button"
                    onClick={() => setEditingDetails(true)}
                    className="rounded-lg border border-[#4b4454]/40 px-4 py-2 text-sm font-bold text-[#cdc2d7] hover:bg-[#4b4454]/20"
                  >
                    Update details
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 rounded-lg border border-[#4b4454]/30 bg-[#323538]/30 p-6">
            <div className="text-sm font-bold text-[#e1e2e7] uppercase tracking-wide">Upload Profile Image</div>
            <div className="mt-2 text-sm text-[#968da0]">
              MVP: stored as a data URL in MongoDB. Keep it small.
            </div>

            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-[#968da0] font-bold uppercase tracking-wide">
                {avatarMut.isPending ? "Updating..." : "Choose an image (PNG/JPG/WebP)."}
              </div>

              <div className="flex items-center gap-4">
                <input
                  id="avatarUpload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onPickAvatar(file);
                  }}
                />

                <label
                  htmlFor="avatarUpload"
                  className="cursor-pointer select-none rounded-lg bg-linear-to-br from-[#d6baff] to-[#ab73ff] px-6 py-2 text-sm font-bold text-[#111417] uppercase tracking-wide shadow-[0_8px_24px_rgba(214,186,255,0.25)] hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  {avatarMut.isPending ? "Uploading..." : "Upload Image"}
                </label>

                {avatarPreview ? (
                  <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-[#d6baff] shadow-md">
                    <img src={avatarPreview} alt="preview" className="h-full w-full object-cover" />
                  </div>
                ) : null}
              </div>
            </div>

            {avatarMut.isError ? (
              <div className="mt-4 rounded-lg border border-[#ffb4ab]/20 bg-[#ffb4ab]/10 px-4 py-3 text-sm text-[#ffb4ab] font-bold">
                {getAxiosErrorMessage(avatarMut.error)}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

