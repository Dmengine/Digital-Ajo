import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createGroup, type CreateGroupBody, type GroupType } from "../api/groups.api";
import { me as fetchMe } from "../api/auth.api";
import { useAuthStore } from "../store/authStore";
import { getAxiosErrorMessage } from "../utils/apiErrors";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  groupType: z.enum(["low", "medium"] as const),
  contributionAmount: z.number().positive().max(10_000_000),
  frequency: z.enum(["daily", "weekly", "monthly"] as const),
  startDate: z.string().min(1),
  membersCsv: z.string().trim().optional(),
});

type Values = z.infer<typeof schema>;

function parseMembers(membersCsv?: string): string[] {
  const raw = (membersCsv ?? "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export default function CreateGroup() {
  const navigate = useNavigate();
  const { token, user } = useAuthStore();

  const { data: meData, isFetching } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchMe,
    enabled: !!token,
  });

  const basicKycCompleted = meData?.user?.basicKycCompleted ?? user?.basicKycCompleted ?? false;
  const isCheckingKyc = isFetching && !meData;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      groupType: "low",
      contributionAmount: 5000,
      frequency: "daily",
      startDate: new Date().toISOString().slice(0, 10),
      membersCsv: "",
    },
    mode: "onChange",
  });

  const [inviteToast, setInviteToast] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: (values: Values) => {
      const members = parseMembers(values.membersCsv);
      const body: CreateGroupBody = {
        name: values.name,
        description: values.description || undefined,
        groupType: values.groupType as GroupType,
        contributionAmount: values.contributionAmount,
        frequency: values.frequency,
        startDate: new Date(values.startDate).toISOString(),
        members,
      };
      return createGroup(body);
    },
    onSuccess: async (res) => {
      const group = res.group;
      if (group?._id && group?.inviteCode) {
        setInviteToast(`Invite code: ${group.inviteCode}`);
        navigate(`/groups/${group._id}`);
      } else {
        navigate("/groups/browse");
      }
    },
  });

  const disabled = isCheckingKyc || !basicKycCompleted || mut.isPending;
  const groupTypeOptions: Array<Values["groupType"]> = ["low", "medium"];

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/10 bg-linear-to-br from-indigo-500/15 via-emerald-500/10 to-amber-500/10 p-6 shadow-sm dark:bg-slate-900/40">
        <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">Create Group</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          MVP: invite-only joining. You can create and share your invite code.
        </p>
        {isCheckingKyc ? (
          <div className="mt-3 rounded-xl bg-slate-500/10 p-3 text-sm text-slate-600 dark:text-slate-300">
            Checking your KYC status...
          </div>
        ) : !basicKycCompleted ? (
          <div className="mt-3 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300">
            Complete Tier 1 KYC first to create groups.
          </div>
        ) : null}
      </div>

      {inviteToast ? (
        <div className="rounded-2xl border border-white/10 bg-white/70 p-4 text-sm text-slate-700 shadow-sm dark:bg-slate-900/40">
          {inviteToast}
        </div>
      ) : null}

      <form
        className="rounded-2xl border border-white/10 bg-white/70 p-5 shadow-sm dark:bg-slate-900/40"
        onSubmit={form.handleSubmit((v) => mut.mutate(v))}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Group name</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              {...form.register("name")}
            />
            {form.formState.errors.name ? (
              <div className="text-xs text-rose-600">{form.formState.errors.name.message}</div>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Group type</label>
            <div className="flex flex-wrap gap-2">
              {groupTypeOptions.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => form.setValue("groupType", t, { shouldValidate: true })}
                  className={[
                    "rounded-xl border px-4 py-2 text-sm font-semibold transition",
                    form.watch("groupType") === t
                      ? "border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                      : "border-white/10 bg-white/60 text-slate-700 hover:bg-white/80 dark:bg-slate-900/30 dark:text-slate-200",
                  ].join(" ")}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Contribution amount (₦)</label>
            <input
              type="number"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              {...form.register("contributionAmount", { valueAsNumber: true })}
            />
            {form.formState.errors.contributionAmount ? (
              <div className="text-xs text-rose-600">{form.formState.errors.contributionAmount.message}</div>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Frequency</label>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              {...form.register("frequency")}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Start date</label>
            <input
              type="date"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              {...form.register("startDate")}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Members (optional)</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              placeholder="comma-separated usernames e.g. ayo_1, ayo_2"
              {...form.register("membersCsv")}
            />
            <div className="text-xs text-slate-500 dark:text-slate-400">
              MVP: you can also add members later using your invite code.
            </div>
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Description (optional)</label>
            <textarea
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              {...form.register("description")}
            />
          </div>
        </div>

        {mut.isError ? (
          <div className="mt-4 rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
            {getAxiosErrorMessage(mut.error)}
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="submit"
            disabled={disabled}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {mut.isPending ? "Creating..." : "Create group"}
          </button>
        </div>
      </form>
    </div>
  );
}

