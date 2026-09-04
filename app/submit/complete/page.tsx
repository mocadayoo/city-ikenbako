import Link from "next/link";

export default async function SubmitCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const params = await searchParams;
  const opinionId = Array.isArray(params.id) ? params.id[0] : params.id;

  return <main className="min-h-screen bg-[#f4f7f8] px-6 py-12 text-[#14212b]"><div className="mx-auto max-w-2xl"><Link href="/" className="inline-flex items-center gap-2 text-sm text-[#0b6e69]"><span aria-hidden="true" className="back-mark" />City Ikenbako</Link><div className="mt-10 rounded-lg border border-[#d9e1e5] bg-white p-7 sm:p-10"><p className="text-sm font-semibold tracking-[0.2em] text-[#0b6e69]">SUBMISSION COMPLETE</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">意見を受け付けました</h1><p className="mt-4 leading-7 text-[#52636b]">意見は担当者への受信処理まで完了しています。この画面を更新しても、意見が再送信されることはありません。</p>{opinionId && <div className="mt-7 rounded-md border border-[#d9e1e5] bg-[#f8fafb] p-4"><p className="text-xs text-[#64747b]">受付ID</p><p className="mt-2 break-all font-mono text-sm text-[#14212b]">{opinionId}</p></div>}<p className="mt-6 text-sm leading-6 text-[#64747b]">確認用URLは登録したメールアドレスへ送信されます。開発環境ではサーバーコンソールに出力されます。</p><Link href="/" className="mt-8 inline-flex rounded-md bg-[#0b6e69] px-5 py-3 text-sm font-medium text-white hover:bg-[#075852]">トップへ戻る</Link></div></div></main>;
}
