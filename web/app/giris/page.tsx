
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function GirisPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMessage("Giriş başarısız. E-posta ve şifreni kontrol et.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F5FC] px-4 py-10 text-[#30264A]">
      <div className="w-full max-w-md">
        <Link href="/" className="text-sm font-semibold text-[#9B78BF]">
          ← CAT-ALOG ana sayfa
        </Link>

        <div className="mt-5 rounded-3xl border border-[#EEE9F8] bg-white p-6 shadow-sm sm:p-8">
          <div className="text-center text-4xl">🐈</div>

          <h1 className="mt-4 text-center text-2xl font-extrabold">
            Tekrar hoş geldin!
          </h1>

          <p className="mt-2 text-center text-sm text-[#85818F]">
            CAT-ALOG hesabına giriş yap.
          </p>

          <form onSubmit={handleLogin} className="mt-7 space-y-5">
            <label className="block text-sm font-semibold">
              E-posta
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ornek@mail.com"
                className="mt-2 w-full rounded-xl border border-[#EAE4F4] px-3 py-3 font-normal outline-none focus:border-[#B9A5E5]"
              />
            </label>

            <label className="block text-sm font-semibold">
              Şifre
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Şifren"
                className="mt-2 w-full rounded-xl border border-[#EAE4F4] px-3 py-3 font-normal outline-none focus:border-[#B9A5E5]"
              />
            </label>

            {errorMessage && (
              <p role="alert" className="text-sm text-red-600">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#30264A] py-3.5 font-semibold text-white transition hover:bg-[#51416E] disabled:opacity-50"
            >
              {loading ? "Giriş yapılıyor..." : "Giriş yap"}
            </button>
          </form>

          <div className="mt-6 border-t border-[#F0EAF6] pt-5 text-center">
            <p className="text-sm text-[#85818F]">
              Hesabın yok mu?{" "}
              <Link
                href="/kayit"
                className="font-bold text-[#9270C4] transition hover:text-[#624B82]"
              >
                Üye ol
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
