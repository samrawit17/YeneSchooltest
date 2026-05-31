"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyPendingEnrollmentsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/enrollment");
  }, [router]);

  return null;
}
