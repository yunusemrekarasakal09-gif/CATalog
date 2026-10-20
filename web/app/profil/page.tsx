
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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

  const [profile, setProfile] = useState<Profile | null>(null);
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FBF9FE] px-4 py-12">
        <div className="mx-auto max-w-4xl text-center text-[#655A76]">
          Profil yükleniyor...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FBF9FE] px-4 py-8 sm:py-12">
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
                <span aria-label="Varsayılan profil simgesi">🐱</span>
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
              <div className="text-4xl">🐈</div>
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
                  <Link href={`/kediler/${cat.id}`} className="block">
                    <div className="aspect-[4/3] overflow-hidden bg-[#F3ECFA]">
                      {cat.photo_urls?.[0] ? (
                        <img
                          src={cat.photo_urls[0]}
                          alt={cat.name}
                          className="h-full w-full object-cover transition duration-300 hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-6xl">
                          🐱
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
    </main>
  );
}
