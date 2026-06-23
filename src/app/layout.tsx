import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JUST SLASH BURST | 2D弾幕スラッシュアクション",
  description: "Webブラウザで即座にプレイ！物理反射する敵の極悪弾幕を、極小判定の『ジャストソード』で切り裂きバースト連撃を発動せよ！タイムアタックと斬撃スコアで限界に挑戦。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

