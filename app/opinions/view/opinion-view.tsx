"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Audience = "citizen" | "councilor";
type OpinionStatus = "OPEN" | "COMPLETED" | "DELETED";
type OpinionEventType = "SUBMITTED" | "DELIVERED" | "VIEWED" | "COMPLETED" | "DELETED" | "REOPENED";
type Opinion = {
  id: string;
  title: string | null;
  body: string;
  status: OpinionStatus;
  createdAt: string;
  viewNonce?: string;
  events: { type: OpinionEventType; occurredAt: string; proofVerified?: boolean }[];
};

const statusLabels: Record<OpinionStatus, string> = {
  OPEN: "対応中",
  COMPLETED: "対応完了",
  DELETED: "削除済み",
};

export function OpinionView({ audience }: { audience: Audience }) {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  const isCouncilor = audience === "councilor";
  const apiPath = isCouncilor ? "/api/councilor/opinions" : "/api/opinions";
  const [opinion, setOpinion] = useState<Opinion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`${apiPath}/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message ?? "取得できませんでした。");
        return body.data as Opinion;
      })
      .then(async (data) => {
        setOpinion(data);
        if (!isCouncilor || !data.viewNonce) return;

        try {
          const response = await fetch(`${apiPath}/${encodeURIComponent(data.id)}/views`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ viewNonce: data.viewNonce }),
          });
          const body = await response.json();
          if (!response.ok || !body.data?.viewedAt) return;
          setOpinion((current) => current ? {
            ...current,
            events: current.events.some((event) => event.type === "VIEWED" && event.occurredAt === body.data.viewedAt)
              ? current.events
              : [...current.events, { type: "VIEWED", occurredAt: body.data.viewedAt, proofVerified: body.data.proofVerified === true }],
          } : current);
        } catch {
          console.warn("[view] signed view recording failed");
        }
      })
      .catch((reason: Error) => setError(reason.message));
  }, [apiPath, id, isCouncilor]);

  async function updateStatus(action: "COMPLETE" | "REOPEN" | "DELETE") {
    if (!id || isUpdating) return;
    if (action === "DELETE" && !window.confirm("この意見と関連データをDBから完全に削除しますか？復元できません。")) return;

    setIsUpdating(true);
    setError(null);
    try {
      const response = await fetch(`${apiPath}/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "状態を変更できませんでした。");
      if (action === "DELETE") {
        router.push("/councilor/opinions");
        return;
      }
      setOpinion((current) => current ? { ...current, status: body.data.status } : current);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "状態を変更できませんでした。");
    } finally {
      setIsUpdating(false);
    }
  }

  if (!id) return <p className="rounded-md bg-[#fff1ef] p-4 text-sm text-[#a23b2f]">Opinion IDがありません。</p>;
  if (error && !opinion) return <p role="alert" className="rounded-md bg-[#fff1ef] p-4 text-sm text-[#a23b2f]">{error}</p>;
  if (!opinion) return <p className="text-sm text-[#64747b]">読み込み中…</p>;

  const viewed = opinion.events.filter((event) => event.type === "VIEWED");
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-5 border-b border-[#d9e1e5] pb-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[#0b6e69]">OPINION / {opinion.id.slice(0, 8)}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{opinion.title || "無題の意見"}</h1>
          <p className="mt-2 text-sm text-[#64747b]">{new Date(opinion.createdAt).toLocaleString("ja-JP")}</p>
        </div>
        <span className="rounded-full border border-[#b8d1cf] px-3 py-1 text-xs font-medium text-[#0b6e69]">{statusLabels[opinion.status]}</span>
      </div>

      <p className="whitespace-pre-wrap rounded-md border border-[#d9e1e5] bg-[#f8fafb] p-5 leading-8">{opinion.body}</p>

      {isCouncilor && opinion.status !== "DELETED" && (
        <div className="flex flex-wrap gap-3 border-b border-[#d9e1e5] pb-6">
          {opinion.status === "OPEN" ? (
            <button disabled={isUpdating} onClick={() => updateStatus("COMPLETE")} className="rounded-md bg-[#0b6e69] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">対応完了にする</button>
          ) : (
            <button disabled={isUpdating} onClick={() => updateStatus("REOPEN")} className="rounded-md border border-[#0b6e69] px-4 py-2 text-sm font-medium text-[#0b6e69] disabled:opacity-50">未完了に戻す</button>
          )}
          <button disabled={isUpdating} onClick={() => updateStatus("DELETE")} className="rounded-md border border-[#d9aaa4] px-4 py-2 text-sm font-medium text-[#a23b2f] disabled:opacity-50">削除する</button>
        </div>
      )}

      {error && <p role="alert" className="rounded-md bg-[#fff1ef] p-4 text-sm text-[#a23b2f]">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        {[["送信", opinion.events.some((event) => event.type === "SUBMITTED")], ["受信処理", opinion.events.some((event) => event.type === "DELIVERED")], ["閲覧", viewed.length > 0]].map(([label, complete]) => (
          <div key={String(label)} className="rounded-md border border-[#d9e1e5] bg-white p-4"><p className="text-xs text-[#64747b]">{label}</p><p className={`mt-2 font-semibold ${complete ? "text-[#0b6e69]" : "text-[#9aa8ad]"}`}>{complete ? "完了" : "未完了"}</p></div>
        ))}
      </div>
      {viewed.map((event) => <div key={event.occurredAt} className="text-sm text-[#0b6e69]"><p>閲覧されました：{new Date(event.occurredAt).toLocaleString("ja-JP")}</p><p className="mt-1 text-xs text-[#64747b]">{event.proofVerified ? "署名検証済み" : "署名未検証"}</p></div>)}
      {!isCouncilor && <Link href="/submit" className="inline-block text-sm text-[#0b6e69]">新しい意見を送る →</Link>}
    </div>
  );
}
