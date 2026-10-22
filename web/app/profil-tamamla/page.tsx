
"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/components/ThemeProvider";

type ProfileForm = {
  display_name: string;
  age: string;
  city: string;
  bio: string;
  cat_count: string;
  cat_years: string;
  avatar_url: string;
};

const initialForm: ProfileForm = {
  display_name: "",
  age: "",
  city: "",
  bio: "",
  cat_count: "0",
  cat_years: "0",
  avatar_url: "",
};

const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

export default function ProfilTamamlaPage() {
  const router = useRouter();
  const { darkMode, toggleTheme, themeReady } = useTheme();
  const palette = darkMode
    ? { page: "#15121D", text: "#F5EFFB", muted: "#B8AEC6", card: "rgba(32,27,41,0.94)", border: "rgba(255,255,255,0.12)", soft: "#2A2235", input: "#191521", accent: "#A184D5", accentText: "#D9C9F0" }
    : { page: "#FAF8FC", text: "#302542", muted: "#82778F", card: "rgba(255,255,255,0.94)", border: "#ECE5F3", soft: "#F0E7F8", input: "#FCFAFE", accent: "#8060AE", accentText: "#624B82" };
  const themeBackground = darkMode ? "/images/brand/arkaplan1.png" : "/images/brand/arkaplan2.png";

  const [form, setForm] = useState<ProfileForm>(initialForm);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (authError || !user) {
        router.replace("/giris");
        return;
      }

      setUserId(user.id);

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select(
          "display_name, age, city, bio, cat_count, cat_years, avatar_url"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (profileError) {
        console.error("Profil bilgileri alınamadı:", profileError);
        setError("Profil bilgileri yüklenemedi. Lütfen tekrar dene.");
        setLoading(false);
        return;
      }

      if (data) {
        setForm({
          display_name: data.display_name ?? "",
          age: data.age == null ? "" : String(data.age),
          city: data.city ?? "",
          bio: data.bio ?? "",
          cat_count: String(data.cat_count ?? 0),
          cat_years: String(data.cat_years ?? 0),
          avatar_url: data.avatar_url ?? "",
        });

        setPhotoPreview(data.avatar_url ?? "");
      }

      setLoading(false);
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");
    setSuccess("");

    if (!file.type.startsWith("image/")) {
      setError("Lütfen bir görsel dosyası seç.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_PHOTO_SIZE) {
      setError("Fotoğraf en fazla 5 MB olabilir.");
      event.target.value = "";
      return;
    }

    setPhotoFile(file);
    setRemovePhoto(false);

    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview((previous) => {
      if (previous.startsWith("blob:")) {
        URL.revokeObjectURL(previous);
      }
      return previewUrl;
    });
  }

  function handleRemovePhoto() {
    setPhotoFile(null);
    setRemovePhoto(true);
    setPhotoPreview("");
    setForm((current) => ({
      ...current,
      avatar_url: "",
    }));
    setError("");
    setSuccess("");
  }

  async function uploadPhoto(): Promise<string | null> {
    if (!photoFile || !userId) return form.avatar_url || null;

    setUploading(true);

    const extension = photoFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${userId}/avatar-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("cat-photos")
      .upload(filePath, photoFile, {
        upsert: false,
        contentType: photoFile.type,
      });

    setUploading(false);

    if (uploadError) {
      console.error("Fotoğraf yüklenemedi:", uploadError);
      throw new Error(
        "Fotoğraf yüklenemedi. cat-photos depolama alanını kontrol et."
      );
    }

    const { data } = supabase.storage
      .from("cat-photos")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!userId) {
      setError("Oturum bilgisi bulunamadı. Lütfen tekrar giriş yap.");
      return;
    }

    const trimmedName = form.display_name.trim();

    if (!trimmedName) {
      setError("Lütfen profil adını gir.");
      return;
    }

    const age = form.age.trim() === "" ? null : Number(form.age);
    const catCount = Number(form.cat_count);
    const catYears = Number(form.cat_years);

    if (
      age !== null &&
      (!Number.isInteger(age) || age < 18 || age > 120)
    ) {
      setError("Yaşını 18 ile 120 arasında tam sayı olarak gir.");
      return;
    }

    if (
      !Number.isInteger(catCount) ||
      catCount < 0 ||
      catCount > 1000
    ) {
      setError("Kedi sayısı 0 ile 1000 arasında tam sayı olmalı.");
      return;
    }

    if (
      !Number.isInteger(catYears) ||
      catYears < 0 ||
      catYears > 100
    ) {
      setError("Deneyim süresi 0 ile 100 arasında tam sayı olmalı.");
      return;
    }

    setSaving(true);

    try {
      let avatarUrl: string | null = form.avatar_url || null;

      if (removePhoto) {
        avatarUrl = null;
      } else if (photoFile) {
        avatarUrl = await uploadPhoto();
      }

      const { error: saveError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            display_name: trimmedName,
            age,
            city: form.city.trim() || null,
            bio: form.bio.trim() || null,
            cat_count: catCount,
            cat_years: catYears,
            avatar_url: avatarUrl,
          },
          { onConflict: "id" }
        );

      if (saveError) {
        console.error("Profil kaydedilemedi:", saveError);
        throw new Error(
          "Profil kaydedilemedi. Supabase tablosundaki sütunları ve izinleri kontrol et."
        );
      }

      setSuccess("Profilin başarıyla kaydedildi!");
      router.push("/profil");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Beklenmeyen bir hata oluştu.";
      setError(message);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  if (loading || !themeReady) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-12 text-center" style={{ backgroundColor: palette.page, color: palette.muted, backgroundImage: `url("${themeBackground}")`, backgroundPosition: "center", backgroundSize: "cover" }}>
        Profil bilgileri yükleniyor...
      </main>
    );
  }

  return (
    <main className={`catalog-profile-form min-h-screen px-4 pb-10 ${darkMode ? "catalog-profile-dark" : "catalog-profile-light"}`} style={{ backgroundColor: palette.page, color: palette.text, backgroundImage: `url("${themeBackground}")`, backgroundPosition: "center top", backgroundSize: "cover", backgroundAttachment: "fixed" }}>
      <header className="sticky top-0 z-30 -mx-4 mb-7 border-b backdrop-blur-xl" style={{ borderColor: palette.border, backgroundColor: darkMode ? "rgba(25,21,33,0.95)" : "rgba(255,255,255,0.95)" }}>
        <div className="relative mx-auto flex h-[144px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" aria-label="CAT-ALOG ana sayfa" className="relative flex h-full w-[120px] shrink-0 items-center transition hover:opacity-80">
            <Image src={darkMode ? "/images/brand/logo1.png" : "/images/brand/logo2.png"} alt="CAT-ALOG" width={240} height={240} priority className="absolute left-1/2 top-1/2 h-[240px] w-[240px] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain" />
          </Link>
          <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
            <Link href="/profil" className="hidden rounded-xl border px-4 py-3 text-sm font-bold transition hover:opacity-80 sm:inline-flex" style={{ borderColor: palette.border, color: palette.text }}>← Profile dön</Link>
            <button type="button" onClick={toggleTheme} aria-label={darkMode ? "Gündüz temasına geç" : "Gece temasına geç"} title={darkMode ? "Gündüz teması" : "Gece teması"} className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl transition hover:scale-105">
              <Image src={darkMode ? "/images/icons/gece.png" : "/images/icons/gündüz.png"} alt={darkMode ? "Gece teması" : "Gündüz teması"} width={43} height={43} className="h-[43px] w-[43px] object-contain" />
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-2xl">

        <Link
          href="/profil"
          className="text-sm font-semibold text-[#75658E] hover:text-[#503B70]"
        >
          ← Profile dön
        </Link>

        <section className="mt-6 rounded-3xl border p-5 shadow-sm sm:p-8" style={{ borderColor: palette.border, backgroundColor: palette.card }}>
          <h1 className="text-2xl font-black text-[#352747] sm:text-3xl">
            Profilini düzenle
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#777080]">
            Profil bilgilerini güncelleyebilir, fotoğraf ekleyebilir veya
            mevcut fotoğrafını kaldırabilirsin.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
            >
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-6">
            <div>
              <label className="mb-3 block text-sm font-bold text-[#49385F]">
                Profil fotoğrafı
              </label>

              <div className="flex flex-wrap items-center gap-5">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border" style={{ borderColor: palette.border, backgroundColor: palette.soft }}>
                  {photoPreview ? (
                    <img src={photoPreview} alt="Profil fotoğrafı önizlemesi" className="h-full w-full object-cover" />
                  ) : (
                    <Image src={darkMode ? "/images/icons/user%20ikonu.png" : "/images/icons/user%20ikonu2.png"} alt="Profil fotoğrafı yok" width={96} height={96} className="h-full w-full object-contain p-2" />
                  )}
                </div>

                <div className="flex flex-col items-start gap-3">
                  <label className="cursor-pointer rounded-xl border border-[#E3D7F0] px-4 py-2.5 text-sm font-bold text-[#624B82] transition hover:bg-[#F8F5FC]">
                    Fotoğraf seç
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>

                  {(photoPreview || form.avatar_url) && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="text-sm font-semibold text-red-600 hover:text-red-800"
                    >
                      Fotoğrafı kaldır
                    </button>
                  )}

                  <p className="text-xs text-[#777080]">
                    Görsel dosyası, en fazla 5 MB.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="display_name"
                className="mb-2 block text-sm font-bold text-[#49385F]"
              >
                Profil adı *
              </label>
              <input
                id="display_name"
                name="display_name"
                value={form.display_name}
                onChange={handleChange}
                required
                maxLength={60}
                placeholder="Adın veya kullanmak istediğin isim"
                className="w-full rounded-xl border border-[#DED2EB] bg-white px-4 py-3 text-sm text-[#352747] outline-none transition focus:border-[#8B70B0] focus:ring-2 focus:ring-[#EDE5F5]"
              />
            </div>

            <div>
              <label
                htmlFor="age"
                className="mb-2 block text-sm font-bold text-[#49385F]"
              >
                Yaş
              </label>
              <input
                id="age"
                name="age"
                type="number"
                min={18}
                max={120}
                step={1}
                value={form.age}
                onChange={handleChange}
                placeholder="Yaşın"
                className="w-full rounded-xl border border-[#DED2EB] bg-white px-4 py-3 text-sm text-[#352747] outline-none transition focus:border-[#8B70B0] focus:ring-2 focus:ring-[#EDE5F5]"
              />
              <p className="mt-1 text-xs text-[#777080]">
                İstersen boş bırakabilirsin.
              </p>
            </div>

            <div>
              <label
                htmlFor="city"
                className="mb-2 block text-sm font-bold text-[#49385F]"
              >
                Şehir
              </label>
              <input
                id="city"
                name="city"
                value={form.city}
                onChange={handleChange}
                maxLength={80}
                placeholder="Örn. Bursa"
                className="w-full rounded-xl border border-[#DED2EB] bg-white px-4 py-3 text-sm text-[#352747] outline-none transition focus:border-[#8B70B0] focus:ring-2 focus:ring-[#EDE5F5]"
              />
            </div>

            <div>
              <label
                htmlFor="bio"
                className="mb-2 block text-sm font-bold text-[#49385F]"
              >
                Hakkımda
              </label>
              <textarea
                id="bio"
                name="bio"
                value={form.bio}
                onChange={handleChange}
                maxLength={1000}
                rows={5}
                placeholder="Kendinden ve kedilerle olan deneyiminden bahset..."
                className="w-full resize-y rounded-xl border border-[#DED2EB] bg-white px-4 py-3 text-sm leading-6 text-[#352747] outline-none transition focus:border-[#8B70B0] focus:ring-2 focus:ring-[#EDE5F5]"
              />
              <p className="mt-1 text-right text-xs text-[#777080]">
                {form.bio.length}/1000
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="cat_count"
                  className="mb-2 block text-sm font-bold text-[#49385F]"
                >
                  Sahip olduğun kedi sayısı
                </label>
                <input
                  id="cat_count"
                  name="cat_count"
                  type="number"
                  min={0}
                  max={1000}
                  step={1}
                  value={form.cat_count}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-[#DED2EB] bg-white px-4 py-3 text-sm text-[#352747] outline-none transition focus:border-[#8B70B0] focus:ring-2 focus:ring-[#EDE5F5]"
                />
              </div>

              <div>
                <label
                  htmlFor="cat_years"
                  className="mb-2 block text-sm font-bold text-[#49385F]"
                >
                  Kedi bakım deneyimin (yıl)
                </label>
                <input
                  id="cat_years"
                  name="cat_years"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={form.cat_years}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-[#DED2EB] bg-white px-4 py-3 text-sm text-[#352747] outline-none transition focus:border-[#8B70B0] focus:ring-2 focus:ring-[#EDE5F5]"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[#F0EAF6] pt-6 sm:flex-row sm:justify-end">
              <Link
                href="/profil"
                className="inline-flex items-center justify-center rounded-xl border border-[#E3D7F0] px-5 py-3 text-sm font-bold text-[#624B82] transition hover:bg-[#F8F5FC]"
              >
                Vazgeç
              </Link>

              <button
                type="submit"
                disabled={saving || uploading}
                className="inline-flex items-center justify-center rounded-xl bg-[#624B82] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#503B70] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading
                  ? "Fotoğraf yükleniyor..."
                  : saving
                    ? "Kaydediliyor..."
                    : "Değişiklikleri kaydet"}
              </button>
            </div>
          </form>
        </section>
      </div>
      <style jsx global>{`
        .catalog-profile-form .text-[#352747], .catalog-profile-form .text-[#49385F] { color: ${darkMode ? "#F5EFFB" : "#49385F"} !important; }
        .catalog-profile-form .text-[#777080] { color: ${darkMode ? "#B8AEC6" : "#777080"} !important; }
        .catalog-profile-form .text-[#624B82], .catalog-profile-form .text-[#75658E] { color: ${darkMode ? "#D9C9F0" : "#624B82"} !important; }
        .catalog-profile-form .bg-white { background-color: ${darkMode ? "rgba(32,27,41,0.94)" : "#FFFFFF"} !important; }
        .catalog-profile-form input, .catalog-profile-form textarea { background-color: ${darkMode ? "#191521" : "#FFFFFF"}; color: ${darkMode ? "#F5EFFB" : "#302542"}; border-color: ${darkMode ? "rgba(255,255,255,0.16)" : "#DED2EB"}; }
        .catalog-profile-form input::placeholder, .catalog-profile-form textarea::placeholder { color: ${darkMode ? "#9185A1" : "#93899E"}; }
        .catalog-profile-form .border-t { border-color: ${darkMode ? "rgba(255,255,255,0.12)" : "#F0EAF6"}; }
      `}</style>
    </main>
  );
}
