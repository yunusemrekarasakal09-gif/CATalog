
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Cat = {
  id: string;
  name: string;
  breed: string;
  age_years: number;
  gender: string;
  city: string;
  color: string;
  photo_urls: string[] | null;
  description: string;
  pedigree: boolean | null;
};

const cities = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya",
  "Ankara", "Antalya", "Ardahan", "Artvin", "Aydın", "Balıkesir",
  "Bartın", "Batman", "Bayburt", "Bilecik", "Bingöl", "Bitlis",
  "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum",
  "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan",
  "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane",
  "Hakkâri", "Hatay", "Iğdır", "Isparta", "İstanbul", "İzmir",
  "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu",
  "Kayseri", "Kırıkkale", "Kırklareli", "Kırşehir", "Kilis",
  "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Mardin",
  "Mersin", "Muğla", "Muş", "Nevşehir", "Niğde", "Ordu", "Osmaniye",
  "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas",
  "Şanlıurfa", "Şırnak", "Tekirdağ", "Tokat", "Trabzon", "Tunceli",
  "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak",
];

const breeds = [
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

const colors = [
  "Siyah", "Beyaz", "Gri", "Krem", "Kahverengi",
  "Turuncu", "Sarman", "Tekir", "Çok renkli", "Diğer",
];

const image = {
  logoDark: "/images/brand/logo1.png",
  logoLight: "/images/brand/logo2.png",

  // Gece modu: slogan.png
  // Gündüz modu: slogan2.png
  sloganDark: "/images/backgrounds/slogan.png",
  sloganLight: "/images/backgrounds/slogan2.png",

  backgroundLight: "/images/backgrounds/750x1820 açık arkaplan.png",
  backgroundDark: "/images/backgrounds/750x1820 koyu arkaplan.png",
  backgroundWide1: "/images/backgrounds/CATolog arkaplan1.png",
  backgroundWide2: "/images/backgrounds/catolog arkaplan2.png",

  themeDay: "/images/icons/gündüz.png",
  themeNight: "/images/icons/gece.png",

  search: "/images/icons/arama.png",
  settings: "/images/icons/ayarlar ikonu.png",
  zoom: "/images/icons/aç,tam ekran yap,büyüt butonu.png",
  notificationOn: "/images/icons/bildirim var ikonu.png",
  notificationOff: "/images/icons/bildirim yok ikonu.png",
  emptyStar: "/images/ratings/boş yıldız.png",
  fullStar: "/images/ratings/dolu yıldız.png",
  partialStar: "/images/ratings/geçiş yıldız.png",
  warning: "/images/icons/dikkat ikonu.png",
  favorite: "/images/icons/favori butonu.png",
  favoriteInactive: "/images/icons/favori butonu pasif.png",
  seen: "/images/icons/görüldü tik.png",
  info: "/images/icons/info ikonu.png",
  message: "/images/icons/mesaj butonu.png",
  navigation: "/images/icons/navigasyon.png",
  whiteTick: "/images/icons/tek beyaz tik.png",
  tick: "/images/icons/tik butonu.png",
  user: "/images/icons/user ikonu.png",
  userAlt: "/images/icons/user.png",
  close: "/images/icons/çarpı butonu.png",
  doubleTick: "/images/icons/çift beyaz tik.png",
};

const fieldStyle =
  "w-full min-w-0 rounded-xl border px-4 py-3.5 text-sm outline-none transition placeholder:text-[#A39AAF] focus:border-[#A184D5] focus:ring-4 focus:ring-[#A184D5]/15";

function getThemedImage(src: string, darkMode: boolean) {
  if (darkMode || src.startsWith("/images/backgrounds/")) {
    return src;
  }

  return src.replace(/(\.[^./]+)$/, "2$1");
}

function getBreedLabel(value: string | null | undefined) {
  if (!value) return "";

  const aliases: Record<string, string> = {
    Persian: "İran Kedisi",
    Siamese: "Siyam Kedisi",
    Sphynx: "Sfenks",
    "Russian Blue": "Rus Mavisi",
    "Norwegian Forest Cat": "Norveç Orman Kedisi",
    Siberian: "Sibirya Kedisi",
    Abyssinian: "Abyssinian (Habeş Kedisi)",
    "Turkish Angora": "Ankara Kedisi",
    "Turkish Van": "Van Kedisi",
  };

  return aliases[value] ?? value;
}

function VisualIcon({
  src,
  alt,
  className = "h-5 w-5",
  fallback = "•",
  darkMode = true,
  themeAware = true,
}: {
  src: string;
  alt: string;
  className?: string;
  fallback?: string;
  darkMode?: boolean;
  themeAware?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const finalSrc = themeAware ? getThemedImage(src, darkMode) : src;

  useEffect(() => {
    setFailed(false);
  }, [finalSrc]);

  if (failed) {
    return (
      <span
        aria-label={alt || undefined}
        role={alt ? "img" : undefined}
        className={`${className} inline-flex shrink-0 items-center justify-center font-bold text-[#A184D5]`}
        title={alt || undefined}
      >
        {fallback}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={encodeURI(finalSrc)}
      alt={alt}
      onError={() => setFailed(true)}
      className={`${className} shrink-0 object-contain`}
    />
  );
}

export default function Home() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [breed, setBreed] = useState("");
  const [gender, setGender] = useState("");
  const [city, setCity] = useState("");
  const [color, setColor] = useState("");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [pedigree, setPedigree] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [notice, setNotice] = useState("");
  const [userName, setUserName] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [authLoading, setAuthLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const [darkMode, setDarkMode] = useState(false);
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const savedTheme = window.localStorage.getItem("catalog-theme");

    if (savedTheme === "dark" || savedTheme === "light") {
      setDarkMode(savedTheme === "dark");
    } else {
      setDarkMode(media.matches);
    }

    setThemeReady(true);

    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      const saved = window.localStorage.getItem("catalog-theme");

      if (saved !== "dark" && saved !== "light") {
        setDarkMode(event.matches);
      }
    };

    media.addEventListener("change", handleSystemThemeChange);

    return () => {
      media.removeEventListener("change", handleSystemThemeChange);
    };
  }, []);

  useEffect(() => {
    if (!themeReady) return;

    window.localStorage.setItem(
      "catalog-theme",
      darkMode ? "dark" : "light"
    );
  }, [darkMode, themeReady]);

  function toggleTheme() {
    setDarkMode((current) => !current);
  }

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (error || !user) {
          setUserName(null);
          setCurrentUserId(null);
          return;
        }

        setCurrentUserId(user.id);

        const { data } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .maybeSingle();

        if (!mounted) return;

        setUserName(
          data?.display_name && data.display_name !== "Kullanıcı"
            ? data.display_name
            : user.email ?? "Hesabım"
        );
      } catch {
        if (mounted) {
          setUserName(null);
          setCurrentUserId(null);
        }
      } finally {
        if (mounted) setAuthLoading(false);
      }
    }

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadUser();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!currentUserId) {
      setUnreadCount(0);
      return;
    }

    let mounted = true;

    async function loadUnreadCount() {
      const { count, error } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", currentUserId!)
        .is("read_at", null);

      if (!mounted) return;

      if (error) {
        console.error("Okunmamış mesaj sayısı alınamadı:", error);
        return;
      }

      setUnreadCount(count ?? 0);
    }

    void loadUnreadCount();

    const channel = supabase
      .channel(`home-unread-messages-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${currentUserId}`,
        },
        () => void loadUnreadCount()
      )
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  useEffect(() => {
    let mounted = true;

    async function loadCats() {
      setLoading(true);
      setLoadError("");

      const { data, error } = await supabase
        .from("cats")
        .select(
          "id, name, breed, age_years, gender, city, color, photo_urls, description, pedigree"
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (error) {
        setLoadError("İlanlar yüklenemedi. Lütfen tekrar dene.");
        setCats([]);
      } else {
        setCats((data ?? []) as Cat[]);
      }

      setLoading(false);
    }

    void loadCats();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredCats = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr");

    return cats.filter((cat) => {
      const searchableText = [
        cat.name,
        getBreedLabel(cat.breed),
        cat.city,
        cat.color,
        cat.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr");

      return (
        searchableText.includes(query) &&
        (!breed || getBreedLabel(cat.breed) === breed) &&
        (!gender || cat.gender === gender) &&
        (!city || cat.city === city || cat.city.startsWith(`${city},`)) &&
        (!color || cat.color === color) &&
        (minAge === "" || cat.age_years >= Number(minAge)) &&
        (maxAge === "" || cat.age_years <= Number(maxAge)) &&
        (pedigree === "" || cat.pedigree === (pedigree === "true")) &&
        (!showFavorites || favorites.includes(cat.id))
      );
    });
  }, [
    cats,
    search,
    breed,
    gender,
    city,
    color,
    minAge,
    maxAge,
    pedigree,
    showFavorites,
    favorites,
  ]);

  function resetFilters() {
    setSearch("");
    setBreed("");
    setGender("");
    setCity("");
    setColor("");
    setMinAge("");
    setMaxAge("");
    setPedigree("");
    setShowFavorites(false);
    setNotice("");
  }

  function toggleFavorite(id: string) {
    const alreadyFavorite = favorites.includes(id);

    setFavorites((current) =>
      alreadyFavorite
        ? current.filter((item) => item !== id)
        : [...current, id]
    );

    setNotice(
      alreadyFavorite
        ? "İlan favorilerden çıkarıldı."
        : "İlan favorilere eklendi."
    );
  }

  async function handleSignOut() {
    setSigningOut(true);
    setNotice("");

    const { error } = await supabase.auth.signOut();

    if (error) {
      setNotice("Çıkış yapılamadı. Lütfen tekrar dene.");
    } else {
      setUserName(null);
      setCurrentUserId(null);
      setUnreadCount(0);
      setNotice("Oturum kapatıldı.");
    }

    setSigningOut(false);
  }

  const heroBackground = darkMode
    ? image.backgroundDark
    : image.backgroundLight;

  const logoSrc = darkMode ? image.logoDark : image.logoLight;

  // Slogan görseli de tema değiştikçe değişir.
  const sloganSrc = darkMode ? image.sloganDark : image.sloganLight;

  const selectClass = `${fieldStyle} ${
    darkMode
      ? "border-[#51445F] bg-[#17131F] text-[#F5EFFB] [color-scheme:dark] placeholder:text-[#AFA2BD] hover:border-[#78648E]"
      : "border-[#E8E0F2] bg-white text-[#403451] [color-scheme:light] placeholder:text-[#A39AAF] hover:border-[#CBB7E5]"
  }`;

  const navButtonClass = `inline-flex min-h-14 items-center justify-center gap-2.5 rounded-2xl border px-5 py-3.5 text-base font-semibold transition hover:-translate-y-0.5 ${
    darkMode
      ? "border-white/15 bg-white/5 text-[#F5EFFB] hover:bg-white/10"
      : "border-[#E9E1F1] bg-white text-[#403451] hover:bg-[#F7F2FC]"
  }`;

  return (
    <main
      className={`min-h-screen transition-colors duration-300 ${
        darkMode
          ? "bg-[#15121D] text-[#F5EFFB]"
          : "bg-[#FAF8FC] text-[#302542]"
      }`}
    >
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-xl ${
          darkMode
            ? "border-white/10 bg-[#191521]/95"
            : "border-[#EDE6F4]/80 bg-white/95"
        }`}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:py-5">
          <Link
            href="/"
            className="flex shrink-0 items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A184D5]"
            aria-label="CAT-ALOG ana sayfa"
          >
            <VisualIcon
              src={logoSrc}
              alt="CAT-ALOG"
              fallback="CAT-ALOG"
              darkMode={darkMode}
              themeAware={false}
              className="h-auto w-48 max-w-full sm:w-64 lg:w-72"
            />
          </Link>

          <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={darkMode ? "Açık temaya geç" : "Koyu temaya geç"}
              title={darkMode ? "Açık temaya geç" : "Koyu temaya geç"}
              className={`${navButtonClass} h-16 w-16 shrink-0 !p-3 sm:h-[72px] sm:w-[72px]`}
            >
              <VisualIcon
                src={darkMode ? image.themeNight : image.themeDay}
                alt={darkMode ? "Gece modu" : "Gündüz modu"}
                fallback={darkMode ? "Gece" : "Gündüz"}
                darkMode={darkMode}
                themeAware={false}
                className="h-9 w-9 sm:h-11 sm:w-11"
              />
            </button>

            {authLoading ? (
              <span
                className={`px-2 py-2 text-sm ${
                  darkMode ? "text-[#C4B7D0]" : "text-[#91879F]"
                }`}
              >
                Oturum kontrol ediliyor...
              </span>
            ) : currentUserId ? (
              <>
                <Link
                  href="/mesajlar"
                  className={navButtonClass}
                  aria-label={
                    unreadCount > 0
                      ? `Mesajlarım, ${unreadCount} okunmamış mesaj`
                      : "Mesajlarım"
                  }
                >
                  <VisualIcon
                    src={image.message}
                    alt=""
                    fallback="Mesaj"
                    darkMode={darkMode}
                    className="h-8 w-8 sm:h-9 sm:w-9"
                  />
                  <span className="hidden sm:inline">Mesajlarım</span>
                  {unreadCount > 0 && (
                    <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[#A184D5] px-2 text-xs font-bold text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>

                <Link
                  href="/profil"
                  className={`${navButtonClass} min-h-16 max-w-56`}
                  title={userName ?? "Hesabım"}
                >
                  <VisualIcon
                    src={image.user}
                    alt=""
                    fallback="Hesap"
                    darkMode={darkMode}
                    className="h-9 w-9 sm:h-10 sm:w-10"
                  />
                  <span className="max-w-32 truncate">
                    {userName ?? "Hesabım"}
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className={`${navButtonClass} disabled:opacity-50`}
                >
                  {signingOut ? "Çıkış yapılıyor..." : "Çıkış yap"}
                </button>
              </>
            ) : (
              <Link href="/giris" className={navButtonClass}>
                Giriş yap
              </Link>
            )}

            <Link
              href="/ilan-ekle"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#7251A5] px-6 py-3.5 text-base font-bold text-white shadow-md shadow-[#7251A5]/20 transition hover:-translate-y-0.5 hover:bg-[#60418F] hover:shadow-lg"
            >
              <span className="text-2xl leading-none" aria-hidden="true">+</span>
              <span>İlan ver</span>
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-[1440px] px-3 pt-5 sm:px-6 sm:pt-8">
        <div
          className={`relative isolate min-h-[440px] overflow-hidden rounded-[28px] border sm:min-h-[480px] sm:rounded-[36px] lg:min-h-[520px] ${
            darkMode
              ? "border-white/10 bg-[#211A2D]"
              : "border-[#E9DDF2] bg-[#F0E6F7]"
          }`}
          style={{
            backgroundImage: `url("${encodeURI(heroBackground)}"), url("${encodeURI(
              darkMode ? image.backgroundWide2 : image.backgroundWide1
            )}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div
            className={`absolute inset-0 -z-10 ${
              darkMode
                ? "bg-gradient-to-r from-[#17121F]/95 via-[#17121F]/70 to-[#17121F]/15"
                : "bg-gradient-to-r from-[#FCF8FF]/95 via-[#FCF8FF]/80 to-[#FCF8FF]/15"
            }`}
          />

          <div className="flex min-h-[440px] items-center px-6 py-10 sm:min-h-[480px] sm:px-10 sm:py-14 lg:min-h-[520px] lg:px-16">
            <div className="w-full max-w-2xl">
              <VisualIcon
                src={sloganSrc}
                alt="CAT-ALOG sloganı"
                fallback=""
                darkMode={darkMode}
                themeAware={false}
                className="h-auto max-h-48 w-full max-w-2xl object-contain object-left sm:max-h-60 lg:max-h-72"
              />

              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href="#ilanlar"
                  className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-[#7251A5] px-7 py-4 text-base font-bold text-white shadow-lg shadow-[#7251A5]/20 transition hover:-translate-y-0.5 hover:bg-[#60418F]"
                >
                  İlanları keşfet <span aria-hidden="true">→</span>
                </a>

                <Link
                  href="/ilan-ekle"
                  className={`inline-flex min-h-14 items-center justify-center rounded-xl border px-7 py-4 text-base font-bold backdrop-blur-md transition hover:-translate-y-0.5 ${
                    darkMode
                      ? "border-white/20 bg-white/10 text-white hover:bg-white/15"
                      : "border-[#D9C9EA] bg-white/65 text-[#57406F] hover:bg-white"
                  }`}
                >
                  İlanını paylaş
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="ilanlar"
        className="mx-auto max-w-7xl scroll-mt-28 px-4 pb-16 pt-12 sm:px-6 sm:pt-16"
      >
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A184D5] sm:text-sm">
              
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              
            </h2>
            <p
              className={`mt-2 text-sm ${
                darkMode ? "text-[#D0C4DA]" : "text-[#8B8196]"
              }`}
            >
              
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowFavorites((value) => !value)}
            aria-pressed={showFavorites}
            className={`inline-flex min-h-14 items-center gap-2 rounded-xl border px-5 py-3.5 text-base font-bold transition hover:-translate-y-0.5 ${
              showFavorites
                ? "border-[#A184D5] bg-[#A184D5]/15 text-[#B69ADD]"
                : darkMode
                  ? "border-white/10 bg-white/5 text-[#F5EFFB] hover:bg-white/10"
                  : "border-[#E9E1F1] bg-white text-[#403451] hover:border-[#CBB7E5] hover:bg-[#FBF8FF]"
            }`}
          >
            <VisualIcon
              src={showFavorites ? image.favorite : image.favoriteInactive}
              alt=""
              fallback={showFavorites ? "♥" : "♡"}
              darkMode={darkMode}
              className="h-8 w-8 sm:h-9 sm:w-9"
            />
            {showFavorites ? "Favoriler gösteriliyor" : "Favorilerim"}
            <span className="rounded-full bg-[#A184D5]/15 px-2.5 py-1 text-xs">
              {favorites.length}
            </span>
          </button>
        </div>

        <div
          className={`mb-8 rounded-2xl border p-4 shadow-sm sm:rounded-3xl sm:p-6 ${
            darkMode
              ? "border-[#403449] bg-[#201B29] shadow-black/10"
              : "border-[#ECE5F3] bg-white shadow-[#45305C]/[0.03]"
          }`}
        >
          <label className="mb-5 block">
            <span
              className={`mb-2 block text-sm font-bold ${
                darkMode ? "text-[#F5EFFB]" : "text-[#403451]"
              }`}
            >
              Kedini ara
            </span>
            <div className="relative">
              <VisualIcon
                src={image.search}
                alt=""
                fallback="Ara"
                darkMode={darkMode}
                className="pointer-events-none absolute left-4 top-1/2 h-7 w-7 -translate-y-1/2"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="İsim, cins, şehir veya açıklama..."
                className={`${selectClass} min-h-14 pl-14`}
              />
            </div>
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span
                className={`mb-2 block text-xs font-bold uppercase tracking-wide ${
                  darkMode ? "text-[#C4B7D0]" : "text-[#91869F]"
                }`}
              >
                Kedi türü
              </span>
              <select
                value={breed}
                onChange={(event) => setBreed(event.target.value)}
                className={selectClass}
                aria-label="Kedi türü"
              >
                <option value="">Tüm türler</option>
                {breeds.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span
                className={`mb-2 block text-xs font-bold uppercase tracking-wide ${
                  darkMode ? "text-[#C4B7D0]" : "text-[#91869F]"
                }`}
              >
                Cinsiyet
              </span>
              <select
                value={gender}
                onChange={(event) => setGender(event.target.value)}
                className={selectClass}
                aria-label="Cinsiyet"
              >
                <option value="">Tüm cinsiyetler</option>
                <option value="Erkek">Erkek</option>
                <option value="Dişi">Dişi</option>
              </select>
            </label>

            <label className="block">
              <span
                className={`mb-2 block text-xs font-bold uppercase tracking-wide ${
                  darkMode ? "text-[#C4B7D0]" : "text-[#91869F]"
                }`}
              >
                Şehir
              </span>
              <select
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className={selectClass}
                aria-label="Şehir"
              >
                <option value="">Tüm şehirler</option>
                {cities.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span
                className={`mb-2 block text-xs font-bold uppercase tracking-wide ${
                  darkMode ? "text-[#C4B7D0]" : "text-[#91869F]"
                }`}
              >
                Renk
              </span>
              <select
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className={selectClass}
                aria-label="Renk"
              >
                <option value="">Tüm renkler</option>
                {colors.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span
                className={`mb-2 block text-xs font-bold uppercase tracking-wide ${
                  darkMode ? "text-[#C4B7D0]" : "text-[#91869F]"
                }`}
              >
                En az yaş
              </span>
              <input
                type="number"
                min="0"
                max="40"
                value={minAge}
                onChange={(event) => setMinAge(event.target.value)}
                placeholder="Örn. 1"
                className={selectClass}
              />
            </label>

            <label className="block">
              <span
                className={`mb-2 block text-xs font-bold uppercase tracking-wide ${
                  darkMode ? "text-[#C4B7D0]" : "text-[#91869F]"
                }`}
              >
                En fazla yaş
              </span>
              <input
                type="number"
                min="0"
                max="40"
                value={maxAge}
                onChange={(event) => setMaxAge(event.target.value)}
                placeholder="Örn. 5"
                className={selectClass}
              />
            </label>

            <label className="block sm:col-span-2 lg:col-span-3">
              <span
                className={`mb-2 block text-xs font-bold uppercase tracking-wide ${
                  darkMode ? "text-[#C4B7D0]" : "text-[#91869F]"
                }`}
              >
                Şecere
              </span>
              <select
                value={pedigree}
                onChange={(event) => setPedigree(event.target.value)}
                className={selectClass}
                aria-label="Şecere durumu"
              >
                <option value="">Tümü</option>
                <option value="true">Şeceresi var</option>
                <option value="false">Şeceresi yok</option>
              </select>
            </label>
          </div>

          <div
            className={`mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4 ${
              darkMode ? "border-white/10" : "border-[#F0EAF6]"
            }`}
          >
            <p
              className={`text-sm ${
                darkMode ? "text-[#D0C4DA]" : "text-[#8B8196]"
              }`}
              aria-live="polite"
            >
              <strong className={darkMode ? "text-white" : "text-[#403451]"}>
                {filteredCats.length}
              </strong>{" "}
              ilan bulundu
            </p>

            <button
              type="button"
              onClick={resetFilters}
              className="min-h-11 rounded-lg px-4 py-2.5 text-sm font-bold text-[#B69ADD] transition hover:bg-[#A184D5]/10"
            >
              Filtreleri temizle
            </button>
          </div>
        </div>

        {notice && (
          <div
            role="status"
            className={`mb-5 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${
              darkMode
                ? "border-[#A184D5]/30 bg-[#A184D5]/15 text-[#D8C4F3]"
                : "border-[#A184D5]/20 bg-[#A184D5]/10 text-[#795AA7]"
            }`}
          >
            <VisualIcon
              src={image.info}
              alt=""
              fallback="Bilgi"
              darkMode={darkMode}
              className="h-7 w-7"
            />
            {notice}
          </div>
        )}

        {loading ? (
          <div
            className={`rounded-3xl border p-12 text-center ${
              darkMode
                ? "border-white/10 bg-[#201B29]"
                : "border-[#ECE5F3] bg-white"
            }`}
          >
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[#A184D5]/20 border-t-[#A184D5]" />
            <p className="mt-4 font-bold">İlanlar yükleniyor...</p>
            <p
              className={`mt-1 text-sm ${
                darkMode ? "text-[#D0C4DA]" : "text-[#91869F]"
              }`}
            >
              Minik dostlar hazırlanıyor.
            </p>
          </div>
        ) : loadError ? (
          <div
            className={`rounded-3xl border p-8 text-center ${
              darkMode
                ? "border-red-400/20 bg-[#201B29]"
                : "border-red-100 bg-white"
            }`}
          >
            <VisualIcon
              src={image.warning}
              alt=""
              fallback="!"
              darkMode={darkMode}
              className="mx-auto h-12 w-12"
            />
            <p className="mt-4 font-bold text-red-500">{loadError}</p>
            <p
              className={`mt-2 text-sm ${
                darkMode ? "text-[#D0C4DA]" : "text-[#91869F]"
              }`}
            >
              Supabase bağlantını ve ilan tablosunu kontrol et.
            </p>
          </div>
        ) : filteredCats.length === 0 ? (
          <div
            className={`rounded-3xl border px-5 py-14 text-center ${
              darkMode
                ? "border-white/10 bg-[#201B29]"
                : "border-[#ECE5F3] bg-white"
            }`}
          >
            <VisualIcon
              src={image.userAlt}
              alt=""
              fallback="Kedi"
              darkMode={darkMode}
              className="mx-auto h-14 w-14 opacity-70"
            />
            <h3 className="mt-5 text-xl font-black">
              {showFavorites
                ? "Henüz favorin yok"
                : "Uygun ilan bulunamadı"}
            </h3>
            <p
              className={`mx-auto mt-2 max-w-md text-sm leading-6 ${
                darkMode ? "text-[#D0C4DA]" : "text-[#8B8196]"
              }`}
            >
              {showFavorites
                ? "Beğendiğin ilanları favorilerine ekleyerek burada görebilirsin."
                : "Filtreleri değiştirmeyi veya temizlemeyi deneyebilirsin."}
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-5 min-h-12 rounded-xl bg-[#7251A5] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#60418F]"
            >
              Filtreleri temizle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredCats.map((cat) => {
              const photo = cat.photo_urls?.[0];
              const isFavorite = favorites.includes(cat.id);

              return (
                <article
                  key={cat.id}
                  className={`group overflow-hidden rounded-2xl border transition duration-300 hover:-translate-y-1.5 hover:shadow-xl sm:rounded-3xl ${
                    darkMode
                      ? "border-white/10 bg-[#201B29] hover:border-[#A184D5]/40 hover:shadow-black/20"
                      : "border-[#ECE5F3] bg-white hover:border-[#D8C5EC] hover:shadow-[#4C3468]/[0.08]"
                  }`}
                >
                  <div className="relative">
                    <Link
                      href={`/kediler/${cat.id}`}
                      aria-label={`${cat.name} ilanının detaylarını görüntüle`}
                      className="block"
                    >
                      <div
                        className={`relative flex h-56 items-center justify-center overflow-hidden sm:h-60 ${
                          darkMode ? "bg-[#2A2235]" : "bg-[#F0E7F8]"
                        }`}
                      >
                        {photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photo}
                            alt={cat.name}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <VisualIcon
                            src={image.userAlt}
                            alt="Kedi fotoğrafı yok"
                            fallback="Kedi"
                            darkMode={darkMode}
                            className="h-16 w-16 opacity-50"
                          />
                        )}
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent opacity-70" />
                      </div>
                    </Link>

                    <button
                      type="button"
                      onClick={() => toggleFavorite(cat.id)}
                      aria-label={isFavorite ? "Favoriden çıkar" : "Favoriye ekle"}
                      aria-pressed={isFavorite}
                      className={`absolute right-3 top-3 z-10 flex h-14 w-14 items-center justify-center rounded-full shadow-md backdrop-blur-md transition hover:scale-110 ${
                        darkMode ? "bg-[#191521]/90" : "bg-white/95"
                      }`}
                    >
                      <VisualIcon
                        src={
                          isFavorite
                            ? image.favorite
                            : image.favoriteInactive
                        }
                        alt={isFavorite ? "Favorilerde" : "Favorilerde değil"}
                        fallback={isFavorite ? "♥" : "♡"}
                        darkMode={darkMode}
                        className="h-9 w-9 sm:h-10 sm:w-10"
                      />
                    </button>
                  </div>

                  <Link
                    href={`/kediler/${cat.id}`}
                    aria-label={`${cat.name} ilanını aç`}
                    className="block p-4 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#A184D5] sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate text-lg font-black tracking-tight">
                        {cat.name}
                      </h3>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                          darkMode
                            ? "bg-[#A184D5]/15 text-[#CBB3EB]"
                            : "bg-[#F0E7F8] text-[#795AA7]"
                        }`}
                      >
                        {cat.gender || "Belirtilmemiş"}
                      </span>
                    </div>

                    <p
                      className={`mt-1 text-sm ${
                        darkMode ? "text-[#D0C4DA]" : "text-[#857A91]"
                      }`}
                    >
                      {getBreedLabel(cat.breed) || "Türü belirtilmemiş"} ·{" "}
                      {cat.age_years == null
                        ? "Yaşı belirtilmemiş"
                        : `${cat.age_years} yaş`}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium ${
                          darkMode
                            ? "bg-white/5 text-[#E0D5E9]"
                            : "bg-[#F8F5FC] text-[#655A76]"
                        }`}
                      >
                        <VisualIcon
                          src={image.navigation}
                          alt=""
                          fallback="Konum"
                          darkMode={darkMode}
                          className="h-5 w-5"
                        />
                        {cat.city || "Şehir belirtilmemiş"}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium ${
                          darkMode
                            ? "bg-white/5 text-[#E0D5E9]"
                            : "bg-[#F8F5FC] text-[#655A76]"
                        }`}
                      >
                        <VisualIcon
                          src={image.info}
                          alt=""
                          fallback="Bilgi"
                          darkMode={darkMode}
                          className="h-5 w-5"
                        />
                        {cat.color || "Renk belirtilmemiş"}
                      </span>
                    </div>

                    <div className="mt-3">
                      <span
                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${
                          cat.pedigree
                            ? darkMode
                              ? "bg-emerald-400/10 text-emerald-300"
                              : "bg-emerald-50 text-emerald-700"
                            : darkMode
                              ? "bg-white/5 text-[#D0C4DA]"
                              : "bg-[#F8F5FC] text-[#857A91]"
                        }`}
                      >
                        {cat.pedigree ? "Şeceresi var" : "Şeceresi yok"}
                      </span>
                    </div>

                    {cat.description && (
                      <p
                        className={`mt-4 line-clamp-3 text-sm leading-6 ${
                          darkMode ? "text-[#D0C4DA]" : "text-[#857A91]"
                        }`}
                      >
                        {cat.description}
                      </p>
                    )}

                    <div
                      className={`mt-5 flex items-center justify-between border-t pt-4 ${
                        darkMode ? "border-white/10" : "border-[#F0EAF6]"
                      }`}
                    >
                      <span className="text-sm font-bold text-[#A184D5]">
                        İlan detayları
                      </span>
                      <span
                        className="text-lg text-[#A184D5] transition group-hover:translate-x-1"
                        aria-hidden="true"
                      >
                        →
                      </span>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <footer
        className={`border-t ${
          darkMode
            ? "border-white/10 bg-[#191521]"
            : "border-[#ECE5F3] bg-white"
        }`}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link
            href="/"
            className="inline-flex w-fit items-center rounded-lg"
            aria-label="CAT-ALOG ana sayfa"
          >
            <VisualIcon
              src={logoSrc}
              alt="CAT-ALOG"
              fallback="CAT-ALOG"
              darkMode={darkMode}
              themeAware={false}
              className="h-auto w-40 object-contain sm:w-48"
            />
          </Link>

          <p
            className={`text-sm ${
              darkMode ? "text-[#D0C4DA]" : "text-[#8B8196]"
            }`}
          >
            Minik dostlar için yeni başlangıçlar.
          </p>

          <a
            href="#ilanlar"
            className="text-sm font-bold text-[#A184D5] transition hover:text-[#8B68BB]"
          >
            İlanları keşfet ↑
          </a>
        </div>
      </footer>
    </main>
  );
}
