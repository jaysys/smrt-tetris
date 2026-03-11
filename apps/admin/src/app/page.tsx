const checklist = [
  "Daily Challenge 설정",
  "시즌/공지 관리",
  "부정행위 검토 큐",
  "구성 버전 조회"
];

export default function AdminHomePage() {
  return (
    <main className="admin-shell">
      <section className="admin-hero">
        <p className="tag">Admin Surface</p>
        <h1>운영 백오피스 기본 구조</h1>
        <p>
          운영 API와 연결될 관리 화면 골격입니다. D5에서 챌린지, 공지, 의심
          기록 조치 화면을 이어서 구현합니다.
        </p>
        <div className="admin-actions">
          <button type="button" data-testid="create-daily-button">
            Daily 생성
          </button>
          <button type="button" data-testid="announcement-create-button">
            공지 생성
          </button>
        </div>
      </section>

      <section className="admin-panel" data-testid="fraud-queue-table">
        <h2>예정 기능</h2>
        <ul>
          {checklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
