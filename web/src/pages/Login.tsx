import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { login } from "../api/auth.api";
import { useAuthStore } from "../store/authStore";
import { getAxiosErrorMessage } from "../utils/apiErrors";

const loginSchema = z.object({
  emailOrUsername: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(128),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { emailOrUsername: "", password: "" },
    mode: "onChange",
  });

  const mut = useMutation({
    mutationFn: (values: LoginValues) => login(values),
    onSuccess: (res) => {
      setAuth(res.token, res.user);
      navigate("/dashboard");
    },
  });

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-white/10 bg-white/70 p-6 shadow-sm dark:bg-slate-900/40">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Login</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Access your dashboard and wallet.
        </p>

        <form className="mt-5 space-y-4" onSubmit={form.handleSubmit((v) => mut.mutate(v))}>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Email or Username</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              {...form.register("emailOrUsername")}
            />
            {form.formState.errors.emailOrUsername ? (
              <div className="text-xs text-rose-600">{String(form.formState.errors.emailOrUsername.message)}</div>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Password</label>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              {...form.register("password")}
            />
            {form.formState.errors.password ? (
              <div className="text-xs text-rose-600">{String(form.formState.errors.password.message)}</div>
            ) : null}
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
            {mut.isPending ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-300">
          No account?{" "}
          <Link to="/register" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

