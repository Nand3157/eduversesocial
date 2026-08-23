import { ImageResponse } from "next/og";

export const alt = "EduVerse — Social intelligence that remembers your audience";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          backgroundColor: "#15120e",
          backgroundImage:
            "radial-gradient(circle at 85% 10%, rgba(224,105,59,0.28), transparent 45%), radial-gradient(circle at 5% 95%, rgba(168,67,31,0.35), transparent 40%)",
          fontFamily: "sans-serif"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <svg width="64" height="64" viewBox="0 0 64 64">
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#e0693b" />
                <stop offset="1" stopColor="#a8431f" />
              </linearGradient>
            </defs>
            <rect width="64" height="64" rx="14" fill="url(#g)" />
            <path
              d="M32 12l4.6 12.4L49 29l-12.4 4.6L32 46l-4.6-12.4L15 29l12.4-4.6z"
              fill="#faf7f0"
            />
            <circle cx="46" cy="17" r="3.5" fill="#faf7f0" opacity="0.85" />
          </svg>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 44,
              fontWeight: 700,
              color: "#f1eada",
              letterSpacing: "-0.02em"
            }}
          >
            Edu<span style={{ color: "#e0693b" }}>Verse</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "baseline",
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              color: "#f1eada",
              maxWidth: 940
            }}
          >
            <span>Social intelligence that&nbsp;</span>
            <span style={{ color: "#e0693b" }}>remembers</span>
            <span>&nbsp;your audience.</span>
          </div>
          <div style={{ display: "flex", gap: "16px", marginTop: "36px" }}>
            {["Instagram", "Facebook", "Threads"].map((platform) => (
              <div
                key={platform}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 24px",
                  borderRadius: 999,
                  border: "2px solid rgba(241,234,218,0.25)",
                  color: "#f1eada",
                  fontSize: 26
                }}
              >
                {platform}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size
  );
}
