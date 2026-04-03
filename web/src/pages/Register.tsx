import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { register } from "../api/auth.api";
import { useAuthStore } from "../store/authStore";
import { getAxiosErrorMessage } from "../utils/apiErrors";

const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().min(10).max(20),
  username: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[a-z0-9_]+$/i, "Use letters, numbers and underscore"),
  password: z.string().min(8).max(128),
});

type RegisterValues = z.infer<typeof registerSchema>;

function strength(password: string) {
  let s = 0;
  if (password.length >= 8) s++;
  if (/[A-Z]/.test(password)) s++;
  if (/[0-9]/.test(password)) s++;
  if (/[^A-Za-z0-9]/.test(password)) s++;
  return Math.min(s, 4);
}

export default function Register() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [pwd, setPwd] = useState("");

  const schema = useMemo(() => registerSchema, []);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", phone: "", username: "", password: "" },
    mode: "onChange",
  });

  const mut = useMutation({
    mutationFn: (values: RegisterValues) =>
      register({
        name: values.name,
        email: values.email,
        phone: values.phone,
        username: values.username.toLowerCase(),
        password: values.password,
      }),
    onSuccess: (res) => {
      setAuth(res.token, res.user);
      navigate("/dashboard");
    },
  });

  const s = strength(pwd);

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-white/10 bg-white/70 p-6 shadow-sm dark:bg-slate-900/40">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Create your account</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Join groups, contribute safely, and receive payouts.
        </p>

        <form
          className="mt-5 space-y-4"
          onSubmit={form.handleSubmit((values) => mut.mutate(values))}
        >
          {(
            [
              ["name", "Full name", "text"],
              ["email", "Email", "email"],
              ["phone", "Phone", "tel"],
              ["username", "Username", "text"],
            ] as const
          ).map(([key, label, type]) => (
            <div key={key} className="space-y-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</label>
              <input
                type={type}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                {...form.register(key)}
              />
              {form.formState.errors[key] ? (
                <div className="text-xs text-rose-600">
                  {String(form.formState.errors[key]?.message)}
                </div>
              ) : null}
            </div>
          ))}

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Password</label>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              {...form.register("password")}
              onChange={(e) => {
                setPwd(e.target.value);
                form.setValue("password", e.target.value, { shouldValidate: true });
              }}
            />
            {form.formState.errors.password ? (
              <div className="text-xs text-rose-600">{String(form.formState.errors.password.message)}</div>
            ) : null}

            <div className="pt-1">
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={[
                      "h-2 flex-1 rounded-full",
                      i < s ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800",
                    ].join(" ")}
                  />
                ))}
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Strength: {s}/4
              </div>
            </div>
          </div>

          {mut.isError ? (
            <div className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
              {getAxiosErrorMessage(mut.error)}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={mut.isPending}
            className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
          >
            {mut.isPending ? "Creating..." : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-300">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

