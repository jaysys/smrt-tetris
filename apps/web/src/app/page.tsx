import type { Metadata } from "next";
import { buildAbsoluteUrl, buildHomeJsonLd, defaultDescription, keywordPhrases } from "./seo";
import { GameClient } from "./game-client";

export const metadata: Metadata = {
  title: "무료 테트리스 웹게임",
  description: defaultDescription,
  keywords: keywordPhrases,
  alternates: {
    canonical: "/"
  },
  openGraph: {
    url: buildAbsoluteUrl("/"),
    title: "무료 테트리스 웹게임 | Marathon Sprint Daily Challenge",
    description: defaultDescription
  },
  twitter: {
    title: "무료 테트리스 웹게임 | Marathon Sprint Daily Challenge",
    description: defaultDescription
  }
};

const seoHighlights = [
  {
    title: "Marathon 테트리스",
    body: "오래 살아남으면서 점수와 레벨을 쌓는 기본 모드입니다. 브라우저에서 바로 플레이하고 생존 점수 흐름을 이어갈 수 있습니다."
  },
  {
    title: "Sprint 40라인",
    body: "40라인을 가장 빠르게 지우는 타임어택 모드입니다. 기록 단축과 입력 효율에 집중하는 테트리스 플레이어를 위한 흐름입니다."
  },
  {
    title: "Daily Challenge",
    body: "매일 바뀌는 목표를 빠르게 확인하고 오늘의 보상 루프를 이어갈 수 있도록 만든 일일 테트리스 챌린지 모드입니다."
  }
] as const;

const faqEntries = [
  {
    question: "이 사이트는 어떤 사람에게 맞나요?",
    answer:
      "브라우저에서 무료로 테트리스를 즐기고 싶은 사람, 모바일에서도 빠르게 한 판 시작하고 싶은 사람, Marathon과 Sprint 기록을 반복해서 갱신하고 싶은 사람에게 맞습니다."
  },
  {
    question: "로그인 없이 바로 플레이할 수 있나요?",
    answer:
      "게스트 모드로 바로 시작할 수 있습니다. 빠른 시작, 모드 선택, 랭킹 확인, Daily Challenge 진입 흐름을 첫 화면에서 바로 제공합니다."
  },
  {
    question: "모바일에서도 조작이 쉬운가요?",
    answer:
      "터치 조작 도크와 고스트 피스, 가이드 토글, 창 높이에 맞춘 자동 축소 레이아웃을 제공해 모바일 세로 화면에서도 보드와 조작부를 함께 볼 수 있습니다."
  }
] as const;

export default function HomePage() {
  return (
    <>
      <GameClient />
      <section id="content" className="page-shell seo-shell" aria-labelledby="seo-heading">
        <div className="hero-panel compact-hero seo-panel">
          <p className="eyebrow">Tetris Guide</p>
          <h2 id="seo-heading">무료 테트리스 웹게임을 찾는 플레이어를 위한 핵심 정보</h2>
          <p className="lead">
            SMRT Tetris는 설치 없이 바로 즐기는 브라우저 테트리스입니다. Marathon, Sprint
            40라인, Daily Challenge를 한 곳에서 플레이하고, 모바일과 데스크톱 모두에서
            빠르게 재도전할 수 있도록 설계했습니다.
          </p>
        </div>

        <div className="card-grid seo-card-grid">
          {seoHighlights.map((item) => (
            <article key={item.title} className="info-card seo-card">
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>

        <section className="hero-panel compact-hero seo-panel faq-panel" aria-labelledby="faq-heading">
          <p className="eyebrow">FAQ</p>
          <h2 id="faq-heading">테트리스 플레이어가 자주 묻는 질문</h2>
          <div className="faq-list">
            {faqEntries.map((entry) => (
              <article key={entry.question} className="faq-item">
                <h3>{entry.question}</h3>
                <p>{entry.answer}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildHomeJsonLd())
        }}
      />
    </>
  );
}
