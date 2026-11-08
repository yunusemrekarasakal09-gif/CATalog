
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  suspendUser,
  unsuspendUser,
} from "./actions";

type Profile = {
  id: string;
  display_name: string;
  city: string | null;
  bio: string | null;
  age: number | null;
  cat_count: number | null;
  created_at: string;
};

type Suspension = {
  user_id: string;
  reason: string;
  banned_until: string | null;
  is_permanent: boolean;
  created_at: string;
};

type Props = {
  users: Profile[];
  suspensions: Suspension[];
};

export default function UserManagement({
  users,
  suspensions,
}: Props) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [durationDays, setDurationDays] = useState("7");
  const [isPermanent, setIsPermanent] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | ""
  >("");

  const [isPending, startTransition] = useTransition();

  const suspensionMap = useMemo(
    () =>
      new Map(
        suspensions.map((suspension) => [
          suspension.user_id,
          suspension,
        ])
      ),
    [suspensions]
  );

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr-TR");

    if (!query) return users;

    return users.filter((user) => {
      return (
        user.display_name.toLocaleLowerCase("tr-TR").includes(query) ||
        user.id.toLowerCase().includes(query) ||
        (user.city ?? "").toLocaleLowerCase("tr-TR").includes(query)
      );
    });
  }, [users, search]);

  function getActiveSuspension(userId: string) {
    const suspension = suspensionMap.get(userId);

    if (!suspension) return null;

    const active =
      suspension.is_permanent ||
      suspension.banned_until === null ||
      new Date(suspension.banned_until).getTime() > Date.now();

    return active ? suspension : null;
  }

  function showMessage(
    text: string,
    type: "success" | "error"
  ) {
    setMessage(text);
    setMessageType(type);
  }

  function handleSuspend(userId: string) {
    if (!reason.trim()) {
      showMessage("Lütfen kısıtlama gerekçesini yaz.", "error");
      return;
    }

    const days = Number(durationDays);

    if (
      !isPermanent &&
      (!Number.isInteger(days) || days < 1 || days > 365)
    ) {
      showMessage(
        "Kısıtlama süresi 1-365 gün arasında olmalı.",
        "error"
      );
      return;
    }

    const confirmed = window.confirm(
      isPermanent
        ? "Bu kullanıcıyı kalıcı olarak kısıtlamak istediğine emin misin?"
        : `Bu kullanıcıyı ${days} gün boyunca kısıtlamak istediğine emin misin?`
    );

    if (!confirmed) return;

    setMessage("");

    startTransition(async () => {
      const result = await suspendUser(
        userId,
        reason,
        isPermanent,
        isPermanent ? undefined : days
      );

      if (result.success) {
        showMessage(result.message, "success");
        setReason("");
        setDurationDays("7");
        setIsPermanent(false);
        setSelectedUser(null);
        router.refresh();
      } else {
        showMessage(result.message, "error");
      }
    });
  }

  function handleUnsuspend(userId: string) {
    const confirmed = window.confirm(
      "Bu kullanıcının kısıtlamasını kaldırmak istediğine emin misin?"
    );

    if (!confirmed) return;

    setMessage("");

    startTransition(async () => {
      const result = await unsuspendUser(userId);

      if (result.success) {
        showMessage(result.message, "success");
        router.refresh();
      } else {
        showMessage(result.message, "error");
      }
    });
  }

  return (
    <section className="mt-8 rounded-2xl border border-[#A184D5]/20 bg-white p-5 shadow-sm dark:bg-[#201B29] sm:p-7">
      <div className="mb-6">
        <h2 className="text-xl font-bold">
          Kullanıcı Yönetimi
        </h2>

        <p className="mt-1 text-sm opacity-60">
          Kullanıcıları ara, profillerini incele ve hesap kısıtlamalarını yönet.
        </p>
      </div>

      <div className="mb-6">
        <label
          htmlFor="user-search"
          className="mb-2 block text-sm font-semibold"
        >
          Kullanıcı ara
        </label>

        <input
          id="user-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="İsim, şehir veya kullanıcı ID..."
          className="w-full rounded-xl border border-[#A184D5]/30 bg-white px-4 py-3 text-sm text-[#302542] outline-none transition focus:border-[#8C6BC2] dark:bg-[#15121D] dark:text-[#F5EFFB]"
        />
      </div>

      {message && (
        <div
          role="status"
          className={`mb-5 rounded-xl border p-4 text-sm ${
            messageType === "success"
              ? "border-green-300 bg-green-50 text-green-800"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {message}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">
          Kullanıcılar
        </p>

        <span className="rounded-full bg-[#A184D5]/10 px-3 py-1 text-xs font-bold text-[#8C6BC2]">
          {filteredUsers.length} kullanıcı
        </span>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="rounded-xl bg-[#A184D5]/10 p-8 text-center">
          <p className="font-semibold">
            Kullanıcı bulunamadı.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map((user) => {
            const suspension = suspensionMap.get(user.id);
            const activeSuspension = getActiveSuspension(user.id);
            const isSelected = selectedUser === user.id;

            return (
              <article
                key={user.id}
                className="rounded-xl border border-[#A184D5]/20 p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words text-base font-bold">
                      {user.display_name}
                    </h3>

                    <p className="mt-1 break-all text-xs opacity-50">
                      {user.id}
                    </p>
                  </div>

                  {activeSuspension ? (
                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800">
                      {activeSuspension.is_permanent
                        ? "Kalıcı kısıtlı"
                        : "Geçici kısıtlı"}
                    </span>
                  ) : suspension ? (
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                      Süresi dolmuş
                    </span>
                  ) : (
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
                      Aktif
                    </span>
                  )}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Info label="Şehir" value={user.city ?? "Belirtilmemiş"} />

                  <Info
                    label="Yaş"
                    value={user.age?.toString() ?? "Belirtilmemiş"}
                  />

                  <Info
                    label="Kedi ilanı sayısı"
                    value={user.cat_count?.toString() ?? "0"}
                  />

                  <Info
                    label="Kayıt tarihi"
                    value={new Date(user.created_at).toLocaleDateString(
                      "tr-TR"
                    )}
                  />
                </div>

                {user.bio && (
                  <div className="mt-4 rounded-xl bg-[#A184D5]/10 p-3">
                    <p className="mb-1 text-xs font-bold opacity-60">
                      HAKKINDA
                    </p>

                    <p className="whitespace-pre-wrap text-sm">
                      {user.bio}
                    </p>
                  </div>
                )}

                {activeSuspension && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    <p className="font-bold">
                      Kısıtlama gerekçesi
                    </p>

                    <p className="mt-1">
                      {activeSuspension.reason}
                    </p>

                    <p className="mt-2 text-xs">
                      {activeSuspension.is_permanent
                        ? "Süresiz kısıtlama"
                        : activeSuspension.banned_until
                          ? `Bitiş: ${new Date(
                              activeSuspension.banned_until
                            ).toLocaleString("tr-TR")}`
                          : "Bitiş tarihi belirtilmemiş"}
                    </p>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2 border-t border-[#A184D5]/20 pt-4">
                  {activeSuspension ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleUnsuspend(user.id)}
                      className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
                    >
                      Kısıtlamayı kaldır
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        setSelectedUser(
                          isSelected ? null : user.id
                        );
                        setMessage("");
                      }}
                      className="rounded-xl bg-[#7251A5] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#62458F] disabled:opacity-50"
                    >
                      {isSelected ? "Vazgeç" : "Kullanıcıyı kısıtla"}
                    </button>
                  )}
                </div>

                {isSelected && !activeSuspension && (
                  <div className="mt-4 space-y-4 rounded-xl bg-[#A184D5]/10 p-4">
                    <div>
                      <label
                        htmlFor={`reason-${user.id}`}
                        className="mb-2 block text-sm font-semibold"
                      >
                        Kısıtlama gerekçesi
                      </label>

                      <textarea
                        id={`reason-${user.id}`}
                        value={reason}
                        onChange={(event) =>
                          setReason(event.target.value)
                        }
                        maxLength={1000}
                        rows={3}
                        placeholder="Kısıtlama gerekçesini yaz..."
                        className="w-full resize-y rounded-xl border border-[#A184D5]/30 bg-white p-3 text-sm text-[#302542] outline-none focus:border-[#8C6BC2] dark:bg-[#15121D] dark:text-[#F5EFFB]"
                      />
                    </div>

                    <label className="flex items-center gap-3 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={isPermanent}
                        onChange={(event) =>
                          setIsPermanent(event.target.checked)
                        }
                        className="h-4 w-4 accent-[#8C6BC2]"
                      />
                      Kalıcı olarak kısıtla
                    </label>

                    {!isPermanent && (
                      <div>
                        <label
                          htmlFor={`duration-${user.id}`}
                          className="mb-2 block text-sm font-semibold"
                        >
                          Kısıtlama süresi
                        </label>

                        <select
                          id={`duration-${user.id}`}
                          value={durationDays}
                          onChange={(event) =>
                            setDurationDays(event.target.value)
                          }
                          className="w-full rounded-xl border border-[#A184D5]/30 bg-white px-3 py-3 text-sm text-[#302542] dark:bg-[#15121D] dark:text-[#F5EFFB]"
                        >
                          <option value="1">1 gün</option>
                          <option value="3">3 gün</option>
                          <option value="7">7 gün</option>
                          <option value="15">15 gün</option>
                          <option value="30">30 gün</option>
                          <option value="90">90 gün</option>
                          <option value="180">180 gün</option>
                          <option value="365">365 gün</option>
                        </select>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={isPending || !reason.trim()}
                      onClick={() => handleSuspend(user.id)}
                      className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isPending
                        ? "İşlem yapılıyor..."
                        : isPermanent
                          ? "Kalıcı kısıtlamayı uygula"
                          : "Geçici kısıtlamayı uygula"}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <p className="mt-5 text-xs leading-5 opacity-50">
        Kullanıcı kısıtlamaları veritabanında saklanır. Süresi dolmuş
        kayıtlar otomatik olarak silinmez; yeni bir işlem yapılabilir.
      </p>
    </section>
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
      <p className="mt-1 break-words text-sm font-medium">
        {value}
      </p>
    </div>
  );
}
