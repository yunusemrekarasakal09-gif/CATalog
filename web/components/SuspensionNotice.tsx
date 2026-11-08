
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Suspension = {
  reason: string;
  banned_until: string | null;
  is_permanent: boolean;
};

export default function SuspensionNotice() {
  const [suspension, setSuspension] = useState<Suspension | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let requestVersion = 0;

    async function loadSuspension(userId: string | null) {
      const version = ++requestVersion;

      setSuspension(null);
      setLoading(true);

      if (!userId) {
        if (mounted && version === requestVersion) {
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("user_suspensions")
        .select("reason, banned_until, is_permanent")
        .eq("user_id", userId)
        .maybeSingle();

      if (!mounted || version !== requestVersion) return;

      if (error) {
        console.error("Kısıtlama bilgisi alınamadı:", error);
        setLoading(false);
        return;
      }

      if (!data) {
        setLoading(false);
        return;
      }

      const active =
        data.is_permanent ||
        data.banned_until === null ||
        new Date(data.banned_until).getTime() > Date.now();

      setSuspension(active ? data : null);
      setLoading(false);
    }

    async function initialize() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.error("Oturum bilgisi alınamadı:", error);
        setLoading(false);
        return;
      }

      await loadSuspension(session?.user?.id ?? null);
    }

    // Önce mevcut oturumu kontrol et.
    void initialize();

    // Sonraki giriş ve çıkışları takip et.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;

      void loadSuspension(session?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      requestVersion++;
      subscription.unsubscribe();
    };
  }, []);

  if (loading || !suspension) return null;

  const endDate = suspension.banned_until
    ? new Date(suspension.banned_until).toLocaleString("tr-TR")
    : null;

  return (
    <div className="border-b border-red-200 bg-red-50 px-4 py-4 text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
      <div className="mx-auto flex max-w-7xl items-start gap-3">
        <div className="mt-0.5 text-xl" aria-hidden="true">
          ⚠️
        </div>

        <div className="min-w-0">
          <h2 className="font-bold">Hesabınız kısıtlandı</h2>

          <p className="mt-1 text-sm leading-6">
            Hesabınız CATalog yönetimi tarafından{" "}
            {suspension.is_permanent
              ? "kalıcı olarak"
              : "geçici olarak"}{" "}
            kısıtlanmıştır.
          </p>

          <p className="mt-2 text-sm">
            <strong>Kısıtlama gerekçesi:</strong>{" "}
            {suspension.reason}
          </p>

          <p className="mt-1 text-sm">
            <strong>Kısıtlama süresi:</strong>{" "}
            {suspension.is_permanent
              ? "Süresiz"
              : endDate
                ? `${endDate} tarihine kadar`
                : "Bitiş tarihi belirtilmemiş"}
          </p>

          <p className="mt-2 text-xs opacity-75">
            Bu süre boyunca ilan oluşturma, mesaj gönderme,
            favorilere ekleme ve diğer kullanıcı işlemleri
            kullanılamaz. Siteyi görüntülemeye devam edebilirsiniz.
          </p>
        </div>
      </div>
    </div>
  );
}
