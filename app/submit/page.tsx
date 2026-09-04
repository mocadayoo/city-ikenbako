"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type Councilor = { id: string; name: string; district: string | null; organization: string };

export default function SubmitPage() {
  const [councilors, setCouncilors] = useState<Councilor[]>([]);
  const [recipientId, setRecipientId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetch("/api/councilors").then((response) => response.json()).then((body) => {
      setCouncilors(body.data ?? []);
      if (body.data?.[0]) setRecipientId(body.data[0].id);
    }).catch(() => setError("送信先を取得できませんでした。"));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setMessage(null); setIsSending(true);
    // React's event.currentTarget is only guaranteed during dispatch. Keep the
    // form element before awaiting the request so a successful response cannot
    // be turned into a client-side communication error by reset().
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch("/api/opinions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: form.get("email"), body: form.get("body"), title: form.get("title") || undefined, recipientId }) });
      const result = await response.json();
      if (!response.ok) {
        const labels: Record<string, string> = { email: "メールアドレス", body: "意見本文", title: "タイトル", recipientId: "送信先", category: "カテゴリ", region: "地域" };
        const fields = Array.isArray(result.fields)
          ? result.fields.map((field: { path?: string }) => labels[field.path ?? ""] ?? field.path).join("、")
          : "";
        setError(fields ? `入力を確認してください：${fields}` : result.error?.message ?? "送信できませんでした。");
        return;
      }
      formElement.reset();
      const mailMessage = result.data.confirmationMailStatus === "MOCK_FAILED"
        ? "確認用URLのコンソール出力に失敗しました。"
        : "確認用URLは開発コンソールに出力されています。";
      setMessage(`受付完了しました。受付ID: ${result.data.opinionId}。${mailMessage}`);
    } catch {
      setError("送信できませんでした。通信状態を確認してください。");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f7f8] px-6 py-12 text-[#14212b]"><div className="mx-auto max-w-2xl"><Link href="/" className="text-sm text-[#0b6e69]">← City Ikenbako</Link><div className="mt-10 rounded-lg border border-[#d9e1e5] bg-white p-7 sm:p-10"><p className="text-sm font-semibold tracking-[0.2em] text-[#0b6e69]">OPINION INTAKE</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">意見を送る</h1><p className="mt-3 text-sm leading-6 text-[#64747b]">送信後、確認用URLをメールでお送りします。本文に個人情報を書かないようご注意ください。</p><form onSubmit={submit} className="mt-8 space-y-5"><label className="block text-sm font-medium">メールアドレス<input required name="email" type="email" className="mt-2 w-full rounded-md border border-[#cbdadd] px-3 py-2.5 outline-none focus:border-[#0b6e69]" /></label><label className="block text-sm font-medium">送信先<select required value={recipientId} onChange={(event) => setRecipientId(event.target.value)} className="mt-2 w-full rounded-md border border-[#cbdadd] bg-white px-3 py-2.5 outline-none focus:border-[#0b6e69]"><option value="">選択してください</option>{councilors.map((councilor) => <option key={councilor.id} value={councilor.id}>{councilor.name}（{councilor.organization}）</option>)}</select></label><label className="block text-sm font-medium">タイトル（任意）<input name="title" maxLength={200} className="mt-2 w-full rounded-md border border-[#cbdadd] px-3 py-2.5 outline-none focus:border-[#0b6e69]" /></label><label className="block text-sm font-medium">意見本文<textarea required name="body" maxLength={20000} rows={8} className="mt-2 w-full resize-y rounded-md border border-[#cbdadd] px-3 py-2.5 outline-none focus:border-[#0b6e69]" /></label>{error && <p role="alert" className="rounded-md bg-[#fff1ef] px-4 py-3 text-sm text-[#a23b2f]">{error}</p>}{message && <p role="status" className="rounded-md bg-[#edf7f2] px-4 py-3 text-sm text-[#23634b]">{message}</p>}<button disabled={isSending || !recipientId} className="w-full rounded-md bg-[#0b6e69] px-5 py-3 font-medium text-white hover:bg-[#075852] disabled:cursor-not-allowed disabled:opacity-50">{isSending ? "送信中…" : "意見を送信"}</button></form></div></div></main>
  );
}
