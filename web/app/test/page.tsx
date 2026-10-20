import { Suspense } from "react";
import { connection } from "next/server";
import { supabase } from "@/lib/supabase";

async function TestResult() {
  await connection();

  const { data, error } = await supabase
    .from("cats")
    .select("id")
    .limit(1);

  return (
    <>
      {error ? (
        <p>Bağlantı sorgusu hata verdi: {error.message}</p>
      ) : (
        <p>Supabase sorgusu başarılı! Bulunan kayıt: {data?.length ?? 0}</p>
      )}
    </>
  );
}

export default function TestPage() {
  return (
    <main style={{ padding: 30, fontFamily: "sans-serif" }}>
      <h1>CAT-ALOG bağlantı testi</h1>
      <Suspense fallback={<p>Supabase bağlantısı kontrol ediliyor...</p>}>
        <TestResult />
      </Suspense>
    </main>
  );
}
