
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Cat = {
  id: string;
  owner_id: string;
  name: string;
  breed: string | null;
  age_years: number | null;
  gender: string | null;
  city: string | null;
  color: string | null;
  photo_urls: string[] | null;
  description: string | null;
  created_at: string | null;
};

type OwnerProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  city: string | null;
};

export default function KediDetayPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const catId = params.id;

  const [cat, setCat] = useState<Cat | null>(null);
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCat() {
      setLoading(true);
      setError("");

      const { data, error: catError } = await supabase
        .from("cats")
        .select(
          "id, owner_id, name, breed, age_years, gender, city, color, photo_urls, description, created_at"
        )
        .eq("id", catId)
        .eq("is_active", true)
        .maybeSingle();

      if (cancelled) return;

      if (catError || !data) {
        setError(
          catError
            ? "İlan yüklenemedi. Lütfen tekrar dene."
            : "Bu ilan bulunamadı veya artık yayında değil."
        );
        setLoading(false);
        return;
      }

      const catData = data as Cat;
      setCat(catData);

      if (catData.owner_id) {
        const { data: ownerData, error: ownerError } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url, city")
          .eq("id", catData.owner_id)
          .maybeSingle();

        if (cancelled) return;

        if (ownerError) {
          console.error("İlan sahibi yüklenemedi:", ownerError);
        }

        setOwner((ownerData as OwnerProfile | null) ?? null);
      }

      setLoading(false);
    }

    void loadCat();

    return () => {
      cancelled = true;
    };
  }, [catId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7F5FC] px-4 py-16">
        <p className="text-center text-[#655A76]">
          Kedi ilanı yükleniyor...
        </p>
      </main>
    );
  }

  if (error || !cat) {
    return (
      <main className="min-h-screen bg-[#F7F5FC] px-4 py-16">
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-sm">
          <p className="text-4xl">🐈</p>
          <h1 className="mt-4 text-xl font-black text-[#30264A]">
            İlan açılamadı
          </h1>
          <p className="mt-2 text-sm text-[#777080]">
            {error || "Aradığın ilan bulunamadı."}
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-xl bg-[#30264A] px-5 py-3 text-sm font-bold text-white"
          >
            İlanlara dön
          </Link>
        </div>
      </main>
    );
  }

  const photos = (cat.photo_urls ?? []).filter(Boolean);
  const activePhoto = photos[selectedPhoto];

  return (
    <main className="min-h-screen bg-[#F7F5FC] text-[#30264A]">
      <header className="border-b border-[#EEE9F8] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
          <Link href="/" className="text-xl font-black tracking-tight">
            🐈 CAT-<span className="text-[#A184D5]">ALOG</span>
          </Link>

          <Link
            href="/"
            className="rounded-xl px-3 py-2 text-sm font-semibold text-[#655A76] hover:bg-[#F7F5FC]"
          >
            ← İlanlara dön
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
          <section className="min-w-0 overflow-hidden rounded-3xl border border-[#EEE9F8] bg-white shadow-sm">
            <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br from-[#F0E7FA] to-[#FBE9EF]">
              {activePhoto ? (
                <img
                  src={activePhoto}
                  alt={`${cat.name} fotoğrafı ${selectedPhoto + 1}`}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-8xl">🐈</span>
              )}
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-4 gap-2 p-3 sm:grid-cols-5 sm:p-4">
                {photos.map((photo, index) => (
                  <button
                    key={`${photo}-${index}`}
                    type="button"
                    onClick={() => setSelectedPhoto(index)}
                    aria-label={`${index + 1}. fotoğrafı göster`}
                    aria-pressed={selectedPhoto === index}
                    className={`aspect-square overflow-hidden rounded-xl border-2 ${
                      selectedPhoto === index
                        ? "border-[#9270C4]"
                        : "border-transparent"
                    }`}
                  >
                    <img
                      src={photo}
                      alt={`${cat.name} küçük fotoğraf ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            <div className="p-5 sm:p-7">
              <p className="text-sm font-semibold text-[#A184D5]">
                KEDİ İLANI
              </p>

              <h1 className="mt-2 break-words text-3xl font-black sm:text-4xl">
                {cat.name}
              </h1>

              <p className="mt-2 text-sm text-[#777080]">
                📍 {cat.city || "Şehir belirtilmemiş"}
              </p>

              <div className="mt-6">
                <h2 className="text-lg font-black">Kedi hakkında</h2>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[#655A76]">
                  {cat.description?.trim() ||
                    "Bu kedi için henüz bir açıklama eklenmemiş."}
                </p>
              </div>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-[#EEE9F8] bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-xl font-black">Özellikler</h2>

              <dl className="mt-4 divide-y divide-[#F0EAF6]">
                <div className="flex items-start justify-between gap-4 py-3">
                  <dt className="text-sm text-[#777080]">Cinsi</dt>
                  <dd className="text-right text-sm font-bold">
                    {cat.breed || "Belirtilmemiş"}
                  </dd>
                </div>

                <div className="flex items-start justify-between gap-4 py-3">
                  <dt className="text-sm text-[#777080]">Yaşı</dt>
                  <dd className="text-right text-sm font-bold">
                    {cat.age_years == null
                      ? "Belirtilmemiş"
                      : `${cat.age_years} yaş`}
                  </dd>
                </div>

                <div className="flex items-start justify-between gap-4 py-3">
                  <dt className="text-sm text-[#777080]">Cinsiyet</dt>
                  <dd className="text-right text-sm font-bold">
                    {cat.gender || "Belirtilmemiş"}
                  </dd>
                </div>

                <div className="flex items-start justify-between gap-4 py-3">
                  <dt className="text-sm text-[#777080]">Rengi</dt>
                  <dd className="text-right text-sm font-bold">
                    {cat.color || "Belirtilmemiş"}
                  </dd>
                </div>

                <div className="flex items-start justify-between gap-4 py-3">
                  <dt className="text-sm text-[#777080]">Şehir</dt>
                  <dd className="text-right text-sm font-bold">
                    {cat.city || "Belirtilmemiş"}
                  </dd>
                </div>

                {cat.created_at && (
                  <div className="flex items-start justify-between gap-4 py-3">
                    <dt className="text-sm text-[#777080]">İlan tarihi</dt>
                    <dd className="text-right text-sm font-bold">
                      {new Date(cat.created_at).toLocaleDateString("tr-TR")}
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            <section className="rounded-3xl border border-[#EEE9F8] bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-black">İlan sahibi</h2>

              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F0E7FA] text-2xl">
                  {owner?.avatar_url ? (
                    <img
                      src={owner.avatar_url}
                      alt="İlan sahibinin profil fotoğrafı"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>👤</span>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="break-words font-bold">
                    {owner?.display_name || "CAT-ALOG kullanıcısı"}
                  </p>
                  <p className="mt-1 text-sm text-[#777080]">
                    📍 {owner?.city || cat.city || "Şehir belirtilmemiş"}
                  </p>
                </div>
              </div>

              <Link
                href={`/profil/${cat.owner_id}`}
                className="mt-5 flex w-full items-center justify-center rounded-xl border border-[#E3D7F0] px-4 py-3 text-sm font-bold text-[#624B82] transition hover:bg-[#F8F5FC]"
              >
                Profili görüntüle
              </Link>

              <button
                type="button"
                onClick={() => {
                  const query = new URLSearchParams({
                    user: cat.owner_id,
                    cat: cat.id,
                  });

                  router.push(`/mesajlar?${query.toString()}`);
                }}
                className="mt-3 flex w-full items-center justify-center rounded-xl bg-[#30264A] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#51416E]"
              >
                ✉️ Mesaj gönder
              </button>

              <p className="mt-3 text-xs leading-5 text-[#85818F]">
                Mesajlaşmak için hesabına giriş yapman gerekebilir.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
