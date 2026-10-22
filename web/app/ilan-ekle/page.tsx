
"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/components/ThemeProvider";

const catBreeds = [
  "Ankara Kedisi",
  "Van Kedisi",
  "Tekir",
  "Melez",
  "British Shorthair",
  "British Longhair",
  "Scottish Fold",
  "Scottish Straight",
  "İran Kedisi",
  "Siyam Kedisi",
  "Sfenks",
  "Maine Coon",
  "Ragdoll",
  "Bengal",
  "Rus Mavisi",
  "Norveç Orman Kedisi",
  "Sibirya Kedisi",
  "Abyssinian (Habeş Kedisi)",
  "American Shorthair",
  "American Curl",
  "Burmese",
  "Bombay",
  "Birman",
  "Devon Rex",
  "Cornish Rex",
  "Exotic Shorthair",
  "Himalayan",
  "Oriental Shorthair",
  "Savannah",
  "Turkish Angora",
  "Turkish Van",
  "Diğer",
];

const MAX_PHOTOS = 8;
const MIN_PHOTOS = 2;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function IlanEklePage() {
  const { darkMode, toggleTheme, themeReady } = useTheme();

  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [color, setColor] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [pedigree, setPedigree] = useState("");
  const [allowPhoneCalls, setAllowPhoneCalls] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");


  const pageStyle = {
    minHeight: "100vh",
    backgroundImage: `url("${
      darkMode ? "images/brand/arkaplan1.png" : "images/brand/arkaplan2.png"
    }")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
    backgroundRepeat: "no-repeat",
    color: darkMode ? "#f8f5ff" : "#30264b",
    transition: "color 0.25s ease",
  } as const;

  const cardStyle = {
    backgroundColor: darkMode
      ? "rgba(24, 19, 48, 0.88)"
      : "rgba(255, 253, 255, 0.91)",
    border: `1px solid ${
      darkMode ? "rgba(221, 205, 255, 0.22)" : "rgba(116, 88, 157, 0.2)"
    }`,
    boxShadow: darkMode
      ? "0 18px 55px rgba(0, 0, 0, 0.24)"
      : "0 18px 55px rgba(64, 42, 91, 0.12)",
    backdropFilter: "blur(12px)",
  } as const;

  const inputStyle = {
    backgroundColor: darkMode
      ? "rgba(255, 255, 255, 0.07)"
      : "rgba(255, 255, 255, 0.82)",
    color: darkMode ? "#fff" : "#30264b",
    border: `1px solid ${
      darkMode ? "rgba(221, 205, 255, 0.25)" : "rgba(116, 88, 157, 0.28)"
    }`,
  } as const;

  const mutedColor = darkMode ? "#c5badc" : "#756887";
  const accentColor = darkMode ? "#e4b8ff" : "#8056b5";

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    setError("");
    setMessage("");

    const selectedFiles = Array.from(event.target.files ?? []);

    if (selectedFiles.length === 0) return;

    if (photos.length + selectedFiles.length > MAX_PHOTOS) {
      setError(`Bir ilana en fazla ${MAX_PHOTOS} fotoğraf ekleyebilirsin.`);
      event.target.value = "";
      return;
    }

    const invalidType = selectedFiles.find(
      (file) => !ALLOWED_TYPES.includes(file.type)
    );

    if (invalidType) {
      setError("Fotoğraflar JPG, PNG veya WebP formatında olmalı.");
      event.target.value = "";
      return;
    }

    const oversizedFile = selectedFiles.find(
      (file) => file.size > MAX_FILE_SIZE
    );

    if (oversizedFile) {
      setError("Her fotoğrafın boyutu en fazla 5 MB olabilir.");
      event.target.value = "";
      return;
    }

    setPhotos((current) => [...current, ...selectedFiles]);
    event.target.value = "";
  }

  function removePhoto(index: number) {
    setPhotos((current) => current.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!name.trim() || !breed || !age || !gender || !color.trim() || !city.trim()) {
      setError("Lütfen zorunlu alanların tamamını doldur.");
      return;
    }

    const parsedAge = Number(age);

    if (!Number.isFinite(parsedAge) || parsedAge < 0 || parsedAge > 100) {
      setError("Lütfen geçerli bir yaş gir.");
      return;
    }

    if (pedigree !== "true" && pedigree !== "false") {
      setError("Lütfen şecere durumunu seç.");
      return;
    }

    if (allowPhoneCalls !== "true" && allowPhoneCalls !== "false") {
      setError("Lütfen telefonla aranma tercihini seç.");
      return;
    }

    if (allowPhoneCalls === "true" && !phone.trim()) {
      setError("Telefonla aranma izni verdiğin için telefon numaranı girmelisin.");
      return;
    }

    if (photos.length < MIN_PHOTOS || photos.length > MAX_PHOTOS) {
      setError(`İlanına en az ${MIN_PHOTOS}, en fazla ${MAX_PHOTOS} fotoğraf eklemelisin.`);
      return;
    }

    setLoading(true);

    const uploadedPaths: string[] = [];

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setError("İlan oluşturmak için önce giriş yapmalısın.");
        return;
      }

      const photoUrls: string[] = [];

      for (let i = 0; i < photos.length; i++) {
        const file = photos[i];
        const safeName = file.name
          .normalize("NFKD")
          .replace(/[^a-zA-Z0-9._-]/g, "_");

        const filePath = `${user.id}/${Date.now()}-${i}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("cat-photos")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          });

        if (uploadError) {
          throw new Error(`Fotoğraf yüklenemedi: ${uploadError.message}`);
        }

        uploadedPaths.push(filePath);

        const { data: publicUrlData } = supabase.storage
          .from("cat-photos")
          .getPublicUrl(filePath);

        photoUrls.push(publicUrlData.publicUrl);
      }

      const { error: insertError } = await supabase.from("cats").insert({
        owner_id: user.id,
        name: name.trim(),
        breed,
        age_years: parsedAge,
        gender,
        color: color.trim(),
        city: city.trim(),
        description: description.trim(),
        photo_urls: photoUrls,
        pedigree: pedigree === "true",
        allow_phone_calls: allowPhoneCalls === "true",
        phone: allowPhoneCalls === "true" ? phone.trim() : null,
        is_active: true,
      });

      if (insertError) {
        throw new Error(`İlan kaydedilemedi: ${insertError.message}`);
      }

      setMessage("İlanın başarıyla oluşturuldu!");
      setName("");
      setBreed("");
      setAge("");
      setGender("");
      setColor("");
      setCity("");
      setDescription("");
      setPhone("");
      setPedigree("");
      setAllowPhoneCalls("");
      setPhotos([]);
    } catch (caughtError) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from("cat-photos").remove(uploadedPaths);
      }

      const errorText =
        caughtError instanceof Error
          ? caughtError.message
          : "Beklenmeyen bir hata oluştu.";

      setError(errorText);
    } finally {
      setLoading(false);
    }
  }

  const labelClass = "mb-2 block text-sm font-semibold";
  const fieldClass =
    "w-full rounded-xl px-4 py-3 outline-none transition focus:ring-2 focus:ring-purple-400";
  const sectionClass = "space-y-2";

  if (!themeReady) {
    return <main className="min-h-screen" aria-label="Tema yükleniyor" />;
  }

  return (
    <main style={pageStyle} className="relative px-4 py-8 sm:px-6 sm:py-12">
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundColor: darkMode
            ? "rgba(13, 9, 29, 0.24)"
            : "rgba(248, 243, 255, 0.2)",
        }}
      />

      <div className="relative mx-auto max-w-3xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <a href="/" className="flex items-center justify-start">
  <img
    src={darkMode ? "/images/brand/logo1.png" : "/images/brand/logo2.png"}
    alt="CAT-ALOG"
    className="h-auto w-64 max-w-full object-contain sm:w-80"
  />
