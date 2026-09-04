"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CouncilorLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function login() {
    setError(null);
    const response = await fetch("/api/councilor/auth/dev-login", { method: "POST" });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error?.message ?? "ログインできませんでした。");
      return;
    }
    router.push("/councilor/opinions");
  }

  return <main className="min-h-screen bg-[#f4f7f8] px-6 py-12 text-[#14212b]"><div className="mx-auto max-w-md"><Link href="/" className="inline-flex items-center gap-2 text-sm text-[#0b6e69]"><span aria-hidden="true" className="back-mark" />City Ikenbako</Link><div className="mt-10 rounded-lg border border-[#d9e1e5] bg-white p-8"><p className="text-sm font-semibold tracking-[0.2em] text-[#0b6e69]">COUNCILOR CONSOLE</p><h1 className="mt-3 text-3xl font-semibold">担当者ログイン</h1><p className="mt-4 text-sm leading-6 text-[#64747b]">開発環境ではseed済みのmockアカウントを使用します。</p><button onClick={login} className="mt-8 w-full rounded-md bg-[#0b6e69] px-5 py-3 font-medium text-white hover:bg-[#075852]">開発用アカウントでログイン</button>{error && <p role="alert" className="mt-4 rounded-md bg-[#fff1ef] p-3 text-sm text-[#a23b2f]">{error}</p>}</div></div></main>;
}
