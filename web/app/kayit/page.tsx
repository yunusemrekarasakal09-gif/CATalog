
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/components/ThemeProvider";

const cities = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya",
  "Ankara", "Antalya", "Artvin", "Aydın", "Balıkesir",
  "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur",
  "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli",
  "Diyarbakır", "Edirne", "Elazığ", "Erzincan", "Erzurum",
  "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkâri",
  "Hatay", "Isparta", "Mersin", "İstanbul", "İzmir",
  "Kars", "Kastamonu", "Kayseri", "Kırklareli", "Kırşehir",
  "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa",
  "Kahramanmaraş", "Mardin", "Muğla", "Muş", "Nevşehir",
  "Niğde", "Ordu", "Rize", "Sakarya", "Samsun",
  "Siirt", "Sinop", "Sivas", "Tekirdağ", "Tokat",
  "Trabzon", "Tunceli", "Şanlıurfa", "Uşak", "Van",
  "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman",
  "Kırıkkale", "Batman", "Şırnak", "Bartın", "Ardahan",
  "Iğdır", "Yalova", "Karabük", "Kilis", "Osmaniye",
  "Düzce",
];

export default function KayitPage() {
  const { darkMode, toggleTheme, themeReady } = useTheme();

  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");
  const [catCount, setCatCount] = useState("1");
  const [catYears, setCatYears] = useState("0");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setMessage("");
    setErrorMessage("");

    try {
      if (photo && photo.size > 5 * 1024 * 1024) {
        throw new Error("Profil fotoğrafı en fazla 5 MB olabilir.");
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/giris`,
          data: {
            display_name: fullName.trim(),
            age: Number(age),
            city,
            cat_count: Number(catCount),
            cat_years: Number(catYears),
          },
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes("already registered")) {
          throw new Error(
            "Bu e-posta ile bir hesap zaten mevcut. Giriş sayfasını kullan."
          );
        }

        throw error;
      }

      if (!data.user) {
        throw new Error("Supabase kullanıcı oluşturmadı.");
      }

      // E-posta doğrulaması gerekiyorsa oturum oluşmayabilir.
      if (!data.session) {
        setMessage(
          "Hesabın oluşturuldu. E-posta kutunu kontrol edip doğrulama bağlantısına tıkla. Profil bilgilerini tamamlamak için doğrulamadan sonra giriş yapman gerekecek."
        );
        setPassword("");
        return;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: data.user.id,
            display_name: fullName.trim(),
            age: Number(age),
            city,
            cat_count: Number(catCount),
            cat_years: Number(catYears),
          },
          { onConflict: "id" }
        );

      if (profileError) {
        console.error("Profil kayıt hatası:", profileError);

        throw new Error(
          `Hesap oluşturuldu ancak profil kaydedilemedi: ${profileError.message} (Kod: ${profileError.code})`
        );
      }

      setMessage("Hesabın oluşturuldu ve profil bilgilerin kaydedildi.");
      setPassword("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Kayıt sırasında beklenmeyen bir hata oluştu."
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
        successBg: "rgba(34, 197, 94, 0.10)",
        successBorder: "rgba(74, 222, 128, 0.3)",
        successText: "#86EFAC",
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
        successBg: "#F0FDF4",
        successBorder: "#BBF7D0",
        successText: "#166534",
      };

  if (!themeReady) {
    return <main className="min-h-screen" aria-label="Tema yükleniyor" />;
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

      <div className="relative z-10 w-full max-w-2xl">
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

          {/* Tema değiştirme ikonu */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={darkMode ? "Açık temaya geç" : "Koyu temaya geç"}
            title={darkMode ? "Açık tema" : "Koyu tema"}
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
              alt={darkMode ? "Koyu tema" : "Açık tema"}
              width={54}
              height={54}
              className="h-[54px] w-[54px] object-contain"
            />
          </button>
        </div>

        {/* Kayıt kartı */}
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
          {/* Büyütülmüş CATalog logosu */}
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
            CATalog&apos;a üye ol
          </h1>

          <p
            className="mt-2 text-center text-sm leading-6"
            style={{ color: colors.muted }}
          >
            Kedi severler için kendi profilini oluştur.
          </p>

          <form
            onSubmit={handleSignup}
            className="mt-7 grid gap-5 sm:grid-cols-2"
          >
            {/* Ad soyad */}
            <label
              className="text-sm font-semibold"
              style={{ color: colors.text }}
            >
              Ad soyad
              <input
                required
                maxLength={100}
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
                className="mt-2 w-full rounded-xl border px-3 py-3 font-normal outline-none transition focus:border-[#A184D5] focus:ring-2 focus:ring-[#A184D5]/20 disabled:opacity-60"
                style={{
                  backgroundColor: colors.input,
                  borderColor: colors.inputBorder,
                  color: colors.text,
                }}
                placeholder="Adın ve soyadın"
              />
            </label>

            {/* Yaş */}
            <label
              className="text-sm font-semibold"
              style={{ color: colors.text }}
            >
              Yaş
              <input
                required
                type="number"
                min="13"
                max="120"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                disabled={loading}
                className="mt-2 w-full rounded-xl border px-3 py-3 font-normal outline-none transition focus:border-[#A184D5] focus:ring-2 focus:ring-[#A184D5]/20 disabled:opacity-60"
                style={{
                  backgroundColor: colors.input,
                  borderColor: colors.inputBorder,
                  color: colors.text,
                }}
              />
            </label>

            {/* Şehir */}
            <label
              className="text-sm font-semibold"
              style={{ color: colors.text }}
            >
              Yaşadığın şehir
              <select
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={loading}
                className="mt-2 w-full rounded-xl border px-3 py-3 font-normal outline-none transition focus:border-[#A184D5] focus:ring-2 focus:ring-[#A184D5]/20 disabled:opacity-60"
                style={{
                  backgroundColor: colors.input,
                  borderColor: colors.inputBorder,
                  color: colors.text,
                }}
              >
                <option value="">İl seç</option>
                {cities.map((item) => (
                  <option
                    key={item}
                    value={item}
                    style={{
                      backgroundColor: darkMode ? "#201B29" : "#FFFFFF",
                      color: colors.text,
                    }}
                  >
                    {item}
                  </option>
                ))}
              </select>
            </label>

            {/* Kedi sayısı */}
            <label
              className="text-sm font-semibold"
              style={{ color: colors.text }}
            >
              Kaç kedin var?
              <input
                required
                type="number"
                min="0"
                max="100"
                value={catCount}
                onChange={(e) => setCatCount(e.target.value)}
                disabled={loading}
                className="mt-2 w-full rounded-xl border px-3 py-3 font-normal outline-none transition focus:border-[#A184D5] focus:ring-2 focus:ring-[#A184D5]/20 disabled:opacity-60"
                style={{
                  backgroundColor: colors.input,
                  borderColor: colors.inputBorder,
                  color: colors.text,
                }}
              />
            </label>

            {/* Kedi sahipliği süresi */}
            <label
              className="text-sm font-semibold"
              style={{ color: colors.text }}
            >
              Kaç yıldır kedi sahibisin?
              <input
                required
                type="number"
                min="0"
                max="100"
                value={catYears}
                onChange={(e) => setCatYears(e.target.value)}
                disabled={loading}
                className="mt-2 w-full rounded-xl border px-3 py-3 font-normal outline-none transition focus:border-[#A184D5] focus:ring-2 focus:ring-[#A184D5]/20 disabled:opacity-60"
                style={{
                  backgroundColor: colors.input,
                  borderColor: colors.inputBorder,
                  color: colors.text,
                }}
              />
            </label>

            {/* Profil fotoğrafı */}
            <label
              className="text-sm font-semibold"
              style={{ color: colors.text }}
            >
              Profil fotoğrafı
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={loading}
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;

                  if (file && file.size > 5 * 1024 * 1024) {
                    setErrorMessage(
                      "Profil fotoğrafı en fazla 5 MB olabilir."
                    );
                    e.target.value = "";
                    setPhoto(null);
                    return;
                  }

                  setErrorMessage("");
                  setPhoto(file);
                }}
                className="mt-2 block w-full text-sm font-normal"
              />
              <span
                className="mt-1 block text-xs font-normal"
                style={{ color: colors.muted }}
              >
                JPG, PNG veya WebP · En fazla 5 MB
              </span>

              {photo && (
                <span
                  className="mt-1 block break-all text-xs font-normal"
                  style={{ color: colors.muted }}
                >
                  Seçilen: {photo.name}
                </span>
              )}

              <span
                className="mt-1 block text-xs font-normal"
                style={{ color: colors.muted }}
              >
                Fotoğraf yüklemesi sonraki adımda etkinleştirilecek.
              </span>
            </label>

            {/* E-posta */}
            <label
              className="text-sm font-semibold sm:col-span-2"
              style={{ color: colors.text }}
            >
              E-posta
              <input
                required
                type="email"
                autoComplete="email"
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="mt-2 w-full rounded-xl border px-3 py-3 font-normal outline-none transition focus:border-[#A184D5] focus:ring-2 focus:ring-[#A184D5]/20 disabled:opacity-60"
                style={{
                  backgroundColor: colors.input,
                  borderColor: colors.inputBorder,
                  color: colors.text,
                }}
                placeholder="ornek@mail.com"
              />
            </label>

            {/* Şifre */}
            <label
              className="text-sm font-semibold sm:col-span-2"
              style={{ color: colors.text }}
            >
              Şifre
              <div className="relative mt-2">
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-xl border px-3 py-3 pr-20 font-normal outline-none transition focus:border-[#A184D5] focus:ring-2 focus:ring-[#A184D5]/20 disabled:opacity-60"
                  style={{
                    backgroundColor: colors.input,
                    borderColor: colors.inputBorder,
                    color: colors.text,
                  }}
                  placeholder="En az 8 karakter"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex items-center px-4 text-xs font-semibold transition hover:opacity-70"
                  style={{ color: colors.link }}
                >
                  {showPassword ? "Gizle" : "Göster"}
                </button>
              </div>
            </label>

            {/* Hata mesajı */}
            {errorMessage && (
              <div
                role="alert"
                aria-live="polite"
                className="rounded-xl border px-4 py-3 text-sm leading-5 sm:col-span-2"
                style={{
                  backgroundColor: colors.errorBg,
                  borderColor: colors.errorBorder,
                  color: colors.errorText,
                }}
              >
                {errorMessage}
              </div>
            )}

            {/* Başarı mesajı */}
            {message && (
              <div
                role="status"
                aria-live="polite"
                className="rounded-xl border px-4 py-3 text-sm leading-5"
                style={{
                  backgroundColor: colors.successBg,
                  borderColor: colors.successBorder,
                  color: colors.successText,
                }}
              >
                {message}
              </div>
            )}

            {/* Kayıt butonu */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 font-bold text-white shadow-md transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
              style={{ backgroundColor: colors.primary }}
              onMouseEnter={(event) => {
                if (!loading) {
                  event.currentTarget.style.backgroundColor =
                    colors.primaryHover;
                }
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor = colors.primary;
              }}
            >
              {loading && (
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                />
              )}
              {loading ? "Hesap oluşturuluyor..." : "Üye ol"}
            </button>
          </form>

          {/* Giriş bağlantısı */}
          <div
            className="mt-6 border-t pt-5 text-center"
            style={{ borderColor: colors.border }}
          >
            <p className="text-sm" style={{ color: colors.muted }}>
              Zaten hesabın var mı?{" "}
              <Link
                href="/giris"
                className="font-bold transition hover:underline"
                style={{ color: colors.link }}
              >
                Giriş yap
              </Link>
            </p>
          </div>
        </section>

        <p
          className="mt-5 text-center text-xs"
          style={{ color: colors.muted }}
        >
          CATalog hesabını güvenle oluştur.
        </p>
      </div>
    </main>
  );
}
