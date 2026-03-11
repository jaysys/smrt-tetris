export default function InternalServerErrorPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background:
          "radial-gradient(circle at top, rgba(255, 123, 0, 0.18), transparent 42%), #0f1320",
        color: "#f7f4ea",
        fontFamily: "'IBM Plex Sans KR', 'Pretendard', sans-serif",
        textAlign: "center"
      }}
    >
      <section>
        <p style={{ letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.72 }}>
          Internal Server Error
        </p>
        <h1 style={{ margin: "12px 0 8px", fontSize: "clamp(2rem, 5vw, 3rem)" }}>
          요청을 처리하지 못했습니다.
        </h1>
        <p style={{ margin: 0, maxWidth: "32rem", lineHeight: 1.6, opacity: 0.84 }}>
          잠시 후 다시 시도해 주세요. 문제가 반복되면 운영 팀에 재현 절차와 함께
          전달합니다.
        </p>
      </section>
    </main>
  );
}