</a>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition hover:scale-[1.02]"
            style={{
              backgroundColor: darkMode
                ? "rgba(239, 219, 255, 0.14)"
                : "rgba(105, 76, 145, 0.1)",
              border: `1px solid ${
                darkMode
                  ? "rgba(239, 219, 255, 0.22)"
                  : "rgba(105, 76, 145, 0.2)"
              }`,
            }}
            aria-label={darkMode ? "Açık temaya geç" : "Koyu temaya geç"}
          >
            {darkMode ? (
              <>
                <img
                  src="/images/icons/gündüz.png"
                  alt=""
                  width={19}
                  height={19}
                  className="h-[19px] w-[19px] object-contain"
                  aria-hidden="true"
                />
                Açık tema
              </>
            ) : (
              <>
                <img
                  src="/images/icons/gece.png"
                  alt=""
                  width={19}
                  height={19}
                  className="h-[19px] w-[19px] object-contain"
                  aria-hidden="true"
                />
                Koyu tema
              </>
            )}
          </button>
        </header>

        <section
          className="rounded-3xl p-5 sm:p-8"
          style={cardStyle}
        >
          <div className="mb-7">
            <p
              className="mb-2 text-xs font-bold uppercase tracking-[0.2em]"
              style={{ color: accentColor }}
            >
              CAT-ALOG İLANLARI
            </p>
            <h2 className="text-2xl font-black sm:text-3xl">
              Kedini tanıt
            </h2>
            <p className="mt-2 text-sm leading-6" style={{ color: mutedColor }}>
              Kedinin bilgilerini gir, fotoğraflarını ekle ve ilanını oluştur.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          {message && (
            <div
              role="status"
              className="mb-5 rounded-xl border border-green-400/40 bg-green-500/10 px-4 py-3 text-sm"
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className={sectionClass}>
              <label className={labelClass} htmlFor="cat-name">
                İlan başlığı / Kedi adı *
              </label>
              <input
                id="cat-name"
                className={fieldClass}
                style={inputStyle}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn. Pamuk için yeni bir yuva"
                maxLength={100}
                required
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className={sectionClass}>
                <label className={labelClass} htmlFor="breed">
                  Kedi türü *
                </label>
                <select
                  id="breed"
                  className={fieldClass}
                  style={inputStyle}
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  required
                >
                  <option value="">Tür seç</option>
                  {catBreeds.map((catBreed) => (
                    <option key={catBreed} value={catBreed}>
                      {catBreed}
                    </option>
                  ))}
                </select>
              </div>

              <div className={sectionClass}>
                <label className={labelClass} htmlFor="age">
                  Yaş (yıl) *
                </label>
                <input
                  id="age"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className={fieldClass}
                  style={inputStyle}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="Örn. 2"
                  required
                />
              </div>

              <div className={sectionClass}>
                <label className={labelClass} htmlFor="gender">
                  Cinsiyet *
                </label>
                <select
                  id="gender"
                  className={fieldClass}
                  style={inputStyle}
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  required
                >
                  <option value="">Cinsiyet seç</option>
                  <option value="Erkek">Erkek</option>
                  <option value="Dişi">Dişi</option>
                </select>
              </div>

              <div className={sectionClass}>
                <label className={labelClass} htmlFor="color">
                  Renk *
                </label>
                <input
                  id="color"
                  className={fieldClass}
                  style={inputStyle}
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="Örn. Gri-beyaz"
                  maxLength={60}
                  required
                />
              </div>

              <div className={sectionClass + " sm:col-span-2"}>
                <label className={labelClass} htmlFor="city">
                  Şehir / İlçe *
                </label>
                <input
                  id="city"
                  className={fieldClass}
                  style={inputStyle}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Örn. Bursa, Nilüfer"
                  maxLength={100}
                  required
                />
                <p className="text-xs" style={{ color: mutedColor }}>
                  Güvenliğin için ilanında açık adres paylaşma.
                </p>
              </div>
            </div>

            <div className={sectionClass}>
              <label className={labelClass} htmlFor="description">
                Açıklama
              </label>
              <textarea
                id="description"
                className={fieldClass + " min-h-32 resize-y"}
                style={inputStyle}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Kedinin karakteri, alışkanlıkları ve diğer bilgiler..."
                maxLength={3000}
                rows={5}
              />
              <p className="text-right text-xs" style={{ color: mutedColor }}>
                {description.length}/3000
              </p>
            </div>

            <div className={sectionClass}>
              <span className={labelClass}>Şecere durumu *</span>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { value: "true", label: "Şeceresi var" },
                  { value: "false", label: "Şeceresi yok" },
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3"
                    style={{
                      ...inputStyle,
                      borderColor:
                        pedigree === option.value ? accentColor : inputStyle.border.split(" ").at(-1),
                    }}
                  >
                    <input
                      type="radio"
                      name="pedigree"
                      value={option.value}
                      checked={pedigree === option.value}
                      onChange={(e) => setPedigree(e.target.value)}
                      className="accent-purple-500"
                      required
                    />
                    <span className="text-sm font-medium">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className={sectionClass}>
              <span className={labelClass}>
                Telefonla aranmayı kabul ediyor musun? *
              </span>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { value: "true", label: "İzin veriyorum" },
                  { value: "false", label: "İzin vermiyorum" },
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3"
                    style={{
                      ...inputStyle,
                      borderColor:
                        allowPhoneCalls === option.value
                          ? accentColor
                          : undefined,
                    }}
                  >
                    <input
                      type="radio"
                      name="allow-phone-calls"
                      value={option.value}
                      checked={allowPhoneCalls === option.value}
                      onChange={(e) => setAllowPhoneCalls(e.target.value)}
                      className="accent-purple-500"
                      required
                    />
                    <span className="text-sm font-medium">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {allowPhoneCalls === "true" && (
              <div className={sectionClass}>
                <label className={labelClass} htmlFor="phone">
                  Telefon numarası *
                </label>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  className={fieldClass}
                  style={inputStyle}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05XX XXX XX XX"
                  maxLength={20}
                  required
                />
                <p className="text-xs" style={{ color: mutedColor }}>
                  Telefon numaran, yalnızca telefonla aranma izni verdiğinde
                  ilana kaydedilir.
                </p>
              </div>
            )}

            <div className={sectionClass}>
              <div className="flex items-center justify-between gap-3">
                <label className={labelClass} htmlFor="photos">
                  Kedi fotoğrafları *
                </label>
                <span
                  className="rounded-full px-3 py-1 text-xs font-bold"
                  style={{
                    backgroundColor: darkMode
                      ? "rgba(226, 190, 255, 0.14)"
                      : "rgba(176, 139, 221, 0.16)",
                    color: accentColor,
                  }}
                >
                  {photos.length}/{MAX_PHOTOS}
                </span>
              </div>

              <p className="mb-3 text-sm" style={{ color: mutedColor }}>
                En az 2, en fazla 8 fotoğraf. JPG, PNG veya WebP; her biri en
                fazla 5 MB.
              </p>

              <label
                htmlFor="photos"
                className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-8 text-center transition hover:opacity-80"
                style={{
                  borderColor: darkMode
                    ? "rgba(226, 190, 255, 0.38)"
                    : "rgba(128, 86, 181, 0.4)",
                  backgroundColor: darkMode
                    ? "rgba(255, 255, 255, 0.035)"
                    : "rgba(255, 255, 255, 0.45)",
                }}
              >
                <svg
                  viewBox="0 0 48 48"
                  width="38"
                  height="38"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: accentColor }}
                  aria-hidden="true"
                >
                  <rect x="5" y="8" width="38" height="32" rx="5" />
                  <circle cx="17" cy="19" r="3" />
                  <path d="m7 34 11-10 7 7 6-6 10 10" />
                  <path d="M24 2v10m-4-6 4-4 4 4" />
                </svg>
                <span className="mt-3 font-semibold">
                  Fotoğraf seçmek için tıkla
                </span>
                <span className="mt-1 text-xs" style={{ color: mutedColor }}>
                  Birden fazla fotoğraf seçebilirsin.
                </span>
                <input
                  id="photos"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handlePhotoChange}
                  className="sr-only"
                />
              </label>

              {photos.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {photos.map((photo, index) => (
                    <li
                      key={`${photo.name}-${photo.lastModified}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-xl px-3 py-2"
                      style={{
                        backgroundColor: darkMode
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(255,255,255,0.65)",
                      }}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {photo.name}
                        </p>
                        <p className="text-xs" style={{ color: mutedColor }}>
                          {(photo.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold"
                        style={{ color: darkMode ? "#ffb6c9" : "#a33b65" }}
                        aria-label={`${photo.name} fotoğrafını kaldır`}
                      >
                        Kaldır
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-4 font-bold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                background: darkMode
                  ? "linear-gradient(135deg, #d7a5ff, #f1b8dc)"
                  : "linear-gradient(135deg, #b995e8, #e9a9d0)",
                color: "#30203f",
              }}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin"
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeWidth="3"
                      opacity=".25"
                    />
                    <path
                      d="M21 12a9 9 0 0 0-9-9"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                  İlan oluşturuluyor...
                </>
              ) : (
                "İlanı oluştur"
              )}
            </button>

            <p
              className="text-center text-xs leading-5"
              style={{ color: mutedColor }}
            >
              İlanı oluşturarak girdiğin bilgilerin yayınlanmasını kabul etmiş
              olursun. Telefonla aranma tercihini dilediğin gibi seçebilirsin.
            </p>
          </form>
        </section>

        <footer
          className="py-6 text-center text-xs"
          style={{ color: darkMode ? "#d1c5e3" : "#756887" }}
        >
          CAT-ALOG · Kediler için ilan platformu
        </footer>
      </div>
    </main>
  );
}
