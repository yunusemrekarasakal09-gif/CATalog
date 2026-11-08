
"use client";

import { useState, useTransition } from "react";
import { updateReportStatus } from "./actions";

type ReportStatus =
  | "pending"
  | "reviewing"
  | "resolved"
  | "dismissed";

const statusOptions: {
  value: ReportStatus;
  label: string;
}[] = [
  { value: "pending", label: "Beklemede" },
  { value: "reviewing", label: "İnceleniyor" },
  { value: "resolved", label: "Sonuçlandırıldı" },
  { value: "dismissed", label: "Reddedildi" },
];

export default function ReportStatusControl({
  reportId,
  currentStatus,
}: {
  reportId: string;
  currentStatus: ReportStatus;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleChange(newStatus: ReportStatus) {
    if (newStatus === status) return;

    setMessage("");

    startTransition(async () => {
      const result = await updateReportStatus(reportId, newStatus);

      if (result.success) {
        setStatus(newStatus);
        setMessage(result.message);
      } else {
        setMessage(result.message);
      }
    });
  }

  return (
    <div className="mt-4 border-t border-[#A184D5]/20 pt-4">
      <label
        htmlFor={`report-status-${reportId}`}
        className="mb-2 block text-xs font-bold opacity-65"
      >
        ŞİKÂYET DURUMUNU DEĞİŞTİR
      </label>

      <select
        id={`report-status-${reportId}`}
        value={status}
        disabled={isPending}
        onChange={(event) =>
          handleChange(event.target.value as ReportStatus)
        }
        className="w-full rounded-xl border border-[#A184D5]/30 bg-white px-4 py-3 text-sm font-semibold text-[#302542] outline-none transition focus:border-[#8C6BC2] disabled:opacity-50 dark:bg-[#15121D] dark:text-[#F5EFFB]"
      >
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {isPending && (
        <p className="mt-2 text-xs opacity-60">
          Güncelleniyor...
        </p>
      )}

      {message && (
        <p
          role="status"
          className={`mt-2 text-xs ${
            message.includes("başarıyla")
              ? "text-green-600"
              : "text-red-600"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
