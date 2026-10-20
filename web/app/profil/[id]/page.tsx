
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
  created_at: string;
};

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
  is_active: boolean;
  created_at: string;
};

type Review = {
  id: string;
  reviewer_id: string;
  reviewed_user_id: string;
  rating: number;
  comment: string;
  created_at: string;
};

type ReviewerProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

export default function ProfilePage() {
  const params = useParams();
  const profileId = params.id as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [cats, setCats] = useState<Cat[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewerProfiles, setReviewerProfiles] = useState<
    Record<string, ReviewerProfile>
  >({});

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [myReview, setMyReview] = useState<Review | null>(null);

  const [canReview, setCanReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isOwnProfile = !!currentUserId && currentUserId === profileId;

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((total, review) => total + review.rating, 0) /
        reviews.length
      : 0;

  const renderStars = (value: number) =>
    [1, 2, 3, 4, 5].map((star) => (
      <span
        key={star}
        className={
          star <= Math.round(value)
            ? "text-amber-500"
            : "text-[#DCD5E6]"
        }
      >
        ★
      </span>
    ));

  const loadReviews = useCallback(async () => {
    const { data, error: reviewsError } = await supabase
      .from("reviews")
      .select(
        "id, reviewer_id, reviewed_user_id, rating, comment, created_at"
      )
      .eq("reviewed_user_id", profileId)
      .order("created_at", { ascending: false });

    if (reviewsError) {
      console.error("Değerlendirmeler yüklenemedi:", reviewsError);
      setError("Değerlendirmeler yüklenemedi.");
      return;
    }

    const reviewList = (data ?? []) as Review[];
    setReviews(reviewList);

    const myExistingReview =
      reviewList.find((review) => review.reviewer_id === currentUserId) ??
      null;

    setMyReview(myExistingReview);

    if (myExistingReview) {
      setRating(myExistingReview.rating);
      setComment(myExistingReview.comment ?? "");
    } else {
      setRating(0);
      setComment("");
    }

    setHoverRating(0);

    const reviewerIds = [
      ...new Set(reviewList.map((review) => review.reviewer_id)),
    ];

    if (reviewerIds.length === 0) {
      setReviewerProfiles({});
      return;
    }

    const { data: people, error: peopleError } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", reviewerIds);

    if (peopleError) {
      console.error("Değerlendiren profilleri yüklenemedi:", peopleError);
      return;
    }

    const profileMap: Record<string, ReviewerProfile> = {};

    for (const person of (people ?? []) as ReviewerProfile[]) {
      profileMap[person.id] = person;
    }

    setReviewerProfiles(profileMap);
  }, [profileId, currentUserId]);

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (authError) {
        console.error("Oturum kontrolü başarısız:", authError);
      }

      const userId = user?.id ?? null;
      setCurrentUserId(userId);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id, display_name, city, avatar_url, bio, age, cat_count, cat_years, created_at"
        )
        .eq("id", profileId)
        .maybeSingle();

      if (cancelled) return;

      if (profileError) {
        console.error("Profil yüklenemedi:", profileError);
        setError("Profil yüklenirken bir hata oluştu.");
        setLoading(false);
        return;
      }

      if (!profileData) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setProfile(profileData as Profile);

      const { data: catData, error: catsError } = await supabase
        .from("cats")
        .select(
          "id, owner_id, name, breed, age_years, gender, city, color, photo_urls, description, is_active, created_at"
        )
        .eq("owner_id", profileId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (catsError) {
        console.error("Kedi ilanları yüklenemedi:", catsError);
      } else {
        setCats((catData ?? []) as Cat[]);
      }

      if (userId && userId !== profileId) {
        const { data: messages, error: messagesError } = await supabase
          .from("messages")
          .select("id")
          .or(
            `and(sender_id.eq.${userId},recipient_id.eq.${profileId}),and(sender_id.eq.${profileId},recipient_id.eq.${userId})`
          )
          .limit(1);

        if (cancelled) return;

        if (messagesError) {
          console.error(
            "Mesajlaşma geçmişi kontrol edilemedi:",
            messagesError
          );
          setCanReview(false);
        } else {
          setCanReview((messages ?? []).length > 0);
        }
      } else {
        setCanReview(false);
      }

      setLoading(false);
    }

    loadPage();

    return () => {
      cancelled = true;
    };
  }, [profileId]);

  useEffect(() => {
    if (currentUserId !== null || !loading) {
      loadReviews();
    }
  }, [currentUserId, loading, loadReviews]);

  async function submitReview() {
    setError("");
    setSuccess("");

    if (!currentUserId) {
      setError("Değerlendirme yapmak için giriş yapmalısın.");
      return;
    }

    if (currentUserId === profileId) {
      setError("Kendi profilini değerlendiremezsin.");
      return;
    }

    if (!canReview && !myReview) {
      setError(
        "Değerlendirme yapmak için önce bu kullanıcıyla mesajlaşmalısın."
      );
      return;
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setError("Lütfen göndermeden önce 1–5 yıldız arasında bir puan seç.");
      return;
    }

    if (!comment.trim()) {
      setError("Lütfen yorumunu yaz.");
      return;
    }

    setSaving(true);

    const reviewData = {
      rating,
      comment: comment.trim(),
    };

    const result = myReview
      ? await supabase
          .from("reviews")
          .update(reviewData)
          .eq("id", myReview.id)
          .eq("reviewer_id", currentUserId)
      : await supabase.from("reviews").insert({
          ...reviewData,
          reviewer_id: currentUserId,
          reviewed_user_id: profileId,
        });

    if (result.error) {
      console.error("Değerlendirme kaydedilemedi:", result.error);
      setError(`Değerlendirme kaydedilemedi: ${result.error.message}`);
      setSaving(false);
      return;
    }

    setSuccess("Değerlendirmen kaydedildi.");
    await loadReviews();
    setSaving(false);
  }

  async function deleteReview() {
    if (!myReview || !currentUserId) return;

    const confirmed = window.confirm(
      "Değerlendirmeni silmek istediğine emin misin?"
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setSaving(true);

    const { error: deleteError } = await supabase
      .from("reviews")
      .delete()
      .eq("id", myReview.id)
      .eq("reviewer_id", currentUserId);

    if (deleteError) {
      console.error("Değerlendirme silinemedi:", deleteError);
      setError(`Değerlendirme silinemedi: ${deleteError.message}`);
      setSaving(false);
      return;
    }

    setRating(0);
    setHoverRating(0);
    setComment("");
    setMyReview(null);
    setSuccess("Değerlendirmen silindi.");

    await loadReviews();
    setSaving(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAF8FC] px-4 py-12 text-center text-[#624B82]">
        Profil yükleniyor...
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-[#FAF8FC] px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-[#624B82]">
          Profil bulunamadı
        </h1>
        <Link href="/" className="mt-4 inline-block text-[#624B82] underline">
          Ana sayfaya dön
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF8FC] px-4 py-8 text-[#30283A]">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-[#624B82] hover:underline"
        >
          ← Ana sayfa
        </Link>

        <section className="rounded-3xl border border-[#EAE3F1] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name ?? "Profil fotoğrafı"}
                className="h-28 w-28 rounded-full border-4 border-[#F0EAF6] object-cover"
              />
            ) : (
              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-[#EEE7F5] text-4xl font-bold text-[#624B82]">
                {(profile.display_name?.trim().charAt(0) || "?").toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-black text-[#624B82]">
                {profile.display_name || "İsimsiz kullanıcı"}
              </h1>

              {profile.city && (
                <p className="mt-2 text-sm text-[#777080]">
                  📍 {profile.city}
                </p>
              )}

              {profile.age != null && (
                <p className="mt-1 text-sm text-[#777080]">
                  {profile.age} yaşında
                </p>
              )}

              {profile.bio && (
                <p className="mt-4 whitespace-pre-wrap leading-7 text-[#554B60]">
                  {profile.bio}
                </p>
              )}

              {(profile.cat_count != null || profile.cat_years != null) && (
                <div className="mt-4 flex flex-wrap gap-3 text-sm text-[#777080]">
                  {profile.cat_count != null && (
                    <span className="rounded-full bg-[#F5F0F9] px-3 py-2">
                      🐈 Kedi sayısı: {profile.cat_count}
                    </span>
                  )}
                  {profile.cat_years != null && (
                    <span className="rounded-full bg-[#F5F0F9] px-3 py-2">
                      🐾 Kedi deneyimi: {profile.cat_years} yıl
                    </span>
                  )}
                </div>
              )}

              {reviews.length > 0 && (
                <div className="mt-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-4xl font-black tracking-tight text-[#624B82]">
                      {averageRating.toFixed(1)}
                    </span>
                    <div>
                      <div className="text-2xl leading-none">
                        {renderStars(averageRating)}
                      </div>
                      <p className="mt-1 text-sm text-[#777080]">
                        {reviews.length} değerlendirme
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isOwnProfile && (
                <Link
                  href="/profil-tamamla"
                  className="mt-5 inline-block rounded-xl bg-[#624B82] px-5 py-3 text-sm font-semibold text-white hover:bg-[#503B6C]"
                >
                  Profili düzenle
                </Link>
              )}
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-black text-[#624B82]">
              Kedi ilanları
            </h2>
            <span className="text-sm text-[#777080]">
              {cats.length} ilan
            </span>
          </div>

          {cats.length === 0 ? (
            <div className="rounded-2xl border border-[#EAE3F1] bg-white p-6 text-[#777080]">
              Bu kullanıcının şu anda aktif kedi ilanı bulunmuyor.
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {cats.map((cat) => (
                <article
                  key={cat.id}
                  className="overflow-hidden rounded-2xl border border-[#EAE3F1] bg-white shadow-sm"
                >
                  {cat.photo_urls?.[0] ? (
                    <img
                      src={cat.photo_urls[0]}
                      alt={cat.name}
                      className="h-52 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-52 items-center justify-center bg-[#EEE7F5] text-5xl">
                      🐈
                    </div>
                  )}

                  <div className="p-5">
                    <h3 className="text-xl font-bold text-[#624B82]">
                      {cat.name}
                    </h3>

                    <div className="mt-2 space-y-1 text-sm text-[#777080]">
                      {cat.breed && <p>Irk: {cat.breed}</p>}
                      {cat.age_years != null && (
                        <p>Yaş: {cat.age_years}</p>
                      )}
                      {cat.gender && <p>Cinsiyet: {cat.gender}</p>}
                      {cat.color && <p>Renk: {cat.color}</p>}
                      {cat.city && <p>Şehir: {cat.city}</p>}
                    </div>

                    {cat.description && (
                      <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-[#554B60]">
                        {cat.description}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <h2 className="mb-4 text-2xl font-black text-[#624B82]">
            Değerlendirmeler
          </h2>

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
            >
              {success}
            </div>
          )}

          {!isOwnProfile && currentUserId && (canReview || myReview) && (
            <div className="mb-6 rounded-2xl border border-[#EAE3F1] bg-white p-6">
              <h3 className="text-lg font-bold text-[#624B82]">
                {myReview
                  ? "Değerlendirmeni düzenle"
                  : "Bu kullanıcıyı değerlendir"}
              </h3>

              <p className="mt-2 text-sm text-[#777080]">
                Puan vermek için yıldızlardan birini seç.
              </p>

              <div
                className="mt-4 flex items-center gap-1"
                role="group"
                aria-label="Puan seçimi"
              >
                {[1, 2, 3, 4, 5].map((value) => {
                  const previewRating = hoverRating || rating;
                  const isHovered =
                    hoverRating > 0 && value <= hoverRating;

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setRating(value);
                        setError("");
                        setSuccess("");
                      }}
                      onMouseEnter={() => setHoverRating(value)}
                      onMouseLeave={() => setHoverRating(0)}
                      aria-label={`${value} yıldız`}
                      aria-pressed={rating === value}
                      className={`rounded-lg p-1 text-4xl transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#624B82] ${
                        value <= previewRating
                          ? isHovered
                            ? "text-amber-400/70"
                            : "text-amber-500"
                          : "text-[#DCD5E6]"
                      }`}
                    >
                      ★
                    </button>
                  );
                })}

                <span className="ml-2 text-sm text-[#777080]">
                  {hoverRating > 0
                    ? `${hoverRating}/5`
                    : rating > 0
                      ? `${rating}/5`
                      : "Puan seçilmedi"}
                </span>
              </div>

              <label
                htmlFor="review-comment"
                className="mt-5 block text-sm font-semibold text-[#554B60]"
              >
                Yorumun
              </label>

              <textarea
                id="review-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Deneyimini paylaş..."
                rows={4}
                maxLength={2000}
                className="mt-2 w-full rounded-xl border border-[#DDD3E8] bg-white p-3 outline-none focus:border-[#624B82] focus:ring-2 focus:ring-[#624B82]/15"
              />

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={submitReview}
                  disabled={saving}
                  className="rounded-xl bg-[#624B82] px-5 py-3 font-semibold text-white hover:bg-[#503B6C] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Kaydediliyor..."
                    : myReview
                      ? "Değerlendirmeyi güncelle"
                      : "Değerlendirmeyi gönder"}
                </button>

                {myReview && (
                  <button
                    type="button"
                    onClick={deleteReview}
                    disabled={saving}
                    className="rounded-xl border border-red-200 px-5 py-3 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    Değerlendirmeyi sil
                  </button>
                )}
              </div>
            </div>
          )}

          {!isOwnProfile && !currentUserId && (
            <p className="mb-6 rounded-xl bg-white p-5 text-sm text-[#777080]">
              Değerlendirme yapmak için giriş yapmalısın.
            </p>
          )}

          {!isOwnProfile && currentUserId && !canReview && !myReview && (
            <p className="mb-6 rounded-xl bg-white p-5 text-sm text-[#777080]">
              Değerlendirme yapabilmek için önce bu kullanıcıyla mesajlaşmalısın.
            </p>
          )}

          {reviews.length === 0 ? (
            <div className="rounded-2xl border border-[#EAE3F1] bg-white p-6 text-[#777080]">
              Henüz değerlendirme yapılmamış.
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => {
                const reviewer = reviewerProfiles[review.reviewer_id];

                return (
                  <article
                    key={review.id}
                    className="rounded-2xl border border-[#EAE3F1] bg-white p-5"
                  >
                    <div className="flex items-start gap-3">
                      {reviewer?.avatar_url ? (
                        <img
                          src={reviewer.avatar_url}
                          alt={reviewer.display_name ?? "Kullanıcı"}
                          className="h-11 w-11 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EEE7F5] font-bold text-[#624B82]">
                          {(
                            reviewer?.display_name?.trim().charAt(0) || "?"
                          ).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[#624B82]">
                          {reviewer?.display_name || "Kullanıcı"}
                        </p>

                        <div
                          className="mt-1 text-xl leading-none"
                          aria-label={`${review.rating} üzerinden 5 yıldız`}
                        >
                          {renderStars(review.rating)}
                        </div>

                        <p className="mt-2 whitespace-pre-wrap break-words leading-7 text-[#554B60]">
                          {review.comment}
                        </p>

                        <p className="mt-3 text-xs text-[#91889C]">
                          {new Date(review.created_at).toLocaleDateString(
                            "tr-TR"
                          )}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
