
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/components/ThemeProvider";

type Profile = {
  id: string;
  display_name: string | null;
  city: string | null;
  avatar_url: string | null;
  bio: string | null;
  age: number | null;
  cat_count: number | null;
  cat_years: number | null;
};

type Cat = {
  id: string;
  name: string;
  breed: string | null;
  age_years: number | null;
  gender: string | null;
  city: string | null;
  color: string | null;
  photo_urls: string[] | null;
  description: string | null;
};

export default function ProfilPage() {
  const router = useRouter();
  const { darkMode, toggleTheme, themeReady } = useTheme();
  const palette = darkMode
    ? { page: "#15121D", text: "#F5EFFB", muted: "#B8AEC6", card: "rgba(32,27,41,0.94)", border: "rgba(255,255,255,0.12)", soft: "#2A2235", accent: "#A184D5", accentText: "#D9C9F0" }
    : { page: "#FAF8FC", text: "#302542", muted: "#82778F", card: "rgba(255,255,255,0.94)", border: "#ECE5F3", soft: "#F0E7F8", accent: "#8060AE", accentText: "#624B82" };
  const themeBackground = darkMode ? "/images/brand/arkaplan1.png" : "/images/brand/arkaplan2.png";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (authError || !user) {
        router.replace("/giris");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id, display_name, city, avatar_url, bio, age, cat_count, cat_years"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (profileError) {
        console.error("Profil yüklenemedi:", profileError);
        setError("Profil bilgileri yüklenemedi.");
        setLoading(false);
        return;
      }

      setProfile(profileData as Profile | null);

      const { data: catData, error: catsError } = await supabase
        .from("cats")
        .select(
          "id, name, breed, age_years, gender, city, color, photo_urls, description"
        )
        .eq("owner_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (catsError) {
        console.error("İlanlar yüklenemedi:", catsError);
        setError("Profil yüklendi ancak ilanlar alınamadı.");
      } else {
        setCats((catData ?? []) as Cat[]);
      }

      setLoading(false);
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleRemoveCat(cat: Cat) {
    const confirmed = window.confirm(
      `“${cat.name}” ilanını kaldırmak istediğine emin misin? İlan artık aktif ilanlarda görünmeyecek.`
    );

    if (!confirmed) return;

    setDeletingCatId(cat.id);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setError("İlanı kaldırmak için tekrar giriş yapmalısın.");
        return;
      }

      const { error: updateError } = await supabase
        .from("cats")
        .update({ is_active: false })
        .eq("id", cat.id)
        .eq("owner_id", user.id);

      if (updateError) {
        console.error("İlan kaldırılamadı:", updateError);
        setError("İlan kaldırılamadı. Veritabanı izinlerini kontrol etmek gerekebilir.");
        return;
      }

      setCats((currentCats) => currentCats.filter((item) => item.id !== cat.id));
    } catch (removeError) {
      console.error("İlan kaldırılırken beklenmeyen hata:", removeError);
      setError("İlan kaldırılırken beklenmeyen bir hata oluştu.");
    } finally {
      setDeletingCatId(null);
    }
  }

  if (loading || !themeReady) {
    return (
      <main
        className="flex min-h-screen items-center justify-center px-4 py-12 text-center"
        style={{ backgroundColor: palette.page, color: palette.muted, backgroundImage: `url("${themeBackground}")`, backgroundPosition: "center", backgroundSize: "cover" }}
      >
        Profil yükleniyor...
      </main>
    );
  }

  return (
    <main
      className={`catalog-profile-page min-h-screen px-4 pb-10 ${darkMode ? "catalog-profile-dark" : "catalog-profile-light"}`}
      style={{ backgroundColor: palette.page, color: palette.text, backgroundImage: `url("${themeBackground}")`, backgroundPosition: "center top", backgroundSize: "cover", backgroundAttachment: "fixed" }}
    >
      <header className="sticky top-0 z-30 -mx-4 mb-7 border-b backdrop-blur-xl" style={{ borderColor: palette.border, backgroundColor: darkMode ? "rgba(25,21,33,0.95)" : "rgba(255,255,255,0.95)" }}>
        <div className="relative mx-auto flex h-[144px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" aria-label="CAT-ALOG ana sayfa" className="relative flex h-full w-[120px] shrink-0 items-center transition hover:opacity-80">
            <Image src={darkMode ? "/images/brand/logo1.png" : "/images/brand/logo2.png"} alt="CAT-ALOG" width={240} height={240} priority className="absolute left-1/2 top-1/2 h-[240px] w-[240px] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain" />
          </Link>
          <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
            <Link href="/" className="hidden rounded-xl border px-4 py-3 text-sm font-bold transition hover:opacity-80 sm:inline-flex" style={{ borderColor: palette.border, color: palette.text }}>← Ana sayfa</Link>
            <button type="button" onClick={toggleTheme} aria-label={darkMode ? "Gündüz temasına geç" : "Gece temasına geç"} title={darkMode ? "Gündüz teması" : "Gece teması"} className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl transition hover:scale-105">
              <Image src={darkMode ? "/images/icons/gece.png" : "/images/icons/gündüz.png"} alt={darkMode ? "Gece teması" : "Gündüz teması"} width={43} height={43} className="h-[43px] w-[43px] object-contain" />
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#75658E] transition hover:text-[#503B70]"
        >
          ← Ana sayfaya dön
        </Link>

        <section className="mt-6 rounded-3xl border border-[#EDE5F5] bg-white p-5 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#EDE5F5] bg-[#F3ECFA] text-4xl">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profil fotoğrafı"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Image
                  src={darkMode ? "/images/icons/user%20ikonu.png" : "/images/icons/user%20ikonu2.png"}
                  alt="Profil fotoğrafı yok"
                  width={112}
                  height={112}
                  className="h-full w-full object-contain p-3"
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-black text-[#352747] sm:text-3xl">
                {profile?.display_name || "CAT-ALOG kullanıcısı"}
              </h1>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[#777080]">
                <span>
                  📍 {profile?.city || "Şehir belirtilmemiş"}
                </span>

                {profile?.age !== null &&
                  profile?.age !== undefined && (
                    <span>🎂 {profile.age} yaş</span>
                  )}
              </div>

              {profile?.bio?.trim() && (
                <div className="mt-5 rounded-2xl bg-[#F8F5FC] p-4">
                  <h2 className="font-bold text-[#49385F]">
                    Hakkımda
                  </h2>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#655A76]">
                    {profile.bio}
                  </p>
                </div>
              )}

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-[#F8F5FC] p-4">
                  <p className="text-2xl font-black text-[#624B82]">
                    {profile?.cat_count ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-[#777080]">
                    Sahip olunan kedi
                  </p>
                </div>

                <div className="rounded-2xl bg-[#F8F5FC] p-4">
                  <p className="text-2xl font-black text-[#624B82]">
                    {profile?.cat_years ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-[#777080]">
                    Yıllık deneyim
                  </p>
                </div>

                <div className="col-span-2 rounded-2xl bg-[#F8F5FC] p-4 sm:col-span-1">
                  <p className="text-2xl font-black text-[#624B82]">
                    {cats.length}
                  </p>
                  <p className="mt-1 text-xs text-[#777080]">
                    Aktif ilan
                  </p>
                </div>
              </div>
            </div>

            <Link
              href="/profil-tamamla"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#624B82] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#503B70]"
            >
              Profili düzenle
            </Link>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-xl font-black text-[#352747] sm:text-2xl">
              İlanlarım
            </h2>

            <Link
              href="/ilan-ver"
              className="rounded-xl border border-[#E3D7F0] bg-white px-4 py-2.5 text-sm font-bold text-[#624B82] transition hover:bg-[#F8F5FC]"
            >
              + İlan ver
            </Link>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {cats.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#DED2EB] bg-white px-5 py-12 text-center">
              <div className="flex justify-center">
                <Image
                  src={darkMode ? "/images/icons/kedi1.png" : "/images/icons/kedi2.png"}
                  alt="Kedi simgesi"
                  width={76}
                  height={76}
                  className="h-[76px] w-[76px] object-contain"
                />
              </div>
              <h3 className="mt-4 font-bold text-[#49385F]">
                Henüz aktif bir ilanınız yok
              </h3>
              <p className="mt-2 text-sm text-[#777080]">
                İlan verdiğinizde burada görünecek.
              </p>
              <Link
                href="/ilan-ver"
                className="mt-5 inline-flex rounded-xl bg-[#624B82] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#503B70]"
              >
                İlk ilanını oluştur
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {cats.map((cat) => (
                <article
                  key={cat.id}
                  className="overflow-hidden rounded-3xl border border-[#EDE5F5] bg-white shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => handleRemoveCat(cat)}
                    disabled={deletingCatId === cat.id}
                    className="flex w-full items-center justify-center gap-3 border-b px-5 py-4 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 sm:py-5"
                    style={{
                      borderColor: palette.border,
                      backgroundColor: darkMode ? "rgba(65,42,75,0.96)" : "#FFF1F5",
                      color: darkMode ? "#F3D5E8" : "#8C4267",
                    }}
                    aria-label={`${cat.name} ilanını kaldır`}
                  >
                    <Image
                      src={darkMode ? "/images/icons/ilanıkaldır.png" : "/images/icons/ilanıkaldır2.png"}
                      alt=""
                      width={52}
                      height={52}
                      className="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14"
                    />
                    <span
                      className="text-lg font-bold tracking-normal sm:text-xl"
                      style={{ fontFamily: "inherit" }}
                    >
                      {deletingCatId === cat.id ? "KALDIRILIYOR..." : "İLANI KALDIR"}
                    </span>
                  </button>
                  <Link href={`/kediler/${cat.id}`} className="block">
                    <div className="aspect-[4/3] overflow-hidden bg-[#F3ECFA]">
                      {cat.photo_urls?.[0] ? (
                        <img
                          src={cat.photo_urls[0]}
                          alt={cat.name}
                          className="h-full w-full object-cover transition duration-300 hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Image
                            src={darkMode ? "/images/icons/kedi1.png" : "/images/icons/kedi2.png"}
                            alt="Kedi simgesi"
                            width={100}
                            height={100}
                            className="h-[100px] w-[100px] object-contain"
                          />
                        </div>
                      )}
                    </div>

                    <div className="p-5">
                      <h3 className="text-lg font-black text-[#352747]">
                        {cat.name}
                      </h3>

                      <p className="mt-2 text-sm text-[#777080]">
                        {[cat.breed, cat.city]
                          .filter(Boolean)
                          .join(" · ") || "Detay belirtilmemiş"}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#655A76]">
                        {cat.age_years !== null &&
                          cat.age_years !== undefined && (
                            <span className="rounded-full bg-[#F8F5FC] px-3 py-1.5">
                              {cat.age_years} yaş
                            </span>
                          )}

                        {cat.gender && (
                          <span className="rounded-full bg-[#F8F5FC] px-3 py-1.5">
                            {cat.gender}
                          </span>
                        )}

                        {cat.color && (
                          <span className="rounded-full bg-[#F8F5FC] px-3 py-1.5">
                            {cat.color}
                          </span>
                        )}
                      </div>

                      {cat.description && (
                        <p className="mt-4 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-[#655A76]">
                          {cat.description}
                        </p>
                      )}
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
      <style jsx global>{`
        .catalog-profile-page .bg-white { background-color: ${darkMode ? "rgba(32,27,41,0.94)" : "#FFFFFF"} !important; }
        .catalog-profile-page [class*="bg-[#F8F5FC]"], .catalog-profile-page [class*="bg-[#F3ECFA]"] { background-color: ${darkMode ? "#2A2235" : "#F5F0F9"} !important; }
        .catalog-profile-page [class*="text-[#352747]"], .catalog-profile-page [class*="text-[#49385F]"] { color: ${darkMode ? "#D9C9F0" : "#352747"} !important; }
        .catalog-profile-page [class*="text-[#624B82]"] { color: ${darkMode ? "#D9C9F0" : "#624B82"} !important; }
        .catalog-profile-page [class*="text-[#655A76]"], .catalog-profile-page [class*="text-[#777080]"] { color: ${darkMode ? "#B8AEC6" : "#777080"} !important; }
        .catalog-profile-page [class*="border-[#EDE5F5]"], .catalog-profile-page [class*="border-[#DED2EB]"], .catalog-profile-page [class*="border-[#E3D7F0]"] { border-color: ${darkMode ? "rgba(255,255,255,0.12)" : "#EAE3F1"} !important; }
      `}</style>
    </main>
  );
}
