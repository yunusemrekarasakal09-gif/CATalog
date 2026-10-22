
"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type TouchEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/components/ThemeProvider";

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

function LoadingScreen() {
  const { darkMode, themeReady } = useTheme();

  const textColor = darkMode ? "#B8AEC6" : "#655A76";

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4"
      style={{
        backgroundColor: darkMode ? "#15121D" : "#FAF8FC",
        color: textColor,
      }}
    >
      <div className="flex flex-col items-center gap-4">
        <span
          className="h-10 w-10 animate-spin rounded-full border-4 border-[#A184D5]/25 border-t-[#A184D5]"
          aria-hidden="true"
        />
        <p className="text-sm font-medium">
          {themeReady ? "Kedi ilanı yükleniyor..." : "Tema yükleniyor..."}
        </p>
      </div>
    </main>
  );
}

export default function KediDetayPage() {
  return (
    <Suspense fallback={<main className="min-h-screen" />}>
      <KediDetayContent />
    </Suspense>
  );
}

function KediDetayContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { darkMode, toggleTheme, themeReady } = useTheme();
  const catId = params.id;

  const [cat, setCat] = useState<Cat | null>(null);
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [ownerAvatarFailed, setOwnerAvatarFailed] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const touchStart = useRef({ x: 0, y: 0 });
  const pinchStartDistance = useRef(0);
  const pinchStartZoom = useRef(1);
  const panStart = useRef({ x: 0, y: 0 });
  const pointerStart = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);

  const colors = darkMode
    ? {
        text: "#F5EFFB",
        muted: "#B8AEC6",
        card: "rgba(32, 27, 41, 0.94)",
        border: "rgba(255, 255, 255, 0.12)",
        input: "#201B29",
        primary: "#A184D5",
        primaryHover: "#8C6BC2",
        link: "#C4A8F1",
        divider: "rgba(255, 255, 255, 0.10)",
        soft: "rgba(161, 132, 213, 0.12)",
        errorBg: "rgba(239, 68, 68, 0.10)",
        errorBorder: "rgba(248, 113, 113, 0.3)",
        errorText: "#FCA5A5",
      }
    : {
        text: "#302542",
        muted: "#85818F",
        card: "rgba(255, 255, 255, 0.96)",
        border: "#ECE5F3",
        input: "#FFFFFF",
        primary: "#7251A5",
        primaryHover: "#62458F",
        link: "#7251A5",
        divider: "#F0EAF6",
        soft: "#F5F0FC",
        errorBg: "#FEF2F2",
        errorBorder: "#FECACA",
        errorText: "#B91C1C",
      };

  const pageBackground = darkMode ? "#15121D" : "#FAF8FC";

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

      if (!cancelled) setLoading(false);
    }

    void loadCat();

    return () => {
      cancelled = true;
    };
  }, [catId]);

  useEffect(() => {
    setOwnerAvatarFailed(false);
  }, [owner?.avatar_url]);

  const photos = (cat?.photo_urls ?? []).filter(
    (photo): photo is string => Boolean(photo)
  );

  const activePhoto = photos[selectedPhoto];

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    dragging.current = false;
  }, []);

  const closeGallery = useCallback(() => {
    setGalleryOpen(false);
    resetZoom();
  }, [resetZoom]);

  const changePhoto = useCallback(
    (direction: number) => {
      if (photos.length <= 1) return;

      setSelectedPhoto((current) => {
        return (current + direction + photos.length) % photos.length;
      });

      resetZoom();
    },
    [photos.length, resetZoom]
  );

  useEffect(() => {
    if (!galleryOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeGallery();

      if (event.key === "ArrowRight") {
        changePhoto(1);
      }

      if (event.key === "ArrowLeft") {
        changePhoto(-1);
      }

      if (event.key === "+" || event.key === "=") {
        setZoom((current) => Math.min(4, current + 0.25));
      }

      if (event.key === "-") {
        setZoom((current) => Math.max(1, current - 0.25));
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [galleryOpen, closeGallery, changePhoto]);

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touches = event.touches;

    if (touches.length === 2) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;

      pinchStartDistance.current = Math.hypot(dx, dy);
      pinchStartZoom.current = zoom;
      dragging.current = false;
      return;
    }

    if (touches.length === 1) {
      touchStart.current = {
        x: touches[0].clientX,
        y: touches[0].clientY,
      };
      pointerStart.current = touchStart.current;
      panStart.current = pan;
      dragging.current = zoom > 1;
    }
  }

  function handleTouchMove(event: TouchEvent<HTMLDivElement>) {
    const touches = event.touches;

    if (touches.length === 2) {
      event.preventDefault();

      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      const distance = Math.hypot(dx, dy);

      if (pinchStartDistance.current > 0) {
        const nextZoom =
          pinchStartZoom.current *
          (distance / pinchStartDistance.current);

        setZoom(Math.min(4, Math.max(1, nextZoom)));

        if (nextZoom <= 1) {
          setPan({ x: 0, y: 0 });
        }
      }

      return;
    }

    if (touches.length === 1 && zoom > 1 && dragging.current) {
      event.preventDefault();

      setPan({
        x: panStart.current.x + touches[0].clientX - pointerStart.current.x,
        y: panStart.current.y + touches[0].clientY - pointerStart.current.y,
      });
    }
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (event.touches.length < 2) {
      pinchStartDistance.current = 0;
    }

    if (event.touches.length === 0) {
      const dx = event.changedTouches[0].clientX - touchStart.current.x;
      const dy = event.changedTouches[0].clientY - touchStart.current.y;

      if (zoom === 1 && Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) {
        changePhoto(dx < 0 ? 1 : -1);
      }

      dragging.current = false;
    }
  }

  function zoomBy(amount: number) {
    setZoom((current) => {
      const next = Math.min(4, Math.max(1, current + amount));

      if (next === 1) setPan({ x: 0, y: 0 });

      return next;
    });
  }

  if (!themeReady || loading) {
    return <LoadingScreen />;
  }

  if (error || !cat) {
    return (
      <main
        className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12"
        style={{
          backgroundColor: pageBackground,
          color: colors.text,
          backgroundImage: `url("${
            darkMode
              ? "/images/brand/arkaplan1.png"
              : "/images/brand/arkaplan2.png"
          }")`,
          backgroundPosition: "center",
          backgroundSize: "cover",
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

        <section
          className="relative z-10 w-full max-w-xl rounded-3xl border p-8 text-center shadow-2xl backdrop-blur-xl"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
          }}
        >
          <p className="text-5xl" aria-hidden="true">
            🐈
          </p>

          <h1 className="mt-4 text-xl font-black">İlan açılamadı</h1>

          <p className="mt-2 text-sm leading-6" style={{ color: colors.muted }}>
            {error || "Aradığın ilan bulunamadı."}
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex rounded-xl px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: colors.primary }}
          >
            İlanlara dön
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{
        backgroundColor: pageBackground,
        color: colors.text,
        backgroundImage: `url("${
          darkMode
            ? "/images/brand/arkaplan1.png"
            : "/images/brand/arkaplan2.png"
        }")`,
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundAttachment: "fixed",
      }}
    >
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundColor: darkMode
            ? "rgba(21, 18, 29, 0.64)"
            : "rgba(250, 248, 252, 0.48)",
        }}
      />

      {/* Üst menü */}
      <header
        className="relative z-10 border-b backdrop-blur-xl"
        style={{
          backgroundColor: darkMode
            ? "rgba(32, 27, 41, 0.90)"
            : "rgba(255, 255, 255, 0.90)",
          borderColor: colors.border,
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/"
            aria-label="CATalog ana sayfası"
            className="flex min-w-0 items-center gap-2 transition hover:opacity-80"
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
              className="h-auto max-h-16 w-auto max-w-[200px] object-contain sm:max-h-[72px] sm:max-w-[240px]"
            />
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={darkMode ? "Açık temaya geç" : "Koyu temaya geç"}
              title={darkMode ? "Açık tema" : "Koyu tema"}
              className="flex h-[54px] w-[54px] items-center justify-center rounded-2xl border p-1.5 transition hover:scale-105"
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
                width={44}
                height={44}
                className="h-[44px] w-[44px] object-contain"
              />
            </button>

            <Link
              href="/"
              className="hidden rounded-xl border px-4 py-3 text-sm font-semibold transition hover:opacity-80 sm:inline-flex"
              style={{
                borderColor: colors.border,
                color: colors.text,
              }}
            >
              ← İlanlara dön
            </Link>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-5 sm:py-8">
        <Link
          href="/"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold transition hover:opacity-75 sm:hidden"
          style={{ color: colors.link }}
        >
          ← İlanlara dön
        </Link>

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.45fr_1fr] lg:gap-7">
          {/* Fotoğraflar ve açıklama */}
          <section
            className="min-w-0 overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-xl"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
            }}
          >
            {/* Ana fotoğraf */}
            <div
              className="group relative flex aspect-[4/3] items-center justify-center overflow-hidden"
              style={{
                backgroundColor: darkMode ? "#17131F" : "#F1EBF7",
              }}
            >
              {activePhoto ? (
                <button
                  type="button"
                  onClick={() => {
                    resetZoom();
                    setGalleryOpen(true);
                  }}
                  aria-label="Fotoğrafı tam ekran aç"
                  className="absolute inset-0 flex h-full w-full cursor-zoom-in items-center justify-center"
                >
                  <img
                    src={activePhoto}
                    alt={`${cat.name} fotoğrafı ${selectedPhoto + 1}`}
                    draggable={false}
                    className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.015]"
                  />

                  <span className="absolute bottom-3 right-3 flex items-center gap-2 rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-xs font-semibold text-white opacity-100 backdrop-blur-md transition sm:opacity-0 sm:group-hover:opacity-100">
                    <span aria-hidden="true">⛶</span>
                    Tam ekran görüntüle
                  </span>
                </button>
              ) : (
                <span className="text-8xl" aria-label="Fotoğraf yok">
                  🐈
                </span>
              )}

              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedPhoto(
                        (current) =>
                          (current - 1 + photos.length) % photos.length
                      )
                    }
                    aria-label="Önceki fotoğraf"
                    className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-2xl text-white shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-black/75"
                  >
                    ‹
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedPhoto(
                        (current) => (current + 1) % photos.length
                      )
                    }
                    aria-label="Sonraki fotoğraf"
                    className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-2xl text-white shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-black/75"
                  >
                    ›
                  </button>

                  <span className="absolute left-3 top-3 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
                    {selectedPhoto + 1} / {photos.length}
                  </span>
                </>
              )}
            </div>

            {/* Küçük fotoğraflar */}
            {photos.length > 0 && (
              <div
                className="flex gap-3 overflow-x-auto p-3 sm:p-4"
                aria-label="Fotoğraf galerisi"
              >
                {photos.map((photo, index) => (
                  <button
                    key={`${photo}-${index}`}
                    type="button"
                    onClick={() => setSelectedPhoto(index)}
                    onDoubleClick={() => {
                      setSelectedPhoto(index);
                      resetZoom();
                      setGalleryOpen(true);
                    }}
                    aria-label={`${index + 1}. fotoğrafı göster`}
                    aria-pressed={selectedPhoto === index}
                    className="h-[76px] w-[76px] shrink-0 overflow-hidden rounded-xl border-2 transition hover:scale-[1.03] sm:h-[88px] sm:w-[88px]"
                    style={{
                      borderColor:
                        selectedPhoto === index ? colors.primary : colors.border,
                      opacity: selectedPhoto === index ? 1 : 0.72,
                    }}
                  >
                    <img
                      src={photo}
                      alt={`${cat.name} küçük fotoğraf ${index + 1}`}
                      loading="lazy"
                      draggable={false}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            <div className="p-5 sm:p-7">
              <p
                className="text-xs font-extrabold tracking-[0.18em]"
                style={{ color: colors.primary }}
              >
                KEDİ İLANI
              </p>

              <h1 className="mt-2 break-words text-3xl font-black tracking-tight sm:text-4xl">
                {cat.name}
              </h1>

              <p
                className="mt-3 flex items-center gap-2 text-sm"
                style={{ color: colors.muted }}
              >
                <span aria-hidden="true">📍</span>
                {cat.city || "Şehir belirtilmemiş"}
              </p>

              <div
                className="my-6 border-t"
                style={{ borderColor: colors.divider }}
              />

              <h2 className="text-lg font-black">Kedi hakkında</h2>

              <p
                className="mt-3 whitespace-pre-wrap break-words text-sm leading-7"
                style={{ color: colors.muted }}
              >
                {cat.description?.trim() ||
                  "Bu kedi için henüz bir açıklama eklenmemiş."}
              </p>
            </div>
          </section>

          {/* Özellikler ve ilan sahibi */}
          <aside className="space-y-5">
            <section
              className="rounded-3xl border p-5 shadow-xl backdrop-blur-xl sm:p-6"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.border,
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl"
                  style={{ backgroundColor: colors.soft }}
                >
                  <Image
                    src={darkMode ? "/images/icons/kedi1.png" : "/images/icons/kedi2.png"}
                    alt=""
                    aria-hidden="true"
                    width={44}
                    height={44}
                    className="h-full w-full object-contain p-1.5"
                  />
                </div>
                <div>
                  <h2 className="text-xl font-black">Kedi özellikleri</h2>
                  <p className="mt-1 text-xs" style={{ color: colors.muted }}>
                    İlanın ayrıntıları
                  </p>
                </div>
              </div>

              <dl className="mt-5">
                {[
                  { label: "Cinsi", value: cat.breed || "Belirtilmemiş" },
                  {
                    label: "Yaşı",
                    value:
                      cat.age_years == null
                        ? "Belirtilmemiş"
                        : `${cat.age_years} yaş`,
                  },
                  {
                    label: "Cinsiyet",
                    value: cat.gender || "Belirtilmemiş",
                  },
                  { label: "Rengi", value: cat.color || "Belirtilmemiş" },
                  { label: "Şehir", value: cat.city || "Belirtilmemiş" },
                  ...(cat.created_at
                    ? [
                        {
                          label: "İlan tarihi",
                          value: new Date(cat.created_at).toLocaleDateString(
                            "tr-TR"
                          ),
                        },
                      ]
                    : []),
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start justify-between gap-4 border-b py-3 last:border-b-0"
                    style={{ borderColor: colors.divider }}
                  >
                    <dt className="text-sm" style={{ color: colors.muted }}>
                      {item.label}
                    </dt>
                    <dd className="max-w-[60%] break-words text-right text-sm font-bold">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <section
              className="rounded-3xl border p-5 shadow-xl backdrop-blur-xl sm:p-6"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.border,
              }}
            >
              <h2 className="text-lg font-black">İlan sahibi</h2>

              <div className="mt-4 flex items-center gap-3">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border text-2xl"
                  style={{
                    backgroundColor: colors.soft,
                    borderColor: colors.border,
                  }}
                >
                  {owner?.avatar_url && !ownerAvatarFailed ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={owner.avatar_url}
                      alt="İlan sahibinin profil fotoğrafı"
                      loading="lazy"
                      onError={() => setOwnerAvatarFailed(true)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Image
                      src={
                        darkMode
                          ? "/images/icons/user%20ikonu.png"
                          : "/images/icons/user%20ikonu2.png"
                      }
                      alt="Profil fotoğrafı yok"
                      width={56}
                      height={56}
                      className="h-full w-full object-contain p-2"
                    />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="break-words font-bold">
                    {owner?.display_name || "CATalog kullanıcısı"}
                  </p>
                  <p
                    className="mt-1 text-sm"
                    style={{ color: colors.muted }}
                  >
                    📍 {owner?.city || cat.city || "Şehir belirtilmemiş"}
                  </p>
                </div>
              </div>

              <Link
                href={`/profil/${cat.owner_id}`}
                className="mt-5 flex w-full items-center justify-center rounded-xl border px-4 py-3 text-sm font-bold transition hover:opacity-80"
                style={{
                  borderColor: colors.border,
                  color: colors.link,
                }}
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
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5"
                style={{ backgroundColor: colors.primary }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.backgroundColor =
                    colors.primaryHover;
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.backgroundColor = colors.primary;
                }}
              >
                <span aria-hidden="true">✉</span>
                Mesaj gönder
              </button>

              <p
                className="mt-3 text-xs leading-5"
                style={{ color: colors.muted }}
              >
                Mesajlaşmak için hesabına giriş yapman gerekebilir.
              </p>
            </section>
          </aside>
        </div>
      </div>

      {/* Tam ekran fotoğraf galerisi */}
      {galleryOpen && activePhoto && (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-black/95 text-white backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-label={`${cat.name} fotoğraf galerisi`}
        >
          {/* Galeri üst çubuğu */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{cat.name}</p>
              <p className="mt-1 text-xs text-white/60">
                Fotoğraf {selectedPhoto + 1} / {photos.length}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => zoomBy(-0.25)}
                disabled={zoom <= 1}
                aria-label="Uzaklaştır"
                title="Uzaklaştır"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-xl transition hover:bg-white/20 disabled:opacity-40"
              >
                −
              </button>

              <button
                type="button"
                onClick={() => zoomBy(0.25)}
                disabled={zoom >= 4}
                aria-label="Yakınlaştır"
                title="Yakınlaştır"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-xl transition hover:bg-white/20 disabled:opacity-40"
              >
                +
              </button>

              <button
                type="button"
                onClick={resetZoom}
                aria-label="Yakınlaştırmayı sıfırla"
                title="Yakınlaştırmayı sıfırla"
                className="hidden h-10 rounded-xl border border-white/15 bg-white/10 px-3 text-xs font-semibold transition hover:bg-white/20 sm:block"
              >
                %{Math.round(zoom * 100)}
              </button>

              <button
                type="button"
                onClick={closeGallery}
                aria-label="Galeriyi kapat"
                title="Kapat (Esc)"
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-2xl transition hover:bg-white/20"
              >
                ×
              </button>
            </div>
          </div>

          {/* Ana görüntüleme alanı */}
          <div
            className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
            style={{ touchAction: "none" }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={() => {
              dragging.current = false;
              pinchStartDistance.current = 0;
            }}
            onWheel={(event) => {
              if (event.deltaY < 0) {
                zoomBy(0.15);
              } else if (event.deltaY > 0) {
                zoomBy(-0.15);
              }
            }}
            onDoubleClick={() => {
              if (zoom > 1) {
                resetZoom();
              } else {
                setZoom(2);
              }
            }}
          >
            {photos.length > 1 && (
              <button
                type="button"
                onClick={() => changePhoto(-1)}
                aria-label="Önceki fotoğraf"
                className="absolute left-2 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/50 text-3xl transition hover:bg-black/80 sm:left-5 sm:h-14 sm:w-14"
              >
                ‹
              </button>
            )}

            <img
              key={activePhoto}
              src={activePhoto}
              alt={`${cat.name} fotoğrafı ${selectedPhoto + 1}`}
              draggable={false}
              className="max-h-full max-w-full select-none object-contain"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transition:
                  dragging.current || zoom > 1 ? "none" : "transform 180ms ease",
                cursor: zoom > 1 ? "grab" : "zoom-in",
                maxHeight: "100%",
                maxWidth: "100%",
              }}
            />

            {photos.length > 1 && (
              <button
                type="button"
                onClick={() => changePhoto(1)}
                aria-label="Sonraki fotoğraf"
                className="absolute right-2 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/50 text-3xl transition hover:bg-black/80 sm:right-5 sm:h-14 sm:w-14"
              >
                ›
              </button>
            )}

            <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-xl bg-black/60 px-3 py-2 text-center text-[11px] text-white/75 backdrop-blur-md sm:bottom-5 sm:text-xs">
              Mobilde iki parmakla yakınlaştır · Kaydırarak fotoğraf değiştir
            </p>
          </div>

          {/* Küçük fotoğraf şeridi */}
          {photos.length > 1 && (
            <div className="flex shrink-0 justify-center gap-2 overflow-x-auto border-t border-white/10 px-3 py-3">
              {photos.map((photo, index) => (
                <button
                  key={`${photo}-${index}`}
                  type="button"
                  onClick={() => {
                    setSelectedPhoto(index);
                    resetZoom();
                  }}
                  aria-label={`${index + 1}. fotoğrafa geç`}
                  aria-pressed={selectedPhoto === index}
                  className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition sm:h-16 sm:w-16"
                  style={{
                    borderColor:
                      selectedPhoto === index ? "#A184D5" : "transparent",
                    opacity: selectedPhoto === index ? 1 : 0.55,
                  }}
                >
                  <img
                    src={photo}
                    alt=""
                    draggable={false}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
