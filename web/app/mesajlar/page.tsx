
"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "@/components/ThemeProvider";
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

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F5FC] text-[#655A76]">
      Mesajların yükleniyor...
    </main>
  );
}

export default function MesajlarPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <MesajlarContent />
    </Suspense>
  );
}

function MesajlarContent() {
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
  const [peerOnline, setPeerOnline] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const liveChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingActiveRef = useRef(false);

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

            if (
              payload.eventType === "INSERT" &&
              row.recipient_id === currentUserId &&
              row.sender_id !== currentUserId
            ) {
              const audio = new Audio("/sounds/mesaj%20geldi.mp3");
              void audio.play().catch((soundError) => {
                console.warn("Mesaj sesi çalınamadı:", soundError);
              });
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

  useEffect(() => {
    if (!userId || !selectedUser || userId === selectedUser) {
      setPeerOnline(false);
      setPeerTyping(false);
      liveChannelRef.current = null;
      return;
    }

    let cancelled = false;
    const pair = [userId, selectedUser].sort().join("-");
    const channel = supabase.channel(`chat-live-${pair}`, {
      config: {
        presence: { key: userId },
        broadcast: { self: false },
      },
    });
    liveChannelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        if (cancelled) return;
        const presence = channel.presenceState();
        setPeerOnline(Boolean(presence[selectedUser]?.length));
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (cancelled || payload?.user_id !== selectedUser) return;
        setPeerTyping(Boolean(payload.is_typing));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && !cancelled) {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      cancelled = true;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      typingActiveRef.current = false;
      setPeerTyping(false);
      if (liveChannelRef.current === channel) liveChannelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [userId, selectedUser]);

  function handleDraftChange(value: string) {
    setDraft(value);

    if (!userId || !selectedUser || userId === selectedUser) return;
    const channel = liveChannelRef.current;
    if (channel && !typingActiveRef.current) {
      typingActiveRef.current = true;
      void channel.send({
        type: "broadcast",
        event: "typing",
        payload: { user_id: userId, is_typing: true },
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      typingActiveRef.current = false;
      const activeChannel = liveChannelRef.current;
      if (activeChannel) {
        void activeChannel.send({
          type: "broadcast",
          event: "typing",
          payload: { user_id: userId, is_typing: false },
        });
      }
    }, 1400);
  }

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

    // Mesaj başarıyla gönderildiğinde gönderici tarafında sesi çal.
    const sentAudio = new Audio("/sounds/message.mp3");
    void sentAudio.play().catch((soundError) => {
      console.warn("Gönderilen mesaj sesi çalınamadı:", soundError);
    });

    setDraft("");
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    typingActiveRef.current = false;
    if (liveChannelRef.current) {
      void liveChannelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: { user_id: userId, is_typing: false },
      });
    }
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

  const { darkMode, toggleTheme, themeReady } = useTheme();

  const palette = darkMode
    ? {
        page: "#15121D",
        text: "#F5EFFB",
        muted: "#B8AEC6",
        card: "rgba(32, 27, 41, 0.94)",
        cardSolid: "#201B29",
        border: "rgba(255,255,255,0.12)",
        soft: "#2A2235",
        softHover: "#30263D",
        accent: "#A184D5",
        accentText: "#D9C9F0",
        input: "#191521",
        incoming: "#201B29",
        outgoing: "#493567",
      }
    : {
        page: "#FAF8FC",
        text: "#302542",
        muted: "#82778F",
        card: "rgba(255,255,255,0.94)",
        cardSolid: "#FFFFFF",
        border: "#ECE5F3",
        soft: "#F0E7F8",
        softHover: "#F7F2FC",
        accent: "#8060AE",
        accentText: "#624B82",
        input: "#FCFAFE",
        incoming: "#FFFFFF",
        outgoing: "#302542",
      };

  const iconPath = (name: string) => `/images/icons/${name}`;

  if (loading || !themeReady) {
    return (
      <main
        className="flex min-h-screen items-center justify-center"
        style={{
          backgroundColor: palette.page,
          color: palette.muted,
          backgroundImage: `url("${darkMode ? "/images/brand/arkaplan1.png" : "/images/brand/arkaplan2.png"}")`,
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div
          className="flex flex-col items-center gap-4 rounded-3xl border px-8 py-7 shadow-xl backdrop-blur-xl"
          style={{ backgroundColor: palette.card, borderColor: palette.border }}
        >
          <span className="h-9 w-9 animate-spin rounded-full border-4 border-[#A184D5]/25 border-t-[#A184D5]" />
          <span className="text-sm font-semibold">Mesajların yükleniyor...</span>
        </div>
      </main>
    );
  }

  if (!userId) {
    return (
      <main
        className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16"
        style={{
          backgroundColor: palette.page,
          color: palette.text,
          backgroundImage: `url("${darkMode ? "/images/brand/arkaplan1.png" : "/images/brand/arkaplan2.png"}")`,
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="pointer-events-none absolute inset-0" style={{ backgroundColor: darkMode ? "rgba(21,18,29,.62)" : "rgba(250,248,252,.45)" }} />
        <div
          className="relative z-10 mx-auto w-full max-w-md rounded-3xl border p-8 text-center shadow-2xl backdrop-blur-xl"
          style={{ backgroundColor: palette.card, borderColor: palette.border }}
        >
          <Image
            src={iconPath(darkMode ? "kedi1.png" : "kedi2.png")}
            alt=""
            width={76}
            height={76}
            className="mx-auto object-contain"
          />
          <h1 className="mt-4 text-2xl font-black">Mesajların</h1>
          <p className="mt-3 text-sm leading-6" style={{ color: palette.muted }}>
            Mesajlarını görüntülemek ve yeni mesaj göndermek için hesabına giriş yap.
          </p>
          <Link
            href="/giris"
            className="mt-6 inline-flex rounded-xl px-5 py-3 font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: palette.accent }}
          >
            Giriş yap
          </Link>
          {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
        </div>
      </main>
    );
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{
        backgroundColor: palette.page,
        color: palette.text,
        backgroundImage: `url("${darkMode ? "/images/brand/arkaplan1.png" : "/images/brand/arkaplan2.png"}")`,
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundAttachment: "fixed",
      }}
    >
      <div
        className="pointer-events-none fixed inset-0"
        style={{ backgroundColor: darkMode ? "rgba(21,18,29,.64)" : "rgba(250,248,252,.48)" }}
      />

      <header
        className="relative z-10 border-b backdrop-blur-xl"
        style={{
          backgroundColor: darkMode ? "rgba(32,27,41,.92)" : "rgba(255,255,255,.92)",
          borderColor: palette.border,
        }}
      >
        <div className="relative mx-auto flex h-[144px] max-w-7xl items-center justify-between gap-3 px-4 sm:py-0">
          <Link href="/" aria-label="CATalog ana sayfası" className="relative flex h-full w-[120px] shrink-0 items-center gap-2 transition hover:opacity-80">
            <Image
              src={darkMode ? "/images/brand/logo1.png" : "/images/brand/logo2.png"}
              alt="CATalog"
              width={240}
              height={240}
              className="absolute left-1/2 top-1/2 h-[240px] w-[240px] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain"
            />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <span
              className="rounded-full px-3 py-1.5 text-xs font-bold"
              style={{ backgroundColor: palette.soft, color: palette.accentText }}
            >
              {unreadTotal} okunmamış
            </span>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={darkMode ? "Gündüz temasına geç" : "Gece temasına geç"}
              className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl transition hover:scale-105"
              style={{ backgroundColor: palette.soft }}
            >
              <Image
                src={iconPath(darkMode ? "gece.png" : "gündüz.png")}
                alt={darkMode ? "Gece teması" : "Gündüz teması"}
                width={43}
                height={43}
                className="object-contain"
              />
            </button>
            <Link
              href="/"
              className="rounded-xl px-3 py-2 text-sm font-semibold transition"
              style={{ color: palette.muted, backgroundColor: "transparent" }}
            >
              ← İlanlar
            </Link>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-7xl px-3 py-5 sm:px-5 sm:py-8">
        <div
          className="grid min-h-[75vh] overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-xl lg:grid-cols-[340px_minmax(0,1fr)]"
          style={{ borderColor: palette.border, backgroundColor: palette.card }}
        >
          <aside
            className={`border-b lg:border-b-0 lg:border-r ${selectedUser && selectedCat ? "hidden lg:block" : ""}`}
            style={{ borderColor: palette.border }}
          >
            <div className="border-b p-5" style={{ borderColor: palette.border }}>
              <h1 className="text-2xl font-black">Mesajlar</h1>
              <p className="mt-1 text-sm" style={{ color: palette.muted }}>İlan sahipleriyle konuşmaların</p>
            </div>

            {conversations.length === 0 ? (
              <div className="p-6 text-center">
                <Image
                  src={iconPath(darkMode ? "kedi1.png" : "kedi2.png")}
                  alt=""
                  width={64}
                  height={64}
                  className="mx-auto object-contain"
                />
                <p className="mt-3 font-bold">{selectedUser && selectedCat ? "Yeni konuşman" : "Henüz sohbetin yok"}</p>
                <p className="mt-2 text-sm leading-6" style={{ color: palette.muted }}>
                  {selectedUser && selectedCat
                    ? "İlk mesajını gönderdiğinde konuşman burada listelenecek."
                    : "Bir kedi ilanını açıp “Mesaj gönder” düğmesine basarak sohbet başlatabilirsin."}
                </p>
                {!selectedUser && !selectedCat && (
                  <Link
                    href="/"
                    className="mt-5 inline-flex rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
                    style={{ backgroundColor: palette.accent }}
                  >
                    İlanları keşfet
                  </Link>
                )}
              </div>
            ) : (
              <div>
                {conversations.map((conversation) => {
                  const profile = profiles[conversation.userId];
                  const cat = cats[conversation.catId];
                  const last = conversation.lastMessage;
                  const selected = conversation.userId === selectedUser && conversation.catId === selectedCat;
                  return (
                    <button
                      key={`${conversation.userId}:${conversation.catId}`}
                      type="button"
                      onClick={() => selectConversation(conversation)}
                      className="flex w-full items-start gap-3 border-b p-4 text-left transition"
                      style={{
                        borderColor: palette.border,
                        backgroundColor: selected ? palette.soft : "transparent",
                      }}
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl" style={{ backgroundColor: palette.soft }}>
                        {cat?.photo_urls?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={cat.photo_urls[0]} alt={cat.name} className="h-full w-full object-cover" />
                        ) : (
                          <Image src={iconPath(darkMode ? "kedi1.png" : "kedi2.png")} alt="Kedi fotoğrafı yok" width={36} height={36} className="object-contain p-1" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate font-bold">{profile?.display_name?.trim() || "İsimsiz kullanıcı"}</p>
                          <span className="shrink-0 text-[11px]" style={{ color: palette.muted }}>{formatDate(last.created_at)}</span>
                        </div>
                        <p className="mt-0.5 truncate text-xs font-semibold" style={{ color: palette.accent }}>{cat?.name || "Kedi ilanı"}</p>
                        <p className="truncate text-xs" style={{ color: palette.muted }}>{profile?.city?.trim() || "Şehir belirtilmemiş"}</p>
                        <p className="mt-1 truncate text-sm" style={{ color: palette.muted }}>
                          {last.sender_id === userId ? "Sen: " : ""}{last.body}
                        </p>
                      </div>
                      {conversation.unreadCount > 0 && (
                        <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-bold text-white" style={{ backgroundColor: palette.accent }}>
                          {conversation.unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <section className={`flex min-h-[75vh] min-w-0 flex-col ${!selectedUser || !selectedCat ? "hidden lg:flex" : ""}`}>
            {!selectedUser || !selectedCat ? (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <Image src={iconPath(darkMode ? "kedi1.png" : "kedi2.png")} alt="" width={88} height={88} className="object-contain" />
                <h2 className="mt-4 text-xl font-black">Mesajların</h2>
                <p className="mt-2 max-w-sm text-sm leading-6" style={{ color: palette.muted }}>
                  Soldaki konuşmalardan birini seçebilir veya bir kedi ilanından “Mesaj gönder” düğmesine basabilirsin.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b p-4 sm:p-5" style={{ borderColor: palette.border }}>
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
                    className="rounded-lg px-2 py-1 text-sm transition lg:hidden"
                    style={{ color: palette.muted, backgroundColor: palette.soft }}
                    aria-label="Konuşma listesine dön"
                  >
                    ←
                  </button>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full" style={{ backgroundColor: palette.soft }}>
                    {activeProfile?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={activeProfile.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Image src={iconPath(darkMode ? "user ikonu.png" : "user ikonu2.png")} alt="Profil fotoğrafı yok" width={40} height={40} className="object-contain p-1" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black">{activeProfile?.display_name?.trim() || "İsimsiz kullanıcı"}</p>
                    <p className="truncate text-xs" style={{ color: palette.muted }}>{activeProfile?.city?.trim() || "Şehir belirtilmemiş"}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs" style={{ color: peerOnline ? "#16A34A" : palette.muted }}>
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: peerOnline ? "#22C55E" : "#9CA3AF" }} />
                      {peerTyping ? "Yazıyor..." : peerOnline ? "Çevrimiçi" : "Çevrimdışı"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void toggleBlock()}
                    disabled={blockBusy || isSelfConversation}
                    className="rounded-xl border px-3 py-2 text-xs font-bold transition disabled:opacity-50"
                    style={{ borderColor: palette.border, color: palette.accentText, backgroundColor: palette.soft }}
                  >
                    {blockBusy ? "Bekle..." : blockedByMe ? "Engeli kaldır" : "Engelle"}
                  </button>
                </div>

                {activeCat && (
                  <Link
                    href={`/kediler/${activeCat.id}`}
                    className="flex items-center gap-3 border-b px-4 py-3 transition"
                    style={{ borderColor: palette.border, backgroundColor: darkMode ? "rgba(42,34,53,.78)" : "rgba(252,250,254,.9)" }}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl" style={{ backgroundColor: palette.soft }}>
                      {activeCat.photo_urls?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={activeCat.photo_urls[0]} alt={activeCat.name} className="h-full w-full object-cover" />
                      ) : (
                        <Image src={iconPath(darkMode ? "kedi1.png" : "kedi2.png")} alt="Kedi fotoğrafı yok" width={34} height={34} className="object-contain p-1" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs" style={{ color: palette.muted }}>İlan hakkında konuşuyorsunuz</p>
                      <p className="truncate text-sm font-bold">{activeCat.name}</p>
                    </div>
                    <span className="text-xs font-bold" style={{ color: palette.accent }}>İlanı gör →</span>
                  </Link>
                )}

                <div
                  className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6"
                  style={{ backgroundColor: darkMode ? "rgba(21,18,29,.38)" : "rgba(252,250,254,.72)" }}
                >
                  {activeMessages.length === 0 && (
                    <div className="mx-auto mt-10 max-w-md rounded-3xl border p-8 text-center shadow-sm backdrop-blur-sm" style={{ borderColor: palette.border, backgroundColor: palette.card }}>
                      <Image src={iconPath(darkMode ? "kedi1.png" : "kedi2.png")} alt="" width={64} height={64} className="mx-auto object-contain" />
                      <h2 className="mt-4 text-xl font-black">{activeCat ? `${activeCat.name} hakkında konuş` : "Yeni konuşma"}</h2>
                      <p className="mt-2 text-sm leading-6" style={{ color: palette.muted }}>
                        Henüz mesaj yok. Aşağıdaki alana mesajını yazıp gönderebilirsin.
                      </p>
                    </div>
                  )}

                  {activeMessages.map((message, index) => {
                    const mine = message.sender_id === userId;
                    const previous = activeMessages[index - 1];
                    const showDate = !previous || new Date(previous.created_at).toDateString() !== new Date(message.created_at).toDateString();
                    const tickIcon = message.read_at
                      ? (darkMode ? "mavitik.png" : "mavitik2.png")
                      : message.delivered_at
                        ? (darkMode ? "çifttik.png" : "çifttik2.png")
                        : (darkMode ? "tektik.png" : "tektik2.png");
                    const tickLabel = message.read_at ? "Okundu" : message.delivered_at ? "Teslim edildi" : "Gönderildi";

                    return (
                      <div key={message.id}>
                        {showDate && (
                          <div className="my-4 text-center">
                            <span className="rounded-full border px-3 py-1 text-[11px] font-semibold shadow-sm" style={{ borderColor: palette.border, backgroundColor: palette.card, color: palette.muted }}>
                              {new Date(message.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                            </span>
                          </div>
                        )}
                        <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                          <div
                            className="max-w-[85%] break-words rounded-2xl px-4 py-3 shadow-sm sm:max-w-[75%]"
                            style={{
                              borderBottomRightRadius: mine ? 5 : 18,
                              borderBottomLeftRadius: mine ? 18 : 5,
                              backgroundColor: mine ? palette.outgoing : palette.incoming,
                              color: mine ? "#FFFFFF" : palette.text,
                              border: mine ? "1px solid transparent" : `1px solid ${palette.border}`,
                            }}
                          >
                            <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p>
                            <div className="mt-1.5 flex items-center justify-end gap-1.5 text-[10px]" style={{ color: mine ? "#D9CDEB" : palette.muted }}>
                              <span>{formatTime(message.created_at)}</span>
                              {mine && (
                                <Image
                                  src={iconPath(tickIcon)}
                                  alt={tickLabel}
                                  title={tickLabel}
                                  width={20}
                                  height={14}
                                  className="h-3.5 w-5 object-contain"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {peerTyping && (
                    <div className="flex justify-start" aria-live="polite" aria-label="Karşı taraf yazıyor">
                      <div
                        className="flex items-center gap-2 rounded-2xl border px-3 py-2 shadow-sm"
                        style={{ backgroundColor: palette.incoming, borderColor: palette.border }}
                      >
                        {/* Public GIF is intentionally rendered with img to preserve animation. */}
                        <img src="/animation/mesaj.gif" alt="Karşı taraf yazıyor" className="h-8 w-12 object-contain" />
                        <span className="text-xs" style={{ color: palette.muted }}>Yazıyor...</span>
                      </div>
                    </div>
                  )}
                </div>

                {isSelfConversation && (
                  <p className="border-t px-4 py-2 text-sm" style={{ borderColor: "#D97706", backgroundColor: darkMode ? "#382719" : "#FFFBEB", color: darkMode ? "#FCD9A5" : "#92400E" }}>
                    Bu ilan senin hesabına ait. Kendine mesaj gönderemezsin. Mesajlaşmayı başka bir kullanıcı hesabıyla test et.
                  </p>
                )}
                {blockedByMe && !isSelfConversation && (
                  <p className="border-t px-4 py-2 text-sm" style={{ borderColor: palette.border, backgroundColor: palette.soft, color: palette.muted }}>
                    Bu kullanıcıyı engelledin. Mesaj göndermek için önce engeli kaldır.
                  </p>
                )}
                {error && <p className="border-t border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-500">{error}</p>}
                {notice && <p className="border-t px-4 py-2 text-sm" style={{ borderColor: palette.border, backgroundColor: palette.soft, color: palette.accentText }}>{notice}</p>}

                <form onSubmit={sendMessage} className="border-t p-3 sm:p-4" style={{ borderColor: palette.border, backgroundColor: palette.cardSolid }}>
                  <div className="flex items-end gap-2">
                    <textarea
                      value={draft}
                      onChange={(event) => handleDraftChange(event.target.value)}
                      placeholder={isSelfConversation ? "Kendi hesabına mesaj gönderemezsin" : blockedByMe ? "Mesaj göndermek için engeli kaldır" : "Mesajını yaz..."}
                      rows={2}
                      maxLength={4000}
                      disabled={sending || blockedByMe || isSelfConversation}
                      className="max-h-36 min-h-12 flex-1 resize-y rounded-2xl border px-4 py-3 text-sm outline-none transition placeholder:text-[#A19AAA] focus:border-[#A184D5] disabled:opacity-60"
                      style={{ borderColor: palette.border, backgroundColor: palette.input, color: palette.text }}
                    />
                    <button
                      type="submit"
                      disabled={sending || blockedByMe || isSelfConversation || !draft.trim()}
                      className="min-h-12 rounded-2xl px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ backgroundColor: palette.accent }}
                    >
                      {sending ? "Gönderiliyor..." : "Gönder"}
                    </button>
                  </div>
                  <p className="mt-2 text-[11px]" style={{ color: palette.muted }}>
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
