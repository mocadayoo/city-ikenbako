"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Opinion = { id: string; title: string | null; body: string; createdAt: string; viewNonce?: string; events: { type: "SUBMITTED" | "DELIVERED" | "VIEWED"; occurredAt: string; proofVerified?: boolean }[] };

function ViewContent() {
  const params = useSearchParams(); const id = params.get("id");
  const [opinion, setOpinion] = useState<Opinion | null>(null); const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!id) return; fetch(`/api/opinions/${encodeURIComponent(id)}`, { cache: "no-store" }).then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error?.message ?? "取得できませんでした。"); return body.data as Opinion; }).then(async (data) => { setOpinion(data); if (!data.viewNonce) return; try { const response = await fetch(`/api/councilor/opinions/${encodeURIComponent(data.id)}/views`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ viewNonce: data.viewNonce }) }); const body = await response.json(); if (!response.ok || !body.data?.viewedAt) return; setOpinion((current) => current ? { ...current, events: current.events.some((event) => event.type === "VIEWED" && event.occurredAt === body.data.viewedAt) ? current.events : [...current.events, { type: "VIEWED", occurredAt: body.data.viewedAt, proofVerified: body.data.proofVerified === true }] } : current); } catch { console.warn("[view] signed view recording failed"); } }).catch((reason: Error) => setError(reason.message)); }, [id]);
  if (!id) return <p className="rounded-md bg-[#fff1ef] p-4 text-sm text-[#a23b2f]">Opinion IDがありません。</p>;
  if (error) return <p role="alert" className="rounded-md bg-[#fff1ef] p-4 text-sm text-[#a23b2f]">{error}</p>;
  if (!opinion) return <p className="text-sm text-[#64747b]">読み込み中…</p>;
  const viewed = opinion.events.filter((event) => event.type === "VIEWED");
  return <div className="space-y-6"><div className="border-b border-[#d9e1e5] pb-6"><p className="text-xs font-semibold tracking-[0.18em] text-[#0b6e69]">OPINION / {opinion.id.slice(0, 8)}</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">{opinion.title || "無題の意見"}</h1><p className="mt-2 text-sm text-[#64747b]">{new Date(opinion.createdAt).toLocaleString("ja-JP")}</p></div><p className="whitespace-pre-wrap rounded-md border border-[#d9e1e5] bg-[#f8fafb] p-5 leading-8">{opinion.body}</p><div className="grid gap-3 sm:grid-cols-3">{[["送信", opinion.events.some((event) => event.type === "SUBMITTED")], ["受信処理", opinion.events.some((event) => event.type === "DELIVERED")], ["閲覧", viewed.length > 0]].map(([label, complete]) => <div key={String(label)} className="rounded-md border border-[#d9e1e5] bg-white p-4"><p className="text-xs text-[#64747b]">{label}</p><p className={`mt-2 font-semibold ${complete ? "text-[#0b6e69]" : "text-[#9aa8ad]"}`}>{complete ? "完了" : "未完了"}</p></div>)}</div>{viewed.map((event) => <div key={event.occurredAt} className="text-sm text-[#0b6e69]"><p>閲覧されました：{new Date(event.occurredAt).toLocaleString("ja-JP")}</p><p className="mt-1 text-xs text-[#64747b]">{event.proofVerified ? "署名検証済み" : "署名未検証"}</p></div>)}</div>;
}

export default function OpinionViewPage() { return <main className="min-h-screen bg-[#f4f7f8] px-6 py-12 text-[#14212b]"><div className="mx-auto max-w-3xl"><Link href="/" className="text-sm text-[#0b6e69]">← City Ikenbako</Link><div className="mt-10 rounded-lg border border-[#d9e1e5] bg-white p-7 sm:p-10"><Suspense fallback={<p>読み込み中…</p>}><ViewContent /></Suspense></div></div></main>; }
