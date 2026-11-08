
"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
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


const catColors = [
  "Beyaz",
  "Siyah",
  "Gri",
  "Mavi",
  "Krem",
  "Sarı",
  "Turuncu",
  "Kahverengi",
  "Çikolata",
  "Tarçın",
  "Kızıl",
  "Tekir",
  "Gümüş",
  "Duman",
  "Alacalı",
  "Üç renkli",
  "Siyah-beyaz",
  "Gri-beyaz",
  "Sarı-beyaz",
  "Turuncu-beyaz",
  "Kahverengi-beyaz",
  "Diğer",
];

const catAges = [
  { value: "0", label: "Yeni doğmuş" },
  { value: "0.25", label: "3 aylık" },
  { value: "0.5", label: "6 aylık" },
  { value: "0.75", label: "9 aylık" },
  ...Array.from({ length: 20 }, (_, index) => ({
    value: String(index + 1),
    label: `${index + 1} yaş`,
  })),
];

const TURKEY_PROVINCES = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya", "Ankara", "Antalya",
  "Artvin", "Aydın", "Balıkesir", "Bilecik", "Bingöl", "Bitlis", "Bolu",
  "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır",
  "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun",
  "Gümüşhane", "Hakkâri", "Hatay", "Isparta", "Mersin", "İstanbul", "İzmir",
  "Kars", "Kastamonu", "Kayseri", "Kırklareli", "Kırşehir", "Kocaeli", "Konya",
  "Kütahya", "Malatya", "Manisa", "Kahramanmaraş", "Mardin", "Muğla", "Muş",
  "Nevşehir", "Niğde", "Ordu", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop",
  "Sivas", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Şanlıurfa", "Uşak",
  "Van", "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman", "Kırıkkale",
  "Batman", "Şırnak", "Bartın", "Ardahan", "Iğdır", "Yalova", "Karabük",
  "Kilis", "Osmaniye", "Düzce",
];

