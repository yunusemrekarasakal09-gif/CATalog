
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/components/ThemeProvider";

export default function GirisPage() {
  const router = useRouter();
  const { darkMode, toggleTheme, themeReady } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setErrorMessage("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(
          "Giriş başarısız. E-posta adresini ve şifreni kontrol et."
        );
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setErrorMessage(
        "Bir bağlantı hatası oluştu. Lütfen tekrar dene."
      );
    } finally {
      setLoading(false);
    }
  }

  const colors = darkMode
    ? {
        text: "#F5EFFB",
        muted: "#B8AEC6",
        card: "rgba(32, 27, 41, 0.94)",
        border: "rgba(255, 255, 255, 0.12)",
        input: "rgba(21, 18, 29, 0.82)",
        inputBorder: "rgba(255, 255, 255, 0.16)",
        primary: "#A184D5",
        primaryHover: "#8C6BC2",
        link: "#C4A8F1",
        errorBg: "rgba(239, 68, 68, 0.10)",
        errorBorder: "rgba(248, 113, 113, 0.3)",
        errorText: "#FCA5A5",
      }
    : {
        text: "#302542",
        muted: "#85818F",
        card: "rgba(255, 255, 255, 0.94)",
        border: "#ECE5F3",
        input: "rgba(255, 255, 255, 0.92)",
        inputBorder: "#E5DDED",
        primary: "#7251A5",
        primaryHover: "#62458F",
        link: "#7251A5",
        errorBg: "#FEF2F2",
        errorBorder: "#FECACA",
        errorText: "#B91C1C",
      };

  if (!themeReady) {
    return (
      <main
        className="min-h-screen"
        aria-label="Tema yükleniyor"
      />
    );
  }

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6"
      style={{
        backgroundColor: darkMode ? "#15121D" : "#FAF8FC",
        backgroundImage: `url("${
          darkMode
            ? "/images/brand/arkaplan1.png"
            : "/images/brand/arkaplan2.png"
        }")`,
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundAttachment: "fixed",
        color: colors.text,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundColor: darkMode
            ? "rgba(21, 18, 29, 0.58)"
            : "rgba(250, 248, 252, 0.42)",
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Üst bölüm */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link
            href="/"
            aria-label="Ana sayfaya dön"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition hover:opacity-75"
            style={{ color: colors.text }}
          >
            <span aria-hidden="true" className="text-xl">
              ←
            </span>
            Ana sayfa
          </Link>

          {/* Büyütülmüş tema değiştirme ikonu */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={
              darkMode
                ? "Açık temaya geç"
                : "Koyu temaya geç"
            }
            title={
              darkMode
                ? "Açık tema"
                : "Koyu tema"
            }
            className="flex h-[66px] w-[66px] shrink-0 items-center justify-center rounded-2xl border p-2 transition hover:scale-105"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
            }}
          >
            <Image
              src={
                darkMode
                  ? "/images/icons/gece.png"
                  : "/images/icons/gündüz.png"
              }
              alt={
                darkMode
                  ? "Koyu tema"
                  : "Açık tema"
              }
              width={54}
              height={54}
              className="h-[54px] w-[54px] object-contain"
            />
          </button>
        </div>

        {/* Giriş kartı */}
        <section
          className="rounded-3xl border p-6 shadow-2xl backdrop-blur-xl sm:p-8"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
            boxShadow: darkMode
              ? "0 24px 70px rgba(0, 0, 0, 0.28)"
              : "0 24px 70px rgba(74, 49, 104, 0.12)",
          }}
        >
          {/* 1,5 kat büyütülmüş CATalog logosu */}
          <div className="mb-5 flex justify-center">
            <Link
              href="/"
              aria-label="CATalog ana sayfası"
              className="inline-flex items-center justify-center"
            >
              <Image
                src={
                  darkMode
                    ? "/images/brand/logo1.png"
                    : "/images/brand/logo2.png"
                }
                alt="CATalog"
                width={360}
                height={150}
                priority
                className="h-auto max-h-36 w-auto max-w-[330px] object-contain"
              />
            </Link>
          </div>

          <h1
            className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl"
            style={{ color: colors.text }}
          >
            Tekrar hoş geldin!
          </h1>

          <p
            className="mt-2 text-center text-sm leading-6"
            style={{ color: colors.muted }}
          >
            Hesabına giriş yaparak CATalog&apos;a devam et.
          </p>

          <form
            onSubmit={handleLogin}
            className="mt-7 space-y-5"
          >
            {/* E-posta */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold"
                style={{ color: colors.text }}
              >
                E-posta adresi
              </label>

              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                maxLength={254}
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="ornek@mail.com"
                disabled={loading}
                className="w-full rounded-xl border px-4 py-3.5 text-sm outline-none transition focus:border-[#A184D5] focus:ring-2 focus:ring-[#A184D5]/20 disabled:opacity-60"
                style={{
                  backgroundColor: colors.input,
                  borderColor: colors.inputBorder,
                  color: colors.text,
                }}
              />
            </div>

            {/* Şifre */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold"
                style={{ color: colors.text }}
              >
                Şifre
              </label>

              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Şifreni gir"
                  disabled={loading}
                  className="w-full rounded-xl border px-4 py-3.5 pr-16 text-sm outline-none transition focus:border-[#A184D5] focus:ring-2 focus:ring-[#A184D5]/20 disabled:opacity-60"
                  style={{
                    backgroundColor: colors.input,
                    borderColor: colors.inputBorder,
                    color: colors.text,
                  }}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((current) => !current)
                  }
                  aria-label={
                    showPassword
                      ? "Şifreyi gizle"
                      : "Şifreyi göster"
                  }
                  aria-pressed={showPassword}
                  disabled={loading}
                  className="absolute inset-y-0 right-0 flex items-center px-4 text-xs font-semibold transition hover:opacity-70 disabled:opacity-50"
                  style={{ color: colors.link }}
                >
                  {showPassword ? "Gizle" : "Göster"}
                </button>
              </div>
            </div>

            {/* Hata mesajı */}
            {errorMessage && (
              <div
                role="alert"
                aria-live="polite"
                className="rounded-xl border px-4 py-3 text-sm leading-5"
                style={{
                  backgroundColor: colors.errorBg,
                  borderColor: colors.errorBorder,
                  color: colors.errorText,
                }}
              >
                {errorMessage}
              </div>
            )}

            {/* Giriş butonu */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white shadow-md transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                backgroundColor: colors.primary,
              }}
              onMouseEnter={(event) => {
                if (!loading) {
                  event.currentTarget.style.backgroundColor =
                    colors.primaryHover;
                }
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor =
                  colors.primary;
              }}
            >
              {loading && (
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                />
              )}

              {loading
                ? "Giriş yapılıyor..."
                : "Giriş yap"}
            </button>
          </form>

          {/* Kayıt bağlantısı */}
          <div
            className="mt-6 border-t pt-5 text-center"
            style={{ borderColor: colors.border }}
          >
            <p
              className="text-sm"
              style={{ color: colors.muted }}
            >
              Henüz hesabın yok mu?{" "}
              <Link
                href="/kayit"
                className="font-bold transition hover:underline"
                style={{ color: colors.link }}
              >
                Üye ol
              </Link>
            </p>
          </div>
        </section>

        <p
          className="mt-5 text-center text-xs"
          style={{ color: colors.muted }}
        >
          CATalog hesabına güvenli şekilde giriş yap.
        </p>
      </div>
    </main>
  );
}
