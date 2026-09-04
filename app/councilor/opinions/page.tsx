"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Opinion = { id: string; title: string | null; body: string; status: "OPEN" | "COMPLETED" | "DELETED"; createdAt: string };

export default function CouncilorOpinionsPage() {
  const router = useRouter();
  const [opinions, setOpinions] = useState<Opinion[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/councilor/opinions", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message ?? "取得できませんでした。");
        return body.data;
      })
      .then(setOpinions)
      .catch((reason: Error) => setError(reason.message));
  }, []);

  async function logout() {
    await fetch("/api/councilor/auth/logout", { method: "POST" });
    router.push("/councilor/login");
  }

  return <main className="min-h-screen bg-[#f4f7f8] px-6 py-12 text-[#14212b]"><div className="mx-auto max-w-5xl"><div className="flex items-start justify-between gap-4"><div><Link href="/" className="inline-flex items-center gap-2 text-sm text-[#0b6e69]"><span aria-hidden="true" className="back-mark" />City Ikenbako</Link><p className="mt-8 text-sm font-semibold tracking-[0.2em] text-[#0b6e69]">COUNCILOR CONSOLE</p><h1 className="mt-2 text-3xl font-semibold">意見一覧</h1></div><button onClick={logout} className="text-sm text-[#64747b] hover:text-[#a23b2f]">ログアウト</button></div>{error ? <p role="alert" className="mt-8 rounded-md bg-[#fff1ef] p-4 text-sm text-[#a23b2f]">{error}</p> : <div className="mt-8 divide-y divide-[#d9e1e5] rounded-lg border border-[#d9e1e5] bg-white">{opinions.map((opinion) => <Link key={opinion.id} href={`/councilor/opinions/view?id=${encodeURIComponent(opinion.id)}`} className="block p-5 hover:bg-[#f8fafb]"><div className="flex items-center justify-between gap-4"><h2 className="font-semibold">{opinion.title || "無題の意見"}</h2><div className="flex items-center gap-3"><span className="rounded-full border border-[#b8d1cf] px-2 py-1 text-xs text-[#0b6e69]">{opinion.status === "OPEN" ? "対応中" : opinion.status === "COMPLETED" ? "対応完了" : "削除済み"}</span><span className="text-xs text-[#64747b]">{new Date(opinion.createdAt).toLocaleString("ja-JP")}</span></div></div><p className="mt-2 line-clamp-2 text-sm leading-6 text-[#64747b]">{opinion.body}</p></Link>)}{opinions.length === 0 && <p className="p-6 text-sm text-[#64747b]">意見はまだありません。</p>}</div>}</div></main>;
}
