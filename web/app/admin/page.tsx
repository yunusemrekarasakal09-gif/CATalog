
import { Suspense } from "react";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin";
import ReportStatusControl from "./report-status-control";
import UserManagement from "./user-management";
import { sendSupportReply } from "./actions";

async function submitSupportReply(formData: FormData) {
  "use server";

  const userId = String(formData.get("user_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!userId || !body) return;

  await sendSupportReply(userId, body);
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#FAF8FC] text-[#302542] dark:bg-[#15121D] dark:text-[#F5EFFB]">
          Yönetim paneli yükleniyor...
        </main>
      }
    >
      <AdminContent />
    </Suspense>
  );
}

async function AdminContent() {
  await connection();

  const { supabase, user } = await requireAdmin();

  const { data: reports, error } = await supabase
    .from("reports")
    .select(
      "id, reporter_id, reported_user_id, cat_id, reason, status, created_at"
    )
    .order("created_at", { ascending: false });

  const { count: userCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  const { count: reportCount } = await supabase
    .from("reports")
    .select("*", { count: "exact", head: true });

  const { data: users, error: usersError } = await supabase
    .from("profiles")
    .select("id, display_name, city, bio, age, cat_count, created_at")
    .order("created_at", { ascending: false });

  const { data: suspensions, error: suspensionsError } = await supabase
    .from("user_suspensions")
    .select("user_id, reason, banned_until, is_permanent, created_at");

  // CATalog Team mesajları
  const {
    data: supportMessages,
    error: supportError,
  } = await supabase
    .from("support_messages")
    .select("id, user_id, sender_role, body, created_at, read_at")
    .order("created_at", { ascending: false })
    .limit(500);

  const supportUserIds = [
    ...new Set((supportMessages ?? []).map((message) => message.user_id)),
  ];

  const { data: supportUsers, error: supportUsersError } =
    supportUserIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, display_name, city")
          .in("id", supportUserIds)
      : { data: [], error: null };

  const profileMap = new Map(
    (supportUsers ?? []).map((profile) => [profile.id, profile])
  );

  const supportGroups = new Map<
    string,
    NonNullable<typeof supportMessages>
  >();

  for (const message of supportMessages ?? []) {
    const existing = supportGroups.get(message.user_id) ?? [];
    existing.push(message);
    supportGroups.set(message.user_id, existing);
  }

  const supportConversations = Array.from(supportGroups.entries()).sort(
    (a, b) =>
      new Date(b[1][0].created_at).getTime() -
      new Date(a[1][0].created_at).getTime()
  );

  // Her konuşmada yalnızca en son mesajı kontrol et.
  // Son mesaj kullanıcıdan geldiyse ekip yanıtı bekleniyordur.
  const waitingSupportCount = Array.from(supportGroups.values()).filter(
    (conversationMessages) => conversationMessages[0]?.sender_role === "user"
  ).length;

  const pendingCount =
    reports?.filter((report) => report.status === "pending").length ?? 0;

  const statusLabels: Record<string, string> = {
    pending: "Beklemede",
    reviewing: "İnceleniyor",
    resolved: "Sonuçlandırıldı",
    dismissed: "Reddedildi",
  };

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    reviewing: "bg-blue-100 text-blue-800",
    resolved: "bg-green-100 text-green-800",
    dismissed: "bg-red-100 text-red-800",
  };

  return (
    <main className="min-h-screen bg-[#FAF8FC] px-4 py-8 text-[#302542] dark:bg-[#15121D] dark:text-[#F5EFFB] sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#8C6BC2]">
              CAT-ALOG YÖNETİM
            </p>

            <h1 className="mt-2 text-3xl font-extrabold">
              Yönetim Paneli
            </h1>

            <p className="mt-2 text-sm opacity-65">
              Hoş geldin, yönetici.
            </p>
          </div>

          <a
            href="/"
            className="rounded-xl border border-[#A184D5]/30 px-5 py-3 text-sm font-semibold transition hover:bg-[#A184D5]/10"
          >
            Siteye dön →
          </a>
        </header>

        {/* İstatistikler */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Toplam kullanıcı" value={userCount ?? 0} />
          <StatCard title="Toplam şikâyet" value={reportCount ?? 0} />
          <StatCard title="Bekleyen şikâyet" value={pendingCount} />
          <StatCard title="Yanıt bekleyen konuşma" value={waitingSupportCount} />
        </section>

        {/* CATalog Team Gelen Kutusu */}
        <section className="mb-8 rounded-2xl border border-[#A184D5]/20 bg-white p-5 shadow-sm dark:bg-[#201B29] sm:p-7">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">CATalog Team Gelen Kutusu</h2>
              <p className="mt-1 text-sm opacity-60">
                Kullanıcıların geri bildirimlerini ve destek mesajlarını buradan
                yanıtlayabilirsin.
              </p>
            </div>

            <span className="rounded-full bg-[#A184D5]/15 px-3 py-1 text-sm font-bold text-[#8C6BC2]">
              {supportConversations.length} konuşma
            </span>
          </div>

          {supportError || supportUsersError ? (
            <p className="rounded-xl bg-red-100 p-4 text-sm text-red-700">
              Mesajlar yüklenemedi:{" "}
              {supportError?.message ?? supportUsersError?.message}
            </p>
          ) : supportConversations.length === 0 ? (
            <div className="rounded-xl bg-[#A184D5]/10 p-8 text-center">
              <p className="font-semibold">Henüz destek mesajı bulunmuyor.</p>
              <p className="mt-2 text-sm opacity-60">
                Kullanıcılardan gelen mesajlar burada görünecek.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {supportConversations.map(([userId, messages]) => {
                const profile = profileMap.get(userId);
                const orderedMessages = [...messages].reverse();

                return (
                  <article
                    key={userId}
                    className="overflow-hidden rounded-xl border border-[#A184D5]/20"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-[#A184D5]/10 p-4">
                      <div>
                        <p className="font-bold">
                          {profile?.display_name || "İsimsiz kullanıcı"}
                        </p>
                        <p className="mt-1 text-xs opacity-60">
                          {profile?.city || "Şehir belirtilmemiş"}
                        </p>
                        <p className="mt-1 break-all text-xs opacity-50">
                          Kullanıcı ID: {userId}
                        </p>
                      </div>

                      <span className="text-xs opacity-60">
                        {messages.length} mesaj
                      </span>
                    </div>

                    <div className="max-h-[420px] space-y-3 overflow-y-auto p-4">
                      {orderedMessages.map((message) => {
                        const isTeam = message.sender_role === "team";

                        return (
                          <div
                            key={message.id}
                            className={`flex ${
                              isTeam ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[85%] rounded-2xl p-3 sm:max-w-[75%] ${
                                isTeam
                                  ? "bg-[#8C6BC2] text-white"
                                  : "bg-[#A184D5]/10"
                              }`}
                            >
                              <p className="mb-2 text-xs font-bold opacity-75">
                                {isTeam ? "CATalog Team" : "Kullanıcı"}
                              </p>

                              <p className="whitespace-pre-wrap break-words text-sm">
                                {message.body}
                              </p>

                              <p className="mt-2 text-right text-[10px] opacity-60">
                                {new Date(message.created_at).toLocaleString(
                                  "tr-TR"
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <form
                      action={submitSupportReply}
                      className="border-t border-[#A184D5]/20 p-4"
                    >
                      <input
                        type="hidden"
                        name="user_id"
                        value={userId}
                      />

                      <label className="mb-2 block text-sm font-bold">
                        CATalog Team olarak yanıtla
                      </label>

                      <textarea
                        name="body"
                        required
                        maxLength={4000}
                        rows={3}
                        placeholder="Yanıtını buraya yaz..."
                        className="w-full resize-y rounded-xl border border-[#A184D5]/25 bg-[#FAF8FC] p-3 text-sm outline-none transition focus:border-[#8C6BC2] dark:bg-[#15121D]"
                      />

                      <div className="mt-3 flex justify-end">
                        <button
                          type="submit"
                          className="rounded-xl bg-[#8C6BC2] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
                        >
                          Yanıtı gönder
                        </button>
                      </div>
                    </form>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Kullanıcı yönetimi */}
        <section className="mb-8 rounded-2xl border border-[#A184D5]/20 bg-white p-5 shadow-sm dark:bg-[#201B29] sm:p-7">
          <div className="mb-6">
            <h2 className="text-xl font-bold">Kullanıcı Yönetimi</h2>

            <p className="mt-1 text-sm opacity-60">
              Kullanıcıları ara, hesap bilgilerini incele ve gerektiğinde
              geçici veya kalıcı kısıtlama uygula.
            </p>
          </div>

          {usersError || suspensionsError ? (
            <p className="rounded-xl bg-red-100 p-4 text-sm text-red-700">
              Kullanıcı bilgileri yüklenemedi:{" "}
              {usersError?.message ?? suspensionsError?.message}
            </p>
          ) : (
            <UserManagement
              users={users ?? []}
              suspensions={suspensions ?? []}
            />
          )}
        </section>

        {/* Şikâyet yönetimi */}
        <section className="rounded-2xl border border-[#A184D5]/20 bg-white p-5 shadow-sm dark:bg-[#201B29] sm:p-7">
          <div className="mb-6">
            <h2 className="text-xl font-bold">Şikâyet Yönetimi</h2>

            <p className="mt-1 text-sm opacity-60">
              Kullanıcıların gönderdiği şikâyetleri buradan inceleyebilirsin.
            </p>
          </div>

          {error ? (
            <p className="rounded-xl bg-red-100 p-4 text-sm text-red-700">
              Şikâyetler yüklenemedi: {error.message}
            </p>
          ) : !reports || reports.length === 0 ? (
            <div className="rounded-xl bg-[#A184D5]/10 p-8 text-center">
              <p className="font-semibold">Henüz şikâyet bulunmuyor.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <article
                  key={report.id}
                  className="rounded-xl border border-[#A184D5]/20 p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm font-bold">
                      Şikâyet #{report.id.slice(0, 8)}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        statusColors[report.status] ??
                        "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {statusLabels[report.status] ?? report.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <Info label="Şikâyet eden" value={report.reporter_id} />

                    <Info
                      label="Şikâyet edilen"
                      value={report.reported_user_id ?? "Belirtilmemiş"}
                    />

                    <Info
                      label="İlgili ilan"
                      value={report.cat_id ?? "Belirtilmemiş"}
                    />

                    <Info
                      label="Tarih"
                      value={new Date(report.created_at).toLocaleString(
                        "tr-TR"
                      )}
                    />
                  </div>

                  <div className="mt-4 rounded-xl bg-[#A184D5]/10 p-4">
                    <p className="mb-2 text-xs font-bold opacity-60">
                      ŞİKÂYET NEDENİ
                    </p>

                    <p className="whitespace-pre-wrap text-sm">
                      {report.reason}
                    </p>
                  </div>

                  <ReportStatusControl
                    reportId={report.id}
                    currentStatus={report.status}
                  />
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="mt-6 text-center text-xs opacity-50">
          Yönetici: {user.email}
        </footer>
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-[#A184D5]/20 bg-white p-5 shadow-sm dark:bg-[#201B29]">
      <p className="text-sm opacity-60">{title}</p>

      <p className="mt-3 text-3xl font-extrabold text-[#8C6BC2]">
        {value}
      </p>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs opacity-55">{label}</p>
      <p className="mt-1 break-all text-xs font-medium">{value}</p>
    </div>
  );
}
