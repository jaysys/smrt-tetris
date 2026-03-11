const adminChecklist = [
  "Daily Challenge 생성",
  "공지 생성",
  "Fraud queue 검토"
];

export default function AdminRoutePage() {
  return (
    <main className="page-shell">
      <section className="hero-panel">
        <p className="eyebrow">Embedded Admin Preview</p>
        <h1>로컬 운영 경로 `/admin` 베이스라인</h1>
        <p className="lead">
          테스트 문서의 로컬 운영 URL 기준에 맞춰 공개 웹 내부에 운영 플레이스홀더
          경로를 함께 제공합니다.
        </p>
        <div className="cta-row">
          <button type="button" className="cta-button primary" data-testid="create-daily-button">
            Daily 생성
          </button>
          <button type="button" className="cta-button" data-testid="announcement-create-button">
            공지 생성
          </button>
        </div>
      </section>

      <section className="card-grid">
        <article className="info-card" data-testid="fraud-queue-table">
          <h2>운영 자동화 선택자</h2>
          <p>운영 화면 E2E 착수 전까지 사용할 고정 선택자 베이스라인입니다.</p>
        </article>
        {adminChecklist.map((item) => (
          <article key={item} className="info-card">
            <h2>{item}</h2>
            <p>후속 D5 단계에서 실제 동작으로 연결합니다.</p>
          </article>
        ))}
      </section>
    </main>
  );
}
