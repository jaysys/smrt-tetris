import type { Metadata } from "next";

const fallbackSiteUrl = "http://127.0.0.1:6004";

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.WEB_BASE_URL ??
  fallbackSiteUrl
).replace(/\/$/, "");

export const siteName = "SMRT Tetris";
export const defaultTitle = "SMRT Tetris | 무료 테트리스 웹게임, Marathon Sprint Daily Challenge";
export const defaultDescription =
  "로그인 없이 바로 플레이하는 무료 테트리스 웹게임. Marathon, Sprint 40라인, Daily Challenge를 모바일과 데스크톱에서 빠르게 즐기고 기록과 랭킹 흐름까지 확인할 수 있습니다.";

export const keywordPhrases = [
  "테트리스",
  "테트리스 게임",
  "무료 테트리스",
  "테트리스 웹게임",
  "브라우저 테트리스",
  "모바일 테트리스",
  "Tetris online",
  "free tetris game",
  "browser tetris",
  "Marathon tetris",
  "Sprint 40 lines",
  "Daily challenge tetris"
];

export function buildAbsoluteUrl(path = "/") {
  return new URL(path, siteUrl).toString();
}

export const defaultMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: defaultTitle,
    template: `%s | ${siteName}`
  },
  description: defaultDescription,
  keywords: keywordPhrases,
  alternates: {
    canonical: "/"
  },
  category: "games",
  creator: siteName,
  publisher: siteName,
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: buildAbsoluteUrl("/"),
    siteName,
    title: defaultTitle,
    description: defaultDescription
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  }
};

export function buildHomeJsonLd() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: siteName,
      url: buildAbsoluteUrl("/"),
      inLanguage: "ko-KR",
      description: defaultDescription
    },
    {
      "@context": "https://schema.org",
      "@type": "VideoGame",
      name: siteName,
      url: buildAbsoluteUrl("/"),
      applicationCategory: "Game",
      genre: ["Puzzle game", "Arcade game", "Falling block puzzle"],
      operatingSystem: "Web browser, Android, iOS, Desktop",
      playMode: "SinglePlayer",
      inLanguage: "ko-KR",
      description: defaultDescription,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "SMRT Tetris에서는 어떤 모드를 플레이할 수 있나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Marathon, Sprint 40라인, Daily Challenge 세 가지 모드를 제공하며 각각 생존 점수, 클리어 시간, 일일 목표 달성 흐름에 맞춰 플레이할 수 있습니다."
          }
        },
        {
          "@type": "Question",
          name: "로그인 없이 바로 테트리스를 플레이할 수 있나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "게스트 모드로 바로 플레이할 수 있으며, 이후 닉네임 등록과 기록 흐름을 이어갈 수 있도록 구성되어 있습니다."
          }
        },
        {
          "@type": "Question",
          name: "모바일에서도 테트리스 화면 전체가 보이나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "모바일 세로 화면과 일반 브라우저 창 높이 변화에 맞춰 HUD, 보드, 하단 조작 도크가 한 화면 안에 들어오도록 플레이 화면을 자동 조정합니다."
          }
        }
      ]
    }
  ];
}
