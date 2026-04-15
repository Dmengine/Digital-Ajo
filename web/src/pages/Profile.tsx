import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
import {
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

  const kycVerified = meData?.user?.basicKycCompleted ?? user?.basicKycCompleted ?? false;
  const kycTier = meData?.user?.kycTier ?? user?.kycTier ?? 1;
  const profileImage = meData?.user?.profileImage ?? user?.profileImage ?? null;

  const kycSchema = z.object({
    bvnOrNin: z.string().trim().min(8).max(20),
    dob: z.string().min(1),
    residentialAddress: z.string().trim().min(5).max(500),
    accountNumber: z.string().trim().min(4).max(20),
    bankName: z.string().trim().min(2).max(120),
    accountName: z.string().trim().min(2).max(120),
  });

  type KycValues = z.infer<typeof kycSchema>;

  const form = useForm<KycValues>({
    resolver: zodResolver(kycSchema),
    defaultValues: {
      bvnOrNin: "",
      dob: "",
      residentialAddress: "",
      accountNumber: "",
      bankName: "",
      accountName: "",
    },
    mode: "onChange",
  });

  const kycMut = useMutation({
    mutationFn: (values: KycValues) => submitTier1Kyc(values),
    onSuccess: async () => {
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
                (kycVerified
                  ? "bg-[#40e56c]/20 text-[#40e56c] border border-[#40e56c]/40"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/40")
              }
            >
              Basic KYC: {kycVerified ? `Tier ${kycTier}` : "Required"}
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
              <div className="text-sm font-bold text-[#e1e2e7] uppercase tracking-wide">KYC & Trust</div>
              <div className="mt-3 text-sm text-[#968da0]">
                Tier 1 KYC is required for group participation and risk controls.
              </div>

              {!kycVerified ? (
                <form
                  className="mt-4 space-y-3"
                  onSubmit={form.handleSubmit((values) => kycMut.mutate(values))}
                >
                  {(
                    [
                      ["bvnOrNin", "BVN/NIN", "text"],
                      ["dob", "Date of Birth", "date"],
                      ["residentialAddress", "Residential Address", "text"],
                      ["accountNumber", "Bank Account Number", "text"],
                      ["bankName", "Bank Name", "text"],
                      ["accountName", "Bank Account Name", "text"],
                    ] as const
                  ).map(([key, label, type]) => (
                    <div key={key} className="space-y-2">
                      <label className="text-xs font-bold text-[#968da0] uppercase tracking-wide">{label}</label>
                      <input
                        type={type}
                        className="w-full rounded-lg border border-[#4b4454]/30 bg-[#323538] px-4 py-2 text-[#e1e2e7] placeholder:text-[#968da0] outline-none focus:ring-2 focus:ring-[#d6baff]/40 transition-all"
                        {...form.register(key)}
                      />
                      {form.formState.errors[key] ? (
                        <div className="text-xs text-[#ffb4ab] font-bold">{form.formState.errors[key]?.message as any}</div>
                      ) : null}
                    </div>
                  ))}

                  {kycMut.isError ? (
                    <div className="rounded-lg border border-[#ffb4ab]/20 bg-[#ffb4ab]/10 px-4 py-3 text-sm text-[#ffb4ab] font-bold">
                      {getAxiosErrorMessage(kycMut.error)}
                    </div>
                  ) : null}

                  <button
                    disabled={kycMut.isPending}
                    className="w-full rounded-lg bg-linear-to-br from-[#d6baff] to-[#ab73ff] px-6 py-3 text-sm font-bold text-[#111417] uppercase tracking-wide hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 shadow-[0_8px_24px_rgba(214,186,255,0.25)]"
                    type="submit"
                  >
                    {kycMut.isPending ? "Submitting..." : "Submit Tier 1 KYC"}
                  </button>
                </form>
              ) : (
                <div className="mt-4">
                  <Link
                    to="/groups/create"
                    className="inline-flex items-center rounded-lg bg-[#40e56c] px-6 py-2 text-sm font-bold text-[#003912] uppercase tracking-wide hover:opacity-90 transition-all"
                  >
                    Create a Group Now
                  </Link>
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

