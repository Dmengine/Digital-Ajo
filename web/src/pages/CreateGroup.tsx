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
    <div className="space-y-6">
      <div className="relative">
        <div className="absolute -inset-1 bg-linear-to-r from-[#d6baff]/20 to-[#40e56c]/10 blur-2xl opacity-50 pointer-events-none"></div>
        <div className="relative rounded-lg border border-[#4b4454]/30 bg-[#1d2023] p-6">
          <h1 className="font-headline text-3xl font-extrabold text-[#d6baff] tracking-tight">Create Group</h1>
          <p className="mt-2 text-sm text-[#968da0]">
            MVP: invite-only joining. You can create and share your invite code.
          </p>
          {isCheckingKyc ? (
            <div className="mt-4 rounded-lg bg-[#968da0]/20 px-4 py-3 text-sm text-[#968da0] font-bold uppercase tracking-wide">
              Checking your KYC status...
            </div>
          ) : !basicKycCompleted ? (
            <div className="mt-4 rounded-lg border border-[#ffb4ab]/20 bg-[#ffb4ab]/10 px-4 py-3 text-sm text-[#ffb4ab] font-bold">
              Complete Tier 1 KYC first to create groups.
            </div>
          ) : null}
        </div>
      </div>

      {inviteToast ? (
        <div className="rounded-lg border border-[#40e56c]/30 bg-[#40e56c]/10 p-4 text-sm text-[#40e56c] font-bold">
          {inviteToast}
        </div>
      ) : null}

      <form
        className="rounded-lg border border-[#4b4454]/30 bg-[#1d2023] p-6"
        onSubmit={form.handleSubmit((v) => mut.mutate(v))}
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#968da0]">Group Name</label>
            <input
              className="w-full rounded-lg border border-[#4b4454]/30 bg-[#323538] px-4 py-2 text-[#e1e2e7] placeholder:text-[#968da0] outline-none focus:ring-2 focus:ring-[#d6baff]/40 transition-all"
              {...form.register("name")}
            />
            {form.formState.errors.name ? (
              <div className="text-xs text-[#ffb4ab] font-bold">{form.formState.errors.name.message}</div>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#968da0]">Group Type</label>
            <div className="flex flex-wrap gap-2">
              {groupTypeOptions.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => form.setValue("groupType", t, { shouldValidate: true })}
                  className={[
                    "rounded-lg border px-4 py-2 text-sm font-bold uppercase tracking-wide transition",
                    form.watch("groupType") === t
                      ? "border-[#d6baff]/40 bg-[#d6baff]/20 text-[#d6baff]"
                      : "border-[#4b4454]/30 bg-[#323538] text-[#968da0] hover:bg-[#4b4454]/30",
                  ].join(" ")}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#968da0]">Contribution Amount (₦)</label>
            <input
              type="number"
              className="w-full rounded-lg border border-[#4b4454]/30 bg-[#323538] px-4 py-2 text-[#e1e2e7] placeholder:text-[#968da0] outline-none focus:ring-2 focus:ring-[#d6baff]/40 transition-all"
              {...form.register("contributionAmount", { valueAsNumber: true })}
            />
            {form.formState.errors.contributionAmount ? (
              <div className="text-xs text-[#ffb4ab] font-bold">{form.formState.errors.contributionAmount.message}</div>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#968da0]">Frequency</label>
            <select
              className="w-full rounded-lg border border-[#4b4454]/30 bg-[#323538] px-4 py-2 text-[#e1e2e7] outline-none focus:ring-2 focus:ring-[#d6baff]/40 transition-all"
              {...form.register("frequency")}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#968da0]">Start Date</label>
            <input
              type="date"
              className="w-full rounded-lg border border-[#4b4454]/30 bg-[#323538] px-4 py-2 text-[#e1e2e7] outline-none focus:ring-2 focus:ring-[#d6baff]/40 transition-all"
              {...form.register("startDate")}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#968da0]">Members (Optional)</label>
            <input
              className="w-full rounded-lg border border-[#4b4454]/30 bg-[#323538] px-4 py-2 text-[#e1e2e7] placeholder:text-[#968da0] outline-none focus:ring-2 focus:ring-[#d6baff]/40 transition-all"
              placeholder="comma-separated usernames e.g. ayo_1, ayo_2"
              {...form.register("membersCsv")}
            />
            <div className="text-xs text-[#968da0]">
              MVP: you can also add members later using your invite code.
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#968da0]">Description (Optional)</label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-[#4b4454]/30 bg-[#323538] px-4 py-2 text-[#e1e2e7] placeholder:text-[#968da0] outline-none focus:ring-2 focus:ring-[#d6baff]/40 transition-all font-mono"
              {...form.register("description")}
            />
          </div>
        </div>

        {mut.isError ? (
          <div className="mt-6 rounded-lg border border-[#ffb4ab]/20 bg-[#ffb4ab]/10 px-4 py-3 text-sm text-[#ffb4ab] font-bold">
            {getAxiosErrorMessage(mut.error)}
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="submit"
            disabled={disabled}
            className="rounded-lg bg-linear-to-br from-[#d6baff] to-[#ab73ff] px-8 py-3 text-sm font-bold text-[#111417] uppercase tracking-wide hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 shadow-[0_8px_24px_rgba(214,186,255,0.25)]"
          >
            {mut.isPending ? "Creating..." : "Create Group"}
          </button>
        </div>
      </form>
    </div>
  );
}

