const approvedSources = [
  {
    name: "Heroicons",
    purpose: "설정, 뒤로가기, 닫기 같은 유틸리티 아이콘",
    license: "MIT",
    status: "반입 전"
  },
  {
    name: "Material Symbols",
    purpose: "보조 시스템 아이콘",
    license: "Apache 2.0",
    status: "반입 전"
  },
  {
    name: "Game-icons.net",
    purpose: "트로피, 메달, 배지, 불꽃 같은 보상 아이콘",
    license: "CC BY",
    status: "반입 전"
  },
  {
    name: "Kenney UI Pack / Input Prompts / UI Audio",
    purpose: "버튼 프레임, 입력 프롬프트, UI 사운드",
    license: "CC0",
    status: "반입 전"
  },
  {
    name: "Hero Patterns / BGJar",
    purpose: "배경 패턴과 장식용 SVG",
    license: "CC BY 4.0 또는 서비스별 표기 조건",
    status: "반입 전"
  }
] as const;

export default function CreditsPage() {
  return (
    <main className="page-shell credits-shell">
      <section className="hero-panel compact-hero">
        <p className="eyebrow">Credits & Licenses</p>
        <h1>시각 에셋 출처와 라이선스 기준</h1>
        <p className="lead">
          현재 공개 웹에는 외부 SVG, 아이콘, 배경 자산을 아직 반입하지 않았습니다.
          이 페이지는 이후 자산을 추가할 때 사용할 출처, 라이선스, 크레딧 기준을
          공개적으로 고정하기 위한 운영 페이지입니다.
        </p>
        <div className="cta-row">
          <a className="cta-button cta-button--utility" href="/">
            홈으로
          </a>
          <a className="cta-button cta-button--rank" href="/assets-source/LICENSE_INVENTORY.md">
            라이선스 인벤토리 보기
          </a>
        </div>
      </section>

      <section className="credits-grid">
        <article className="info-card">
          <h2>운영 원칙</h2>
          <ul className="credits-list">
            <li>공식 Tetris, Royal Match, Candy Crush, Subway Surfers 자산은 직접 사용하지 않습니다.</li>
            <li>공개 게임 사례에서는 톤, 배치, 보상 언어, 서비스 밀도만 참조합니다.</li>
            <li>외부 자산은 반입 전에 원본 URL과 라이선스를 인벤토리에 먼저 기록합니다.</li>
            <li>CC BY 계열은 공개 credits 페이지와 내부 인벤토리에 동시에 기록합니다.</li>
          </ul>
        </article>

        <article className="info-card">
          <h2>현재 상태</h2>
          <p className="credits-note">
            이번 단계의 작업은 에셋 운영 구조와 컬러/CTA 체계 선행 고정입니다.
            실제 아이콘, 배경, 사운드 자산은 아직 반입하지 않았고, 반입 시에는 아래 표와
            인벤토리 파일을 함께 갱신합니다.
          </p>
          <p className="mono-note">assets-source/LICENSE_INVENTORY.md</p>
          <p className="mono-note">assets-source/README.md</p>
        </article>
      </section>

      <section className="info-card">
        <h2>승인 소스 목록</h2>
        <table className="credits-table">
          <thead>
            <tr>
              <th>소스</th>
              <th>용도</th>
              <th>라이선스</th>
              <th>현재 상태</th>
            </tr>
          </thead>
          <tbody>
            {approvedSources.map((source) => (
              <tr key={source.name}>
                <td>{source.name}</td>
                <td>{source.purpose}</td>
                <td>{source.license}</td>
                <td>{source.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
