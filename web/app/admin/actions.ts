"use server";

import { requireAdmin } from "@/lib/admin";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

type ReportStatus =
  | "pending"
  | "reviewing"
  | "resolved"
  | "dismissed";

type ActionResult = {
  success: boolean;
  message: string;
};

const VALID_STATUSES: ReportStatus[] = [
  "pending",
  "reviewing",
  "resolved",
  "dismissed",
];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}

function getAdminSupabase() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!secretKey || !supabaseUrl) {
    throw new Error("Sunucu yapılandırması eksik.");
  }

  return createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// --------------------------------------------------
// ŞİKÂYET DURUMUNU GÜNCELLE
// --------------------------------------------------

export async function updateReportStatus(
  reportId: string,
  newStatus: ReportStatus
): Promise<ActionResult> {
  const { user } = await requireAdmin();

  try {
    if (!isValidUuid(reportId) || !VALID_STATUSES.includes(newStatus)) {
      return {
        success: false,
        message: "Geçersiz işlem bilgisi.",
      };
    }

    const adminSupabase = getAdminSupabase();

    const { data: report, error: fetchError } =
      await adminSupabase
        .from("reports")
        .select("id, status, reported_user_id")
        .eq("id", reportId)
        .maybeSingle();

    if (fetchError || !report) {
      return {
        success: false,
        message: "Şikâyet bulunamadı.",
      };
    }

    const previousStatus = report.status;

    if (previousStatus === newStatus) {
      return {
        success: true,
        message: "Şikâyet zaten bu durumda.",
      };
    }

    const { error: updateError } = await adminSupabase
      .from("reports")
      .update({ status: newStatus })
      .eq("id", reportId);

    if (updateError) {
      console.error("Report update error:", updateError);

      return {
        success: false,
        message: "Şikâyet durumu güncellenemedi.",
      };
    }

    const { error: logError } = await adminSupabase
      .from("admin_logs")
      .insert({
        admin_id: user.id,
        action: "report_status_updated",
        target_user_id: report.reported_user_id,
        details: {
          report_id: reportId,
          previous_status: previousStatus,
          new_status: newStatus,
        },
      });

    if (logError) {
      console.error("Admin log error:", logError);
    }

    revalidatePath("/admin");

    return {
      success: true,
      message: "Şikâyet durumu başarıyla güncellendi.",
    };
  } catch (error) {
    console.error("Update report status error:", error);

    return {
      success: false,
      message: "İşlem sırasında beklenmeyen bir hata oluştu.",
    };
  }
}

// --------------------------------------------------
// GEÇİCİ VEYA KALICI KULLANICI KISITLAMA
// --------------------------------------------------

export async function suspendUser(
  targetUserId: string,
  reason: string,
  isPermanent: boolean,
  durationDays?: number
): Promise<ActionResult> {
  const { user } = await requireAdmin();

  try {
    if (
      !isValidUuid(targetUserId) ||
      targetUserId === user.id ||
      typeof reason !== "string" ||
      !reason.trim() ||
      reason.trim().length > 1000 ||
      typeof isPermanent !== "boolean"
    ) {
      return {
        success: false,
        message: "Geçersiz kullanıcı veya gerekçe.",
      };
    }

    if (
      !isPermanent &&
      (!Number.isInteger(durationDays) ||
        !durationDays ||
        durationDays < 1 ||
        durationDays > 365)
    ) {
      return {
        success: false,
        message: "Kısıtlama süresi 1-365 gün arasında olmalı.",
      };
    }

    const adminSupabase = getAdminSupabase();

    const { data: profile, error: profileError } =
      await adminSupabase
        .from("profiles")
        .select("id")
        .eq("id", targetUserId)
        .maybeSingle();

    if (profileError || !profile) {
      return {
        success: false,
        message: "Kullanıcı bulunamadı.",
      };
    }

    const bannedUntil = isPermanent
      ? null
      : new Date(
          Date.now() + durationDays! * 24 * 60 * 60 * 1000
        ).toISOString();

    const { error: suspensionError } = await adminSupabase
      .from("user_suspensions")
      .upsert(
        {
          user_id: targetUserId,
          reason: reason.trim(),
          banned_until: bannedUntil,
          is_permanent: isPermanent,
          banned_by: user.id,
        },
        {
          onConflict: "user_id",
        }
      );

    if (suspensionError) {
      console.error("Suspension error:", suspensionError);

      return {
        success: false,
        message: "Kullanıcı kısıtlanamadı.",
      };
    }

    const { error: logError } = await adminSupabase
      .from("admin_logs")
      .insert({
        admin_id: user.id,
        action: isPermanent
          ? "user_permanently_suspended"
          : "user_temporarily_suspended",
        target_user_id: targetUserId,
        details: {
          reason: reason.trim(),
          banned_until: bannedUntil,
          is_permanent: isPermanent,
          duration_days: isPermanent ? null : durationDays,
        },
      });

    if (logError) {
      console.error("Suspension log error:", logError);
    }

    revalidatePath("/admin");

    return {
      success: true,
      message: isPermanent
        ? "Kullanıcı kalıcı olarak kısıtlandı."
        : "Kullanıcı geçici olarak kısıtlandı.",
    };
  } catch (error) {
    console.error("Suspend user error:", error);

    return {
      success: false,
      message: "Kısıtlama sırasında beklenmeyen bir hata oluştu.",
    };
  }
}

