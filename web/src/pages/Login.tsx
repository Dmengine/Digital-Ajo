import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { login } from "../api/auth.api";
import { useAuthStore } from "../store/authStore";
import { getAxiosErrorMessage } from "../utils/apiErrors";
import { Shield } from "lucide-react";

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
    <div className="min-h-[calc(100vh-120px)] flex flex-col items-center justify-center px-4">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#ab73ff]/10 blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#40e56c]/5 blur-[80px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 mx-auto max-w-md w-full">
        {/* Logo Context */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-linear-to-br from-[#d6baff] to-[#ab73ff] shadow-lg mb-4">
            <Shield size={28} className="text-[#111417]" />
          </div>
          <h1 className="font-headline text-4xl font-extrabold text-[#d6baff] tracking-tight">
            Welcome back
          </h1>
          <p className="mt-2 text-[#cdc2d7] text-sm uppercase tracking-[0.2em] font-semibold">
            Sign in to your ajo groups
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-lg border border-[#4b4454]/30 bg-[#1d2023] p-8 shadow-2xl">
          <form className="space-y-6" onSubmit={form.handleSubmit((v) => mut.mutate(v))}>
            {/* Email Field */}
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider font-bold text-[#cdc2d7] ml-1">
                Email or username
              </label>
              <input
                className="w-full bg-[#323538] border border-[#4b4454]/30 rounded-lg py-4 px-5 text-[#e1e2e7] placeholder:text-[#968da0] outline-none focus:ring-2 focus:ring-[#d6baff]/40 transition-all"
                placeholder="name@example.com"
                {...form.register("emailOrUsername")}
              />
              {form.formState.errors.emailOrUsername ? (
                <div className="text-xs text-[#ffb4ab] font-semibold">
                  {String(form.formState.errors.emailOrUsername.message)}
                </div>
              ) : null}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="block text-xs uppercase tracking-wider font-bold text-[#cdc2d7]">
                  Access Key
                </label>
                <Link
                  to="#"
                  className="text-[#d6baff] text-[11px] font-bold uppercase tracking-tighter hover:opacity-80 transition-opacity"
                >
                  Forgot Key?
                </Link>
              </div>
              <input
                type="password"
                className="w-full bg-[#323538] border border-[#4b4454]/30 rounded-lg py-4 px-5 text-[#e1e2e7] placeholder:text-[#968da0] outline-none focus:ring-2 focus:ring-[#d6baff]/40 transition-all"
                placeholder="••••••••••••"
                {...form.register("password")}
              />
              {form.formState.errors.password ? (
                <div className="text-xs text-[#ffb4ab] font-semibold">
                  {String(form.formState.errors.password.message)}
                </div>
              ) : null}
            </div>

            {/* Error Alert */}
            {mut.isError ? (
              <div className="rounded-lg bg-[#ffb4ab]/10 px-4 py-3 text-sm text-[#ffb4ab] font-semibold border border-[#ffb4ab]/20">
                {getAxiosErrorMessage(mut.error)}
              </div>
            ) : null}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={mut.isPending}
              className="w-full bg-linear-to-br from-[#40e56c] to-[#02c953] text-[#003912] font-headline font-bold text-lg py-4 rounded-lg shadow-[0_8px_24px_rgba(64,229,108,0.25)] hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {mut.isPending ? "Signing In..." : "Sign In"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 py-6">
            <div className="h-px grow bg-[#4b4454]/20"></div>
            <span className="text-[#968da0] text-[10px] uppercase tracking-widest font-semibold">
              New Member?
            </span>
            <div className="h-px grow bg-[#4b4454]/20"></div>
          </div>

          {/* Register Link */}
          <div className="text-center">
            <p className="text-[#cdc2d7] text-sm">
              No account yet?{" "}
              <Link to="/register" className="text-[#40e56c] font-bold hover:underline">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

