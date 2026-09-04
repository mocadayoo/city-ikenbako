import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "City Ikenbako",
  description: "市民の声を地域へ届け、受信と閲覧を確認できる意見箱",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
