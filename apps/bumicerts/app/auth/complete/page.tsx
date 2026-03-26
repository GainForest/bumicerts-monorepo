"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Lightweight page that handles post-login redirect.
 *
 * Both OAuth callbacks redirect here. This page reads the saved return path
 * from localStorage (set by LoginModal before login) and navigates there,
 * falling back to "/" if no path was saved.
 */
export default function AuthCompletePage() {
  const router = useRouter();

  useEffect(() => {
    const redirectTo = localStorage.getItem("auth_redirect") || "/";
    localStorage.removeItem("auth_redirect");
    router.replace(redirectTo);
  }, [router]);

  return null;
}
