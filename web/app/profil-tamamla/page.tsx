
"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FBF9FE] px-4 py-12">
        <p className="text-center text-[#655A76]">
          Profil bilgileri yükleniyor...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FBF9FE] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/profil"
          className="text-sm font-semibold text-[#75658E] hover:text-[#503B70]"
        >
          ← Profile dön
        </Link>

        <section className="mt-6 rounded-3xl border border-[#EDE5F5] bg-white p-5 shadow-sm sm:p-8">
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
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-[#EDE5F5] bg-[#F3ECFA] text-4xl">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Profil fotoğrafı önizlemesi"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>🐱</span>
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
    </main>
  );
}
