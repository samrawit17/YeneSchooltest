"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyEnrollmentsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/enrollment");
  }, [router]);

  return null;
}
