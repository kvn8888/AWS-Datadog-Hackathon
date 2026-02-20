"use client";

import type { ValidationStatus } from "@/types/course";

const BADGE_STYLES: Record<ValidationStatus, string> = {
  pass: "bg-green-100 text-green-700 border-green-300",
  fixed: "bg-amber-100 text-amber-700 border-amber-300",
  fail: "bg-red-100 text-red-700 border-red-300",
  pending: "bg-gray-100 text-gray-500 border-gray-300",
};

const BADGE_LABELS: Record<ValidationStatus, string> = {
  pass: "PASS",
  fixed: "FIXED",
  fail: "FAIL",
  pending: "PENDING",
};

export default function ValidationBadge({ status }: { status: ValidationStatus }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-bold rounded border ${BADGE_STYLES[status]}`}
    >
      {BADGE_LABELS[status]}
    </span>
  );
}