type ProvinceData = {
  id: number;
  name: string;
  districts: string[];
};

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
  const [district, setDistrict] = useState("");
  const [provinces, setProvinces] = useState<ProvinceData[]>(
    [...TURKEY_PROVINCES]
      .sort((a, b) => a.localeCompare(b, "tr"))
      .map((name, index) => ({ id: index + 1, name, districts: [] }))
  );
  const [districtsLoading, setDistrictsLoading] = useState(true);
  const [districtsError, setDistrictsError] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [pedigree, setPedigree] = useState("");
  const [allowPhoneCalls, setAllowPhoneCalls] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadProvinceDistricts() {
      try {
        setDistrictsLoading(true);
        setDistrictsError("");

        const [provinceResponse, districtResponse] = await Promise.all([
          fetch("https://api.turkiyeapi.dev/v2/provinces?limit=100&fields=id,name", {
            signal: controller.signal,
          }),
          fetch("https://api.turkiyeapi.dev/v2/districts?limit=1000&fields=id,name,provinceId", {
            signal: controller.signal,
          }),
        ]);

        if (!provinceResponse.ok || !districtResponse.ok) {
          throw new Error("İl ve ilçe listesi şu anda yüklenemiyor.");
        }

        const [provinceResult, districtResult] = await Promise.all([
          provinceResponse.json(),
          districtResponse.json(),
        ]);

        const provinceRows = Array.isArray(provinceResult?.data) ? provinceResult.data : [];
        const districtRows = Array.isArray(districtResult?.data) ? districtResult.data : [];

        const loaded: ProvinceData[] = provinceRows.map(
          (province: { id?: number; name?: string }) => ({
            id: Number(province.id),
            name: String(province.name ?? ""),
            districts: districtRows
              .filter((district: { provinceId?: number }) => Number(district.provinceId) === Number(province.id))
              .map((district: { name?: string }) => String(district.name ?? ""))
              .filter(Boolean)
              .sort((a: string, b: string) => a.localeCompare(b, "tr")),
          })
        )
          .filter((province: ProvinceData) => province.id && province.name)
          .sort((a: ProvinceData, b: ProvinceData) => a.name.localeCompare(b.name, "tr"));

        if (loaded.length !== 81 || loaded.every((province) => province.districts.length === 0)) {
          throw new Error("İl ve ilçe verileri eksik geldi.");
        }

        setProvinces(loaded);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        console.error("İl ve ilçe listesi yüklenemedi:", loadError);
        setDistrictsError("İlçe listesi yüklenemedi. Lütfen bağlantını kontrol edip sayfayı yenile.");
      } finally {
        if (!controller.signal.aborted) setDistrictsLoading(false);
      }
    }

    void loadProvinceDistricts();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedEditId = params.get("edit");
    if (!requestedEditId) return;

    let cancelled = false;
    async function loadListingForEdit() {
      setEditLoading(true);
      setError("");
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (cancelled) return;
      if (authError || !user) {
        setError("İlanını düzenlemek için önce giriş yapmalısın.");
        setEditLoading(false);
        return;
      }

      const { data, error: listingError } = await supabase
        .from("cats")
        .select("id, owner_id, name, breed, age_years, gender, color, city, description, phone, pedigree, allow_phone_calls, photo_urls")
        .eq("id", requestedEditId)
        .eq("owner_id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (listingError || !data) {
        setError("Bu ilanı düzenleme yetkin yok veya ilan bulunamadı.");
        setEditLoading(false);
        return;
      }

      const [savedCity, ...savedDistrict] = String(data.city ?? "").split(",");
      setEditId(data.id);
      setName(data.name ?? "");
      setBreed(data.breed ?? "");
      setAge(data.age_years == null ? "" : String(data.age_years));
      setGender(data.gender ?? "");
      setColor(data.color ?? "");
      setCity(savedCity.trim());
      setDistrict(savedDistrict.join(",").trim());
      setDescription(data.description ?? "");
      setPhone(data.phone ?? "");
      setPedigree(data.pedigree == null ? "" : String(data.pedigree));
      setAllowPhoneCalls(data.allow_phone_calls == null ? "" : String(data.allow_phone_calls));
      setExistingPhotos(Array.isArray(data.photo_urls) ? data.photo_urls.filter(Boolean) : []);
      setEditLoading(false);
    }

    void loadListingForEdit();
    return () => { cancelled = true; };
  }, []);

  const selectedProvince = provinces.find((province) => province.name === city);
  const districtOptions = selectedProvince?.districts ?? [];


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
    colorScheme: darkMode ? "dark" : "light",
    border: `1px solid ${
      darkMode ? "rgba(221, 205, 255, 0.25)" : "rgba(116, 88, 157, 0.28)"
    }`,
  } as const;

  const selectOptionStyle = {
    backgroundColor: darkMode ? "#2b1748" : "#ffffff",
    color: darkMode ? "#ffffff" : "#30264b",
  } as const;

  const mutedColor = darkMode ? "#c5badc" : "#756887";
  const accentColor = darkMode ? "#e4b8ff" : "#8056b5";

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    setError("");
    setMessage("");

    const selectedFiles = Array.from(event.target.files ?? []);

    if (selectedFiles.length === 0) return;

    if (existingPhotos.length + photos.length + selectedFiles.length > MAX_PHOTOS) {
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

    if (!name.trim() || !breed || !age || !gender || !color || !city || !district) {
      setError("Lütfen zorunlu alanların tamamını doldur.");
      return;
    }

    const parsedAge = Number(age);

    if (!catAges.some((option) => option.value === age)) {
      setError("Lütfen listeden geçerli bir yaş seç.");
      return;
    }

    if (!catColors.includes(color)) {
      setError("Lütfen listeden geçerli bir renk seç.");
      return;
    }

    if (!districtOptions.includes(district)) {
      setError("Lütfen seçtiğin şehre ait bir ilçeyi listeden seç.");
      return;
    }

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

    if (existingPhotos.length + photos.length < MIN_PHOTOS || existingPhotos.length + photos.length > MAX_PHOTOS) {
      setError(`İlanında en az ${MIN_PHOTOS}, en fazla ${MAX_PHOTOS} fotoğraf bulunmalı.`);
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

      const listingPayload = {
        name: name.trim(),
        breed,
        age_years: parsedAge,
        gender,
        color: color.trim(),
        city: `${city}, ${district}`,
        description: description.trim(),
        photo_urls: [...existingPhotos, ...photoUrls],
        pedigree: pedigree === "true",
        allow_phone_calls: allowPhoneCalls === "true",
        phone: allowPhoneCalls === "true" ? phone.trim() : null,
      };

      if (editId) {
        const { error: updateError } = await supabase
          .from("cats")
          .update(listingPayload)
          .eq("id", editId)
          .eq("owner_id", user.id);
        if (updateError) throw new Error(`İlan güncellenemedi: ${updateError.message}`);
      } else {
        const { error: insertError } = await supabase.from("cats").insert({
          owner_id: user.id,
          ...listingPayload,
          is_active: true,
        });
        if (insertError) throw new Error(`İlan kaydedilemedi: ${insertError.message}`);
      }

      setMessage(editId ? "İlanın başarıyla güncellendi!" : "İlanın başarıyla oluşturuldu!");
      if (!editId) {
        setName("");
        setBreed("");
        setAge("");
        setGender("");
        setColor("");
        setCity("");
        setDistrict("");
        setDescription("");
        setPhone("");
        setPedigree("");
        setAllowPhoneCalls("");
        setPhotos([]);
      } else {
        setPhotos([]);
        setExistingPhotos((current) => current);
      }
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
            className="flex shrink-0 items-center gap-3 rounded-full px-8 py-5 text-base font-semibold transition hover:scale-[1.02]"
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
                  width={38}
                  height={38}
                  className="h-[38px] w-[38px] object-contain"
                  aria-hidden="true"
                />
                Açık tema
              </>
            ) : (
              <>
                <img
                  src="/images/icons/gece.png"
                  alt=""
                  width={38}
                  height={38}
                  className="h-[38px] w-[38px] object-contain"
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
              {editId ? "İlanını düzenle" : "Kedini tanıt"}
            </h2>
            <p className="mt-2 text-sm leading-6" style={{ color: mutedColor }}>
              {editId ? "İlan bilgilerini güncelle, değişikliklerini kaydet." : "Kedinin bilgilerini gir, fotoğraflarını ekle ve ilanını oluştur."}
            </p>
          </div>

          {editLoading && <p className="mb-5 text-sm" style={{ color: mutedColor }}>İlan bilgileri yükleniyor...</p>}

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
                  <option value="" style={selectOptionStyle}>Tür seç</option>
                  {catBreeds.map((catBreed) => (
                    <option key={catBreed} value={catBreed} style={selectOptionStyle}>
                      {catBreed}
                    </option>
                  ))}
                </select>
              </div>

              <div className={sectionClass}>
                <label className={labelClass} htmlFor="age">
                  Yaş (yıl) *
                </label>
                <select
                  id="age"
                  className={fieldClass}
                  style={inputStyle}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  required
                >
                  <option value="" style={selectOptionStyle}>Yaş seç</option>
                  {catAges.map((option) => (
                    <option key={option.value} value={option.value} style={selectOptionStyle}>
                      {option.label}
                    </option>
                  ))}
                </select>
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
                  <option value="" style={selectOptionStyle}>Cinsiyet seç</option>
                  <option value="Erkek" style={selectOptionStyle}>Erkek</option>
                  <option value="Dişi" style={selectOptionStyle}>Dişi</option>
                </select>
              </div>

              <div className={sectionClass}>
                <label className={labelClass} htmlFor="color">
                  Renk *
                </label>
                <select
                  id="color"
                  className={fieldClass}
                  style={inputStyle}
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  required
                >
                  <option value="" style={selectOptionStyle}>Renk seç</option>
                  {catColors.map((catColor) => (
                    <option key={catColor} value={catColor} style={selectOptionStyle}>
                      {catColor}
                    </option>
                  ))}
                </select>
              </div>

              <div className={sectionClass + " sm:col-span-2"}>
                <span className={labelClass}>
                  Şehir / İlçe *
                </span>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} htmlFor="city">Şehir *</label>
                    <select
                      id="city"
                      className={fieldClass}
                      style={inputStyle}
                      value={city}
                      onChange={(e) => {
                        setCity(e.target.value);
                        setDistrict("");
                      }}
                      required
                    >
                      <option value="" style={selectOptionStyle}>Şehir seç</option>
                      {provinces.map((province) => (
                        <option key={province.name} value={province.name} style={selectOptionStyle}>
                          {province.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="district">İlçe *</label>
                    <select
                      id="district"
                      className={fieldClass}
                      style={inputStyle}
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      disabled={!city || districtsLoading || districtOptions.length === 0}
                      required
                    >
                      <option value="" style={selectOptionStyle}>
                        {!city ? "Önce şehir seç" : districtsLoading ? "İlçeler yükleniyor..." : "İlçe seç"}
                      </option>
                      {districtOptions.map((districtName) => (
                        <option key={districtName} value={districtName} style={selectOptionStyle}>
                          {districtName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {districtsError && (
                  <p className="text-xs text-red-500" role="alert">{districtsError}</p>
                )}
                {city && !districtsLoading && districtOptions.length === 0 && !districtsError && (
                  <p className="text-xs text-red-500">Bu şehir için ilçe listesi bulunamadı. Lütfen sayfayı yenile.</p>
                )}
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
                  {existingPhotos.length + photos.length}/{MAX_PHOTOS}
                </span>
              </div>

              <p className="mb-3 text-sm" style={{ color: mutedColor }}>
                En az 2, en fazla 8 fotoğraf. JPG, PNG veya WebP; her biri en
                fazla 5 MB. Mevcut fotoğrafları koruyabilir veya kaldırabilirsin.
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

              {existingPhotos.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {existingPhotos.map((photo, index) => (
                    <div key={`${photo}-${index}`} className="relative overflow-hidden rounded-xl border" style={{ borderColor: inputStyle.border.split(" ").at(-1) }}>
                      <img src={photo} alt={`Mevcut fotoğraf ${index + 1}`} className="h-28 w-full object-cover" />
                      <button type="button" onClick={() => setExistingPhotos((current) => current.filter((_, i) => i !== index))} className="absolute right-1 top-1 rounded-lg bg-black/70 px-2 py-1 text-xs font-bold text-white">Kaldır</button>
                    </div>
                  ))}
                </div>
              )}

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
              disabled={loading || editLoading}
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
                  {editId ? "İlan güncelleniyor..." : "İlan oluşturuluyor..."}
                </>
              ) : (
                editId ? "Değişiklikleri kaydet" : "İlanı oluştur"
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
          CATalog · Kediler için ilan platformu
        </footer>
      </div>
    </main>
  );
}
