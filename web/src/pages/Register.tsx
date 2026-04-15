import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { register } from "../api/auth.api";
import { useAuthStore } from "../store/authStore";
import { getAxiosErrorMessage } from "../utils/apiErrors";
import { UserPlus } from "lucide-react";

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
    <div className="min-h-[calc(100vh-120px)] flex flex-col items-center justify-center px-4">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#ab73ff]/10 blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#40e56c]/5 blur-[80px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 mx-auto max-w-md w-full">
        {/* Logo Context */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-linear-to-br from-[#d6baff] to-[#ab73ff] shadow-lg mb-4">
            <UserPlus size={28} className="text-[#111417]" />
          </div>
          <h1 className="font-headline text-4xl font-extrabold text-[#d6baff] tracking-tight">
            Join Now
          </h1>
          <p className="mt-2 text-[#cdc2d7] text-sm">
            Create your account and start contributing.
          </p>
        </div>

        {/* Register Card */}
        <div className="rounded-lg border border-[#4b4454]/30 bg-[#1d2023] p-8 shadow-2xl">
          <form className="space-y-5" onSubmit={form.handleSubmit((values) => mut.mutate(values))}>
            {(
              [
                ["name", "Full Name", "text"],
                ["email", "Email Address", "email"],
                ["phone", "Phone Number", "tel"],
                ["username", "Username", "text"],
              ] as const
            ).map(([key, label, type]) => (
              <div key={key} className="space-y-2">
                <label className="text-xs uppercase tracking-wider font-bold text-[#cdc2d7] ml-1">
                  {label}
                </label>
                <input
                  type={type}
                  className="w-full bg-[#323538] border border-[#4b4454]/30 rounded-lg py-3 px-4 text-[#e1e2e7] placeholder:text-[#968da0] outline-none focus:ring-2 focus:ring-[#d6baff]/40 transition-all"
                  {...form.register(key)}
                />
                {form.formState.errors[key] ? (
                  <div className="text-xs text-[#ffb4ab] font-semibold">
                    {String(form.formState.errors[key]?.message)}
                  </div>
                ) : null}
              </div>
            ))}

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider font-bold text-[#cdc2d7] ml-1">
                Password
              </label>
              <input
                type="password"
                className="w-full bg-[#323538] border border-[#4b4454]/30 rounded-lg py-3 px-4 text-[#e1e2e7] placeholder:text-[#968da0] outline-none focus:ring-2 focus:ring-[#d6baff]/40 transition-all"
                {...form.register("password")}
                onChange={(e) => {
                  setPwd(e.target.value);
                  form.setValue("password", e.target.value, { shouldValidate: true });
                }}
              />
              {form.formState.errors.password ? (
                <div className="text-xs text-[#ffb4ab] font-semibold">
                  {String(form.formState.errors.password.message)}
                </div>
              ) : null}

              <div className="pt-2">
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={[
                        "h-2 flex-1 rounded-full transition-colors",
                        i < s ? "bg-[#40e56c]" : "bg-[#4b4454]/40",
                      ].join(" ")}
                    />
                  ))}
                </div>
                <div className="mt-1.5 text-xs text-[#968da0] font-semibold">
                  Password strength: {["Weak", "Fair", "Good", "Strong"][s] || "Very Weak"}
                </div>
              </div>
            </div>

            {mut.isError ? (
              <div className="rounded-lg bg-[#ffb4ab]/10 px-4 py-3 text-sm text-[#ffb4ab] font-semibold border border-[#ffb4ab]/20">
                {getAxiosErrorMessage(mut.error)}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={mut.isPending}
              className="w-full bg-linear-to-br from-[#40e56c] to-[#02c953] text-[#003912] font-headline font-bold text-lg py-4 rounded-lg shadow-[0_8px_24px_rgba(64,229,108,0.25)] hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 mt-2"
            >
              {mut.isPending ? "Creating account..." : "Create Account"}
            </button>
          </form>

          {/* Already have account */}
          <div className="mt-6 text-center">
            <p className="text-[#cdc2d7] text-sm">
              Already a member?{" "}
              <Link to="/login" className="text-[#40e56c] font-bold hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

