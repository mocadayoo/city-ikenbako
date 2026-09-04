"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Audience = "citizen" | "councilor";
type OpinionStatus = "OPEN" | "COMPLETED" | "DELETED";
type OpinionEventType = "SUBMITTED" | "DELIVERED" | "VIEWED" | "COMPLETED" | "DELETED" | "REOPENED";
type ViewProof = { version: number; payload: string; signature: string; verified: boolean };
type OpinionEvent = { type: OpinionEventType; occurredAt: string; proofVerified?: boolean; proof?: ViewProof };
type Opinion = {
  id: string;
  title: string | null;
  body: string;
  status: OpinionStatus;
  createdAt: string;
  viewNonce?: string;
  events: OpinionEvent[];
};

const statusLabels: Record<OpinionStatus, string> = {
  OPEN: "対応中",
  COMPLETED: "対応完了",
  DELETED: "削除済み",
};

const eventLabels: Record<OpinionEventType, { title: string; description: string }> = {
  SUBMITTED: { title: "送信", description: "意見が受け付けられました" },
  DELIVERED: { title: "受信処理", description: "担当者への紐付けが完了しました" },
  VIEWED: { title: "閲覧", description: "認証済みの担当者が閲覧しました" },
  COMPLETED: { title: "対応完了", description: "担当者が対応完了に変更しました" },
  REOPENED: { title: "再開", description: "担当者が未完了へ戻しました" },
  DELETED: { title: "削除", description: "削除処理が記録されました" },
};

