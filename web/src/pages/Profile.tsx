import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
import { me as fetchMe, submitTier1Kyc, uploadAvatar } from "../api/auth.api";
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
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/10 bg-white/70 p-6 shadow-sm dark:bg-slate-900/40">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {avatarPreview ? (
              // eslint-disable-next-line @typescript-eslint/no-misused-promises
              <img
                src={avatarPreview}
                alt="avatar"
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/10 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                {avatarText}
              </div>
            )}
            <div>
              <div className="text-sm text-slate-600 dark:text-slate-300">Member</div>
              <div className="text-2xl font-semibold text-slate-950 dark:text-white">{user?.name ?? "—"}</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">@{user?.username ?? "username"}</div>
            </div>
          </div>

          <div
            className={
              "rounded-2xl px-4 py-3 text-sm font-semibold " +
              (kycVerified
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-300")
            }
          >
            Basic KYC: {kycVerified ? `Tier ${kycTier}` : "Required"}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/60 p-4 dark:bg-slate-950/30">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Account details</div>
            <div className="mt-2 space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <div>
                <span className="font-medium">Email: </span>
                {user?.email}
              </div>
              <div>
                <span className="font-medium">Username: </span>
                {user?.username}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/60 p-4 dark:bg-slate-950/30">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">KYC & Trust</div>
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              MVP: complete Tier 1 KYC before using Ajo groups.
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
                  ] as const
                ).map(([key, label, type]) => (
                  <div key={key} className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-200">{label}</label>
                    <input
                      type={type}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      {...form.register(key)}
                    />
                    {form.formState.errors[key] ? (
                      <div className="text-xs text-rose-600">{form.formState.errors[key]?.message as any}</div>
                    ) : null}
                  </div>
                ))}

                {kycMut.isError ? (
                  <div className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
                    {getAxiosErrorMessage(kycMut.error)}
                  </div>
                ) : null}

                <button
                  disabled={kycMut.isPending}
                  className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                  type="submit"
                >
                  {kycMut.isPending ? "Submitting..." : "Submit Tier 1 KYC"}
                </button>
              </form>
            ) : (
              <div className="mt-4">
                <Link
                  to="/groups/create"
                  className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                >
                  Create a group now
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/60 p-4 shadow-sm dark:bg-slate-950/30">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">Upload Profile Image</div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">MVP: stored as a data URL in MongoDB.</div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {avatarMut.isPending ? "Updating..." : "Choose an image (PNG/JPG/WebP)."}
            </div>
            <input
              type="file"
              accept="image/*"
              className="w-full text-sm text-slate-700 dark:text-slate-200 sm:w-auto"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onPickAvatar(file);
              }}
            />
          </div>

          {avatarMut.isError ? (
            <div className="mt-3 rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
              {getAxiosErrorMessage(avatarMut.error)}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