// --------------------------------------------------
// KULLANICI KISITLAMASINI KALDIR
// --------------------------------------------------

export async function unsuspendUser(
  targetUserId: string
): Promise<ActionResult> {
  const { user } = await requireAdmin();

  try {
    if (!isValidUuid(targetUserId) || targetUserId === user.id) {
      return {
        success: false,
        message: "Geçersiz kullanıcı.",
      };
    }

    const adminSupabase = getAdminSupabase();

    const { data: suspension, error: fetchError } =
      await adminSupabase
        .from("user_suspensions")
        .select("user_id, reason, is_permanent, banned_until")
        .eq("user_id", targetUserId)
        .maybeSingle();

    if (fetchError || !suspension) {
      return {
        success: false,
        message: "Kısıtlama kaydı bulunamadı.",
      };
    }

    const { error: deleteError } = await adminSupabase
      .from("user_suspensions")
      .delete()
      .eq("user_id", targetUserId);

    if (deleteError) {
      console.error("Unsuspend error:", deleteError);

      return {
        success: false,
        message: "Kısıtlama kaldırılamadı.",
      };
    }

    const { error: logError } = await adminSupabase
      .from("admin_logs")
      .insert({
        admin_id: user.id,
        action: "user_suspension_removed",
        target_user_id: targetUserId,
        details: {
          previous_reason: suspension.reason,
          previous_is_permanent: suspension.is_permanent,
          previous_banned_until: suspension.banned_until,
        },
      });

    if (logError) {
      console.error("Unsuspend log error:", logError);
    }

    revalidatePath("/admin");

    return {
      success: true,
      message: "Kullanıcı kısıtlaması kaldırıldı.",
    };
  } catch (error) {
    console.error("Unsuspend user error:", error);

    return {
      success: false,
      message: "İşlem sırasında beklenmeyen bir hata oluştu.",
    };
  }
}

// --------------------------------------------------
// CAT-ALOG TEAM - DESTEK YANITI GÖNDER
// --------------------------------------------------

export async function sendSupportReply(
  targetUserId: string,
  body: string
): Promise<ActionResult> {
  const { user } = await requireAdmin();

  try {
    if (
      !isValidUuid(targetUserId) ||
      typeof body !== "string" ||
      !body.trim() ||
      body.trim().length > 4000
    ) {
      return {
        success: false,
        message: "Geçersiz kullanıcı veya mesaj.",
      };
    }

    const adminSupabase = getAdminSupabase();

    const { data: profile, error: profileError } =
      await adminSupabase
        .from("profiles")
        .select("id")
        .eq("id", targetUserId)
        .maybeSingle();

    if (profileError || !profile) {
      return {
        success: false,
        message: "Kullanıcı bulunamadı.",
      };
    }

    const { error: insertError } = await adminSupabase
      .from("support_messages")
      .insert({
        user_id: targetUserId,
        sender_role: "team",
        body: body.trim(),
      });

    if (insertError) {
      console.error("Support reply error:", insertError);

      return {
        success: false,
        message: "CATalog Team yanıtı gönderilemedi.",
      };
    }

    const { error: logError } = await adminSupabase
      .from("admin_logs")
      .insert({
        admin_id: user.id,
        action: "support_reply_sent",
        target_user_id: targetUserId,
        details: {
          message_length: body.trim().length,
        },
      });

    if (logError) {
      console.error("Support reply log error:", logError);
    }

    revalidatePath("/admin");
    revalidatePath("/mesajlar");

    return {
      success: true,
      message: "CATalog Team yanıtı gönderildi.",
    };
  } catch (error) {
    console.error("Send support reply error:", error);

    return {
      success: false,
      message: "Yanıt gönderilirken beklenmeyen bir hata oluştu.",
    };
  }
}
