import type { Metadata } from "next";
import type { ReactNode } from "react";
import { defaultMetadata, siteName } from "./seo";
import "./globals.css";

export const metadata: Metadata = defaultMetadata;

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#101631"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <a className="skip-link" href="#content">
          본문 바로가기
        </a>
        {children}
        <noscript>{siteName}는 JavaScript 사용 시 최적의 게임 플레이를 제공합니다.</noscript>
      </body>
    </html>
  );
}
