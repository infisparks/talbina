"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ManagementPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/crms");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#FAF7ED] flex items-center justify-center font-sans text-brandDark">
      <div className="flex items-center space-x-3 font-bold text-sm">
        <span className="animate-spin text-lg">⏳</span>
        <span>Redirecting to CRM Portal...</span>
      </div>
    </div>
  );
}
