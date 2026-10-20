"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

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

  async function handleSignup(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
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
        if (
          error.message.toLowerCase().includes("already registered")
        ) {
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

      setMessage(
        "Hesabın oluşturuldu ve profil bilgilerin kaydedildi."
      );
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

  return (
    <main className="min-h-screen bg-[#F7F5FC] px-4 py-10 text-[#30264A]">
      <div className="mx-auto w-full max-w-2xl">
        <a
          href="/"
          className="text-sm font-semibold text-[#9B78BF]"
        >
          ← CAT-ALOG ana sayfa
        </a>

        <section className="mt-5 rounded-3xl border border-[#EEE9F8] bg-white p-6 shadow-sm sm:p-8">
          <div className="text-center text-4xl">🐈</div>

          <h1 className="mt-3 text-center text-2xl font-extrabold">
            CAT-ALOG'a üye ol
          </h1>

          <p className="mt-2 text-center text-sm text-[#85818F]">
            Kedi severler için kendi profilini oluştur.
          </p>

          <form
            onSubmit={handleSignup}
            className="mt-7 grid gap-5 sm:grid-cols-2"
          >
            <label className="text-sm font-semibold">
              Ad soyad
              <input
                required
                maxLength={100}
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[#EAE4F4] px-3 py-3 font-normal outline-none focus:border-[#B9A5E5]"
                placeholder="Adın ve soyadın"
              />
            </label>

            <label className="text-sm font-semibold">
              Yaş
              <input
                required
                type="number"
                min="13"
                max="120"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[#EAE4F4] px-3 py-3 font-normal outline-none focus:border-[#B9A5E5]"
              />
            </label>

            <label className="text-sm font-semibold">
              Yaşadığın şehir
              <select
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[#EAE4F4] bg-white px-3 py-3 font-normal outline-none focus:border-[#B9A5E5]"
              >
                <option value="">İl seç</option>
                {cities.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-semibold">
              Kaç kedin var?
              <input
                required
                type="number"
                min="0"
                max="100"
                value={catCount}
                onChange={(e) => setCatCount(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[#EAE4F4] px-3 py-3 font-normal outline-none focus:border-[#B9A5E5]"
              />
            </label>

            <label className="text-sm font-semibold">
              Kaç yıldır kedi sahibisin?
              <input
                required
                type="number"
                min="0"
                max="100"
                value={catYears}
                onChange={(e) => setCatYears(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[#EAE4F4] px-3 py-3 font-normal outline-none focus:border-[#B9A5E5]"
              />
            </label>

            <label className="text-sm font-semibold">
              Profil fotoğrafı
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
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
              <span className="mt-1 block text-xs font-normal text-[#85818F]">
                JPG, PNG veya WebP · En fazla 5 MB
              </span>
              {photo && (
                <span className="mt-1 block text-xs font-normal text-[#85818F]">
                  Seçilen: {photo.name}
                </span>
              )}
              <span className="mt-1 block text-xs font-normal text-[#85818F]">
                Fotoğraf yüklemesi sonraki adımda etkinleştirilecek.
              </span>
            </label>

            <label className="text-sm font-semibold sm:col-span-2">
              E-posta
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[#EAE4F4] px-3 py-3 font-normal outline-none focus:border-[#B9A5E5]"
                placeholder="ornek@mail.com"
              />
            </label>

            <label className="text-sm font-semibold sm:col-span-2">
              Şifre
              <input
                required
                type="password"
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[#EAE4F4] px-3 py-3 font-normal outline-none focus:border-[#B9A5E5]"
                placeholder="En az 8 karakter"
              />
            </label>

            {errorMessage && (
              <p
                role="alert"
                className="text-sm text-red-600 sm:col-span-2"
              >
                {errorMessage}
              </p>
            )}

            {message && (
              <p
                role="status"
                className="text-sm text-green-700 sm:col-span-2"
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-[#30264A] px-4 py-3.5 font-semibold text-white transition hover:bg-[#51416E] disabled:opacity-50 sm:col-span-2"
            >
              {loading ? "Hesap oluşturuluyor..." : "Üye ol"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-[#85818F]">
            Zaten hesabın var mı?{" "}
            <a
              href="/giris"
              className="font-semibold text-[#9B78BF]"
            >
              Giriş yap
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}