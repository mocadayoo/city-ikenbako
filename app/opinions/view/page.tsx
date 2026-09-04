import Link from "next/link";
import { Suspense } from "react";
import { OpinionView } from "./opinion-view";

export default function OpinionViewPage() {
  return <main className="min-h-screen bg-[#f4f7f8] px-6 py-12 text-[#14212b]"><div className="mx-auto max-w-3xl"><Link href="/" className="inline-flex items-center gap-2 text-sm text-[#0b6e69]"><span aria-hidden="true" className="back-mark" />City Ikenbako</Link><div className="mt-10 rounded-lg border border-[#d9e1e5] bg-white p-7 sm:p-10"><Suspense fallback={<p>読み込み中…</p>}><OpinionView audience="citizen" /></Suspense></div></div></main>;
}