function ViewProofModal({
  proof,
  opinionId,
  eventOccurredAt,
  onClose,
}: {
  proof: ViewProof;
  opinionId: string;
  eventOccurredAt: string;
  onClose: () => void;
}) {
  const [kind, version, signedOpinionId, accountId, occurredAt, ...rest] = proof.payload.split("|");
  const payloadMatches = kind === "view-proof" && Number(version) === proof.version && signedOpinionId === opinionId && occurredAt === eventOccurredAt && rest.length === 0;
  const checks = [
    ["署名方式", kind === "view-proof" ? "view-proof" : "不明"],
    ["証明バージョン", version ?? "不明"],
    ["対象意見ID", signedOpinionId ?? "不明"],
    ["署名者アカウント", accountId ?? "不明"],
    ["閲覧記録時刻", occurredAt ?? "不明"],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#14212b]/40 px-4 py-8" role="dialog" aria-modal="true" aria-label="閲覧証明の詳細">
      <div className="w-full max-w-xl rounded-lg border border-[#d9e1e5] bg-white p-6 shadow-xl sm:p-8">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-[#0b6e69]">VIEW PROOF</p>
            <h2 className="mt-2 text-xl font-semibold">閲覧証明の詳細</h2>
          </div>
          <button onClick={onClose} className="text-sm text-[#64747b] hover:text-[#14212b]">閉じる</button>
        </div>
        <div className={`mt-6 rounded-md border p-4 ${proof.verified && payloadMatches ? "border-[#b8d1cf] bg-[#edf7f2]" : "border-[#d9aaa4] bg-[#fff1ef]"}`}>
          <p className={`font-semibold ${proof.verified && payloadMatches ? "text-[#23634b]" : "text-[#a23b2f]"}`}>
            {proof.verified && payloadMatches ? "署名検証済み" : "署名を検証できません"}
          </p>
          <p className="mt-2 text-sm leading-6 text-[#52636b]">サーバーで署名を再検証し、署名対象の意見IDがこの画面の意見IDと一致しています。</p>
        </div>
        <dl className="mt-6 divide-y divide-[#d9e1e5] border-y border-[#d9e1e5]">
          {checks.map(([label, value]) => <div key={label} className="grid gap-2 py-3 sm:grid-cols-[9rem_1fr]"><dt className="text-xs text-[#64747b]">{label}</dt><dd className="break-all text-sm text-[#14212b]">{value}</dd></div>)}
        </dl>
        <div className="mt-5">
          <p className="text-xs text-[#64747b]">署名文字列</p>
          <p className="mt-2 break-all rounded-md bg-[#f8fafb] p-3 font-mono text-xs leading-5 text-[#52636b]">{proof.signature}</p>
        </div>
        <p className="mt-5 text-xs leading-5 text-[#64747b]">画面側では署名対象を分解して一致を確認しています。秘密鍵を使う暗号学的な再検証はサーバー側で行っています。</p>
      </div>
    </div>
  );
}

export function OpinionView({ audience }: { audience: Audience }) {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  const isCouncilor = audience === "councilor";
  const apiPath = isCouncilor ? "/api/councilor/opinions" : "/api/opinions";
  const [opinion, setOpinion] = useState<Opinion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedProof, setSelectedProof] = useState<ViewProof | null>(null);

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
              : [...current.events, { type: "VIEWED", occurredAt: body.data.viewedAt, proofVerified: body.data.proofVerified === true, proof: body.data.proof }],
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

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="space-y-5">
          <p className="whitespace-pre-wrap rounded-md border border-[#d9e1e5] bg-[#f8fafb] p-5 leading-8">{opinion.body}</p>

          {isCouncilor && opinion.status !== "DELETED" && (
            <div className="flex flex-wrap gap-3 border-b border-[#d9e1e5] pb-6">
              {opinion.status === "OPEN" ? (
                <button disabled={isUpdating} onClick={() => updateStatus("COMPLETE")} className="rounded-md bg-[#0b6e69] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">対応完了にする</button>
              ) : (
                <button disabled={isUpdating} onClick={() => updateStatus("REOPEN")} className="rounded-md border border-[#0b6e69] px-4 py-2 text-sm font-medium text-[#0b6e69] disabled:opacity-50">未完了に戻す</button>
              )}
              <button disabled={isUpdating} onClick={() => updateStatus("DELETE")} className="rounded-md border border-[#d9aaa4] px-4 py-2 text-sm font-medium text-[#a23b2f] disabled:opacity-50">DBから削除する</button>
            </div>
          )}

          {error && <p role="alert" className="rounded-md bg-[#fff1ef] p-4 text-sm text-[#a23b2f]">{error}</p>}
          {!isCouncilor && <Link href="/submit" className="inline-block text-sm text-[#0b6e69]">新しい意見を送る →</Link>}
        </section>

        <section className="rounded-md border border-[#d9e1e5] bg-white p-5">
          <p className="text-xs font-semibold tracking-[0.18em] text-[#0b6e69]">OPINION TREE</p>
          <h2 className="mt-2 text-lg font-semibold">進行履歴</h2>
          <ol className="mt-5 space-y-0">
            {opinion.events.map((event, index) => {
              const detail = eventLabels[event.type];
              const isLast = index === opinion.events.length - 1;
              return <li key={`${event.type}-${event.occurredAt}`} className="relative pl-7 pb-6 last:pb-0">
                {!isLast && <span className="absolute left-[0.3rem] top-3 h-full w-px bg-[#cbdadd]" aria-hidden="true" />}
                <span className={`absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border-2 ${event.type === "VIEWED" && event.proofVerified ? "border-[#0b6e69] bg-[#0b6e69]" : "border-[#8aa6a5] bg-white"}`} aria-hidden="true" />
                <p className="text-sm font-semibold text-[#14212b]">{detail.title}{event.type === "VIEWED" && event.proof && <><span className="px-1 text-[#8a999e]">-</span><button onClick={() => setSelectedProof(event.proof!)} className="font-medium text-[#0b6e69] underline underline-offset-2">証明</button></>}</p>
                <p className="mt-1 text-xs leading-5 text-[#64747b]">{detail.description}</p>
                <p className="mt-1 text-xs text-[#8a999e]">{new Date(event.occurredAt).toLocaleString("ja-JP")}</p>
              </li>;
            })}
          </ol>
        </section>
      </div>
      {selectedProof && <ViewProofModal proof={selectedProof} opinionId={opinion.id} eventOccurredAt={viewed.find((event) => event.proof === selectedProof)?.occurredAt ?? ""} onClose={() => setSelectedProof(null)} />}
    </div>
  );
}
