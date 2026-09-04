import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f4f7f8] text-[#14212b]">
      <header className="border-b border-[#d9e1e5] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="flex items-center gap-3 font-semibold tracking-tight"
          >
            <span className="grid h-9 w-9 place-items-center rounded-md bg-[#0b6e69] text-white">
              CI
            </span>
            <span>City Ikenbako</span>
          </Link>
          <Link
            href="/councilor/login"
            className="text-sm text-[#42616b] hover:text-[#0b6e69]"
          >
            市議・担当者ログイン
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.22em] text-[#0b6e69]">
            Civic signal / 01
          </p>
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            まちへの声を、
            <br />
            届いた先まで見えるように。
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-[#52636b]">
            City
            Ikenbakoは、市民の意見を地域の担当者へ届け、送信と閲覧の事実を確認できる意見箱です。
          </p>
          <Link
            href="/submit"
            className="mt-9 inline-flex rounded-md bg-[#0b6e69] px-6 py-3 font-medium text-white hover:bg-[#075852]"
          >
            意見を送る
          </Link>
        </div>

        <div className="relative min-h-72 overflow-hidden rounded-lg border border-[#cbdadd] bg-[#eaf1f1] p-6">
          <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-[#9cb9b8]" />
          <div className="absolute inset-y-0 left-1/2 border-l border-dashed border-[#9cb9b8]" />
          <div className="relative grid h-full grid-cols-2 grid-rows-2 gap-8">
            {[
              ["01", "市民"],
              ["02", "地域"],
              ["03", "担当者"],
              ["04", "確認"],
            ].map(([number, label]) => (
              <div
                key={number}
                className="flex items-center gap-3 rounded-md border border-[#c3d4d4] bg-white/80 px-4 py-3"
              >
                <span className="text-xs font-semibold text-[#0b6e69]">
                  {number}
                </span>
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
          <p className="absolute bottom-0 right-2 text-xs tracking-wide text-[#63807f]">
            CONNECTED CITY / LOCAL NODE
          </p>
        </div>
      </section>
    </main>
  );
}
