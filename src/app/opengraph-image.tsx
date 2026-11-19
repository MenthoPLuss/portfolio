import { ImageResponse } from "next/og";
import { MARK_PATHS } from "@/lib/mark";

export const alt = "Asimangkan Boro · Software developer from Assam";
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
          alignItems: "center",
          backgroundColor: "#0B0E0D",
          backgroundImage: "radial-gradient(ellipse at 28% 78%, rgba(255,175,118,0.20), rgba(11,14,13,0) 60%)",
          color: "#F3EFE4",
          padding: "80px",
          gap: "64px",
        }}
      >
        <svg width="300" height="300" viewBox="0 0 32 32" fill="none" stroke="#FFAF76" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          {MARK_PATHS.map((d) => (
            <path key={d} d={d} />
          ))}
        </svg>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 30, color: "#B9B9AE", letterSpacing: 2 }}>ASIMANGKAN BORO</div>
          <div style={{ fontSize: 68, lineHeight: 1.05, marginTop: 18, maxWidth: 680 }}>Software developer from Assam.</div>
          <div style={{ fontSize: 28, color: "#B7D0A5", marginTop: 28 }}>Final-year CSE · Jorhat Engineering College</div>
        </div>
      </div>
    ),
    size,
  );
}
