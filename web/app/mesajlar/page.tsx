
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  cat_id: string | null;
  body: string;
  created_at: string;
  delivered_at: string | null;
  read_at: string | null;
};

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  city: string | null;
};

type CatInfo = {
  id: string;
  owner_id: string;
  name: string;
  photo_urls: string[] | null;
  city: string | null;
};

type Conversation = {
  userId: string;
  catId: string;
  lastMessage: Message;
  unreadCount: number;
};

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
  });
}

export default function MesajlarPage() {
  const searchParams = useSearchParams();
  const requestedUser = searchParams.get("user");
  const requestedCat = searchParams.get("cat");

  const [userId, setUserId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [cats, setCats] = useState<Record<string, CatInfo>>({});

  const [selectedUser, setSelectedUser] = useState(requestedUser ?? "");
  const [selectedCat, setSelectedCat] = useState(requestedCat ?? "");

  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);

  const loadMessages = useCallback(
    async (currentUserId: string) => {
      const { data, error: queryError } = await supabase
        .from("messages")
        .select(
          "id, sender_id, recipient_id, cat_id, body, created_at, delivered_at, read_at"
        )
        .or(
          `sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`
        )
        .order("created_at", { ascending: true });

      if (queryError) {
        setError("Mesajlar yüklenemedi. Lütfen sayfayı yenile.");
        console.error("Mesajlar yüklenemedi:", queryError);
        return;
      }

      const loaded = (data ?? []) as Message[];
      setMessages(loaded);

      const otherIds = loaded.map((message) =>
        message.sender_id === currentUserId
          ? message.recipient_id
          : message.sender_id
      );

      if (requestedUser && requestedUser !== currentUserId) {
        otherIds.push(requestedUser);
      }

      const uniqueOtherIds = [...new Set(otherIds)];

      const catIds = loaded
        .map((message) => message.cat_id)
        .filter((id): id is string => Boolean(id));

      if (requestedCat) {
        catIds.push(requestedCat);
      }

      const uniqueCatIds = [...new Set(catIds)];

      if (uniqueOtherIds.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url, city")
          .in("id", uniqueOtherIds);

        if (!profileError && profileData) {
          setProfiles((previous) => {
            const next = { ...previous };

            for (const profile of profileData as Profile[]) {
              next[profile.id] = profile;
            }

            return next;
          });
        } else if (profileError) {
          console.error("Profil bilgileri yüklenemedi:", profileError);
        }
      }

      if (uniqueCatIds.length > 0) {
        const { data: catData, error: catError } = await supabase
          .from("cats")
          .select("id, owner_id, name, photo_urls, city")
          .in("id", uniqueCatIds);

        if (!catError && catData) {
          setCats((previous) => {
            const next = { ...previous };

            for (const cat of catData as CatInfo[]) {
              next[cat.id] = cat;
            }

            return next;
          });
        } else if (catError) {
          console.error("İlan bilgileri yüklenemedi:", catError);
        }
      }
    },
    [requestedUser, requestedCat]
  );

  const markDelivered = useCallback(
    async (currentUserId: string, incoming: Message[]) => {
      const pending = incoming.filter(
        (message) =>
          message.recipient_id === currentUserId &&
          message.delivered_at === null
      );

      if (pending.length === 0) return;

      const now = new Date().toISOString();

      for (const message of pending) {
        const { error: updateError } = await supabase
          .from("messages")
          .update({ delivered_at: now })
          .eq("id", message.id)
          .eq("recipient_id", currentUserId)
          .is("delivered_at", null);

        if (updateError) {
          console.error("Teslim bilgisi güncellenemedi:", updateError);
        }
      }
    },
    []
  );

  const markRead = useCallback(
    async (currentUserId: string, peerId: string, catId: string) => {
      const incoming = messages.filter(
        (message) =>
          message.sender_id === peerId &&
          message.recipient_id === currentUserId &&
          message.cat_id === catId &&
          message.read_at === null
      );

      if (incoming.length === 0) return;

      const now = new Date().toISOString();

      for (const message of incoming) {
        const { error: updateError } = await supabase
          .from("messages")
          .update({
            delivered_at: message.delivered_at ?? now,
            read_at: now,
          })
          .eq("id", message.id)
          .eq("recipient_id", currentUserId)
          .is("read_at", null);

        if (updateError) {
          console.error("Okundu bilgisi güncellenemedi:", updateError);
        }
      }
    },
    [messages]
  );

  useEffect(() => {
    setSelectedUser(requestedUser ?? "");
    setSelectedCat(requestedCat ?? "");
  }, [requestedUser, requestedCat]);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function initialize() {
      setLoading(true);
      setError("");

      const { data, error: authError } = await supabase.auth.getUser();

      if (cancelled) return;

      if (authError || !data.user) {
        setError("Mesajlarını görmek için önce hesabına giriş yapmalısın.");
        setLoading(false);
        return;
      }

      const currentUserId = data.user.id;
      setUserId(currentUserId);

      if (requestedUser && requestedUser !== currentUserId) {
        setSelectedUser(requestedUser);
      }

      if (requestedCat) {
        setSelectedCat(requestedCat);
      }

      await loadMessages(currentUserId);

      if (cancelled) return;

      channel = supabase
        .channel(`messages-${currentUserId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
          },
          async (payload) => {
            const row = (payload.new ?? payload.old) as Partial<Message>;

            if (
              row.sender_id !== currentUserId &&
              row.recipient_id !== currentUserId
            ) {
              return;
            }

            await loadMessages(currentUserId);

            if (
              payload.eventType === "INSERT" &&
              row.recipient_id === currentUserId &&
              row.id
            ) {
              await markDelivered(currentUserId, [row as Message]);
            }
          }
        )
        .subscribe();

      setLoading(false);
    }

    void initialize();

    return () => {
      cancelled = true;

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [loadMessages, markDelivered, requestedUser, requestedCat]);

  const conversations = useMemo(() => {
    const map = new Map<string, Conversation>();

    for (const message of messages) {
      if (!message.cat_id) continue;

      const peerId =
        message.sender_id === userId
          ? message.recipient_id
          : message.sender_id;

      const key = `${peerId}:${message.cat_id}`;
      const existing = map.get(key);

      if (
        !existing ||
        message.created_at > existing.lastMessage.created_at
      ) {
        map.set(key, {
          userId: peerId,
          catId: message.cat_id,
          lastMessage: message,
          unreadCount: existing?.unreadCount ?? 0,
        });
      }

      if (
        message.sender_id === peerId &&
        message.recipient_id === userId &&
        message.read_at === null
      ) {
        const current = map.get(key);

        if (current) {
          current.unreadCount += 1;
        }
      }
    }

    return [...map.values()].sort(
      (a, b) =>
        new Date(b.lastMessage.created_at).getTime() -
        new Date(a.lastMessage.created_at).getTime()
    );
  }, [messages, userId]);

  useEffect(() => {
    if (!userId || !selectedUser || !selectedCat) {
      setBlockedByMe(false);
      return;
    }

    let cancelled = false;

    async function checkBlock() {
      const { data, error: blockError } = await supabase
        .from("user_blocks")
        .select("blocker_id")
        .eq("blocker_id", userId)
        .eq("blocked_id", selectedUser)
        .maybeSingle();

      if (cancelled) return;

      if (blockError) {
        console.error("Engelleme durumu kontrol edilemedi:", blockError);
      }

      setBlockedByMe(Boolean(data));
    }

    void checkBlock();

    return () => {
      cancelled = true;
    };
  }, [userId, selectedUser, selectedCat]);

  useEffect(() => {
    if (userId && selectedUser && selectedCat) {
      void markRead(userId, selectedUser, selectedCat);
    }
  }, [userId, selectedUser, selectedCat, messages, markRead]);

  const activeMessages = messages.filter(
    (message) =>
      message.cat_id === selectedCat &&
      ((message.sender_id === userId &&
        message.recipient_id === selectedUser) ||
        (message.sender_id === selectedUser &&
          message.recipient_id === userId))
  );

  const activeProfile = profiles[selectedUser];
  const activeCat = cats[selectedCat];
  const isSelfConversation = Boolean(
    userId && selectedUser && selectedUser === userId
  );

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const body = draft.trim();

    if (!userId) {
      setError("Mesaj göndermek için giriş yapmalısın.");
      return;
    }

    if (!selectedUser || !selectedCat) {
      setError("Mesaj göndermek için bir ilan üzerinden gelmelisin.");
      return;
    }

    if (isSelfConversation) {
      setError("Kendine mesaj gönderemezsin.");
      return;
    }

    if (!body) return;

    if (blockedByMe) {
      setError(
        "Bu kullanıcıyı engelledin. Mesaj göndermek için engeli kaldır."
      );
      return;
    }

    setSending(true);

    const { error: sendError } = await supabase.from("messages").insert({
      sender_id: userId,
      recipient_id: selectedUser,
      cat_id: selectedCat,
      body,
    });

    setSending(false);

    if (sendError) {
      console.error("Mesaj gönderilemedi:", sendError);
      setError(
        "Mesaj gönderilemedi. Kullanıcı seni engellemiş olabilir veya ilan artık uygun olmayabilir."
      );
      return;
    }

    setDraft("");
    await loadMessages(userId);
  }

  async function toggleBlock() {
    if (!userId || !selectedUser || isSelfConversation) return;

    setBlockBusy(true);
    setError("");
    setNotice("");

    if (blockedByMe) {
      const { error: unblockError } = await supabase
        .from("user_blocks")
        .delete()
        .eq("blocker_id", userId)
        .eq("blocked_id", selectedUser);

      if (unblockError) {
        setError("Engel kaldırılamadı.");
        console.error(unblockError);
      } else {
        setBlockedByMe(false);
        setNotice("Kullanıcının engeli kaldırıldı.");
      }
    } else {
      const { error: blockError } = await supabase
        .from("user_blocks")
        .insert({
          blocker_id: userId,
          blocked_id: selectedUser,
        });

      if (blockError) {
        setError("Kullanıcı engellenemedi.");
        console.error(blockError);
      } else {
        setBlockedByMe(true);
        setNotice("Kullanıcı engellendi.");
      }
    }

    setBlockBusy(false);
  }

  function selectConversation(conversation: Conversation) {
    setSelectedUser(conversation.userId);
    setSelectedCat(conversation.catId);
    setDraft("");
    setError("");
    setNotice("");

    window.history.replaceState(
      null,
      "",
      `/mesajlar?user=${encodeURIComponent(
        conversation.userId
      )}&cat=${encodeURIComponent(conversation.catId)}`
    );
  }

  const unreadTotal = conversations.reduce(
    (sum, conversation) => sum + conversation.unreadCount,
    0
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F5FC] text-[#655A76]">
        Mesajların yükleniyor...
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-[#F7F5FC] px-4 py-16 text-[#30264A]">
        <div className="mx-auto max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
          <div className="text-5xl">✉️</div>
          <h1 className="mt-4 text-2xl font-black">Mesajların</h1>
          <p className="mt-3 text-sm leading-6 text-[#777080]">
            Mesajlarını görüntülemek ve yeni mesaj göndermek için hesabına
            giriş yap.
          </p>
          <Link
            href="/giris"
            className="mt-6 inline-flex rounded-xl bg-[#30264A] px-5 py-3 font-bold text-white"
          >
            Giriş yap
          </Link>
          {error && (
            <p className="mt-4 text-sm text-red-600">{error}</p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F5FC] text-[#30264A]">
      <header className="border-b border-[#EEE9F8] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="text-xl font-black tracking-tight">
            🐈 CAT-<span className="text-[#A184D5]">ALOG</span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="rounded-full bg-[#F0E7FA] px-3 py-1.5 text-xs font-bold text-[#624B82]">
              {unreadTotal} okunmamış
            </span>
            <Link
              href="/"
              className="rounded-xl px-3 py-2 text-sm font-semibold text-[#655A76] hover:bg-[#F7F5FC]"
            >
              ← İlanlar
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-3 py-5 sm:px-5 sm:py-8">
        <div className="grid min-h-[75vh] overflow-hidden rounded-3xl border border-[#EEE9F8] bg-white shadow-sm lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside
            className={`border-b border-[#EEE9F8] lg:border-b-0 lg:border-r ${
              selectedUser && selectedCat ? "hidden lg:block" : ""
            }`}
          >
            <div className="border-b border-[#F0EAF6] p-5">
              <h1 className="text-2xl font-black">Mesajlar</h1>
              <p className="mt-1 text-sm text-[#777080]">
                İlan sahipleriyle konuşmaların
              </p>
            </div>

            {conversations.length === 0 ? (
              <div className="p-6 text-center">
                <div className="text-4xl">🐈</div>
                <p className="mt-3 font-bold">
                  {selectedUser && selectedCat
                    ? "Yeni konuşman"
                    : "Henüz sohbetin yok"}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#777080]">
                  {selectedUser && selectedCat
                    ? "İlk mesajını gönderdiğinde konuşman burada listelenecek."
                    : "Bir kedi ilanını açıp “Mesaj gönder” düğmesine basarak sohbet başlatabilirsin."}
                </p>
                {!selectedUser && !selectedCat && (
                  <Link
                    href="/"
                    className="mt-5 inline-flex rounded-xl bg-[#30264A] px-4 py-2.5 text-sm font-bold text-white"
                  >
                    İlanları keşfet
                  </Link>
                )}
              </div>
            ) : (
              <div className="divide-y divide-[#F4EFF8]">
                {conversations.map((conversation) => {
                  const profile = profiles[conversation.userId];
                  const cat = cats[conversation.catId];
                  const last = conversation.lastMessage;
                  const selected =
                    conversation.userId === selectedUser &&
                    conversation.catId === selectedCat;

                  return (
                    <button
                      key={`${conversation.userId}:${conversation.catId}`}
                      type="button"
                      onClick={() => selectConversation(conversation)}
                      className={`flex w-full items-start gap-3 p-4 text-left transition hover:bg-[#FAF8FD] ${
                        selected ? "bg-[#F5EFFB]" : ""
                      }`}
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#F0E7FA] text-xl">
                        {cat?.photo_urls?.[0] ? (
                          <img
                            src={cat.photo_urls[0]}
                            alt={cat.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          "🐈"
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate font-bold">
                            {profile?.display_name?.trim() ||
                              "İsimsiz kullanıcı"}
                          </p>
                          <span className="shrink-0 text-[11px] text-[#898293]">
                            {formatDate(last.created_at)}
                          </span>
                        </div>

                        <p className="mt-0.5 truncate text-xs text-[#9270C4]">
                          {cat?.name || "Kedi ilanı"}
                        </p>

                        <p className="truncate text-xs text-[#777080]">
                          {profile?.city?.trim() || "Şehir belirtilmemiş"}
                        </p>

                        <p className="mt-1 truncate text-sm text-[#777080]">
                          {last.sender_id === userId ? "Sen: " : ""}
                          {last.body}
                        </p>
                      </div>

                      {conversation.unreadCount > 0 && (
                        <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-[#9270C4] px-1.5 text-xs font-bold text-white">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <section
            className={`flex min-h-[75vh] min-w-0 flex-col ${
              !selectedUser || !selectedCat ? "hidden lg:flex" : ""
            }`}
          >
            {!selectedUser || !selectedCat ? (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <div className="text-6xl">💬</div>
                <h2 className="mt-4 text-xl font-black">Mesajların</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-[#777080]">
                  Soldaki konuşmalardan birini seçebilir veya bir kedi
                  ilanından “Mesaj gönder” düğmesine basabilirsin.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-[#EEE9F8] p-4 sm:p-5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser("");
                      setSelectedCat("");
                      setDraft("");
                      setError("");
                      setNotice("");
                      window.history.replaceState(null, "", "/mesajlar");
                    }}
                    className="rounded-lg px-2 py-1 text-sm text-[#655A76] hover:bg-[#F7F5FC] lg:hidden"
                  >
                    ←
                  </button>

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F0E7FA] text-xl">
                    {activeProfile?.avatar_url ? (
                      <img
                        src={activeProfile.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      "👤"
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black">
                      {activeProfile?.display_name?.trim() ||
                        "İsimsiz kullanıcı"}
                    </p>
                    <p className="truncate text-xs text-[#777080]">
                      {activeProfile?.city?.trim() ||
                        "Şehir belirtilmemiş"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void toggleBlock()}
                    disabled={blockBusy || isSelfConversation}
                    className="rounded-xl border border-[#E3D7F0] px-3 py-2 text-xs font-bold text-[#624B82] transition hover:bg-[#F8F5FC] disabled:opacity-50"
                  >
                    {blockBusy
                      ? "Bekle..."
                      : blockedByMe
                        ? "Engeli kaldır"
                        : "Engelle"}
                  </button>
                </div>

                {activeCat && (
                  <Link
                    href={`/kediler/${activeCat.id}`}
                    className="flex items-center gap-3 border-b border-[#F0EAF6] bg-[#FCFAFE] px-4 py-3 hover:bg-[#F7F2FC]"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#F0E7FA]">
                      {activeCat.photo_urls?.[0] ? (
                        <img
                          src={activeCat.photo_urls[0]}
                          alt={activeCat.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        "🐈"
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-[#898293]">
                        İlan hakkında konuşuyorsunuz
                      </p>
                      <p className="truncate text-sm font-bold">
                        {activeCat.name}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-[#9270C4]">
                      İlanı gör →
                    </span>
                  </Link>
                )}

                <div className="flex-1 space-y-4 overflow-y-auto bg-[#FCFBFE] p-4 sm:p-6">
                  {activeMessages.length === 0 && (
                    <div className="mx-auto mt-10 max-w-md rounded-3xl border border-[#EEE9F8] bg-white p-8 text-center shadow-sm">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F0E7FA] text-3xl">
                        💬
                      </div>
                      <h2 className="mt-4 text-xl font-black">
                        {activeCat
                          ? `${activeCat.name} hakkında konuş`
                          : "Yeni konuşma"}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-[#777080]">
                        Henüz mesaj yok. Aşağıdaki alana mesajını yazıp
                        gönderebilirsin.
                      </p>
                    </div>
                  )}

                  {activeMessages.map((message, index) => {
                    const mine = message.sender_id === userId;
                    const previous = activeMessages[index - 1];
                    const showDate =
                      !previous ||
                      new Date(previous.created_at).toDateString() !==
                        new Date(message.created_at).toDateString();

                    return (
                      <div key={message.id}>
                        {showDate && (
                          <div className="my-4 text-center">
                            <span className="rounded-full bg-[#F0EAF6] px-3 py-1 text-[11px] font-semibold text-[#777080]">
                              {new Date(
                                message.created_at
                              ).toLocaleDateString("tr-TR", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        )}

                        <div
                          className={`flex ${
                            mine ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[85%] break-words rounded-2xl px-4 py-3 shadow-sm sm:max-w-[75%] ${
                              mine
                                ? "rounded-br-md bg-[#30264A] text-white"
                                : "rounded-bl-md border border-[#EEE9F8] bg-white text-[#30264A]"
                            }`}
                          >
                            <p className="whitespace-pre-wrap text-sm leading-6">
                              {message.body}
                            </p>

                            <div
                              className={`mt-1.5 flex items-center justify-end gap-1.5 text-[10px] ${
                                mine
                                  ? "text-[#D9CDEB]"
                                  : "text-[#898293]"
                              }`}
                            >
                              <span>{formatTime(message.created_at)}</span>

                              {mine && (
                                <span
                                  title={
                                    message.read_at
                                      ? "Okundu"
                                      : message.delivered_at
                                        ? "Teslim edildi"
                                        : "Gönderildi"
                                  }
                                  aria-label={
                                    message.read_at
                                      ? "Okundu"
                                      : message.delivered_at
                                        ? "Teslim edildi"
                                        : "Gönderildi"
                                  }
                                  className={`text-xs font-black ${
                                    message.read_at
                                      ? "text-sky-300"
                                      : message.delivered_at
                                        ? "text-[#D9CDEB]"
                                        : "text-[#B8A9CC]"
                                  }`}
                                >
                                  {message.read_at
                                    ? "✓✓"
                                    : message.delivered_at
                                      ? "✓✓"
                                      : "✓"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {isSelfConversation && (
                  <p className="border-t border-amber-100 bg-amber-50 px-4 py-2 text-sm text-amber-800">
                    Bu ilan senin hesabına ait. Kendine mesaj gönderemezsin.
                    Mesajlaşmayı başka bir kullanıcı hesabıyla test et.
                  </p>
                )}

                {blockedByMe && !isSelfConversation && (
                  <p className="border-t border-[#EEE9F8] bg-[#FCFAFE] px-4 py-2 text-sm text-[#777080]">
                    Bu kullanıcıyı engelledin. Mesaj göndermek için önce
                    engeli kaldır.
                  </p>
                )}

                {error && (
                  <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
                    {error}
                  </p>
                )}

                {notice && (
                  <p className="border-t border-[#E6DDF2] bg-[#F8F4FC] px-4 py-2 text-sm text-[#624B82]">
                    {notice}
                  </p>
                )}

                <form
                  onSubmit={sendMessage}
                  className="border-t border-[#EEE9F8] bg-white p-3 sm:p-4"
                >
                  <div className="flex items-end gap-2">
                    <textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder={
                        isSelfConversation
                          ? "Kendi hesabına mesaj gönderemezsin"
                          : blockedByMe
                            ? "Mesaj göndermek için engeli kaldır"
                            : "Mesajını yaz..."
                      }
                      rows={2}
                      maxLength={4000}
                      disabled={
                        sending || blockedByMe || isSelfConversation
                      }
                      className="max-h-36 min-h-12 flex-1 resize-y rounded-2xl border border-[#E3D7F0] bg-[#FCFBFE] px-4 py-3 text-sm outline-none transition placeholder:text-[#A19AAA] focus:border-[#A184D5] disabled:opacity-60"
                    />

                    <button
                      type="submit"
                      disabled={
                        sending ||
                        blockedByMe ||
                        isSelfConversation ||
                        !draft.trim()
                      }
                      className="min-h-12 rounded-2xl bg-[#30264A] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#51416E] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {sending ? "Gönderiliyor..." : "Gönder"}
                    </button>
                  </div>

                  <p className="mt-2 text-[11px] text-[#898293]">
                    Mesajların bu ilanla ilişkili olarak kaydedilir.
                  </p>
                </form>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
