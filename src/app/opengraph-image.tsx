import { ImageResponse } from "next/og";
import { MARK_PATHS } from "@/lib/mark";

export const alt = "Asimangkan Boro · Making digital things feel human.";
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
          backgroundColor: "#F5F2EA",
          color: "#171917",
          padding: "64px 72px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 22, letterSpacing: 2, color: "#666961" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ display: "flex", width: 64, height: 64, backgroundColor: "#C7FF5E", alignItems: "center", justifyContent: "center" }}>
              <svg width="46" height="46" viewBox="0 0 32 32" fill="none" stroke="#171917" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {MARK_PATHS.map((d) => (
                  <path key={d} d={d} />
                ))}
              </svg>
            </div>
            <span>ASIMANGKAN BORO</span>
          </div>
          <span>PORTFOLIO · EDITION 2026</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 112, lineHeight: 0.98, letterSpacing: -3 }}>
          <span>Making digital</span>
          <span>things feel</span>
          <span style={{ display: "flex" }}>
            <span style={{ backgroundColor: "#C7FF5E", padding: "0 10px" }}>human</span>.
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: "#666961" }}>
          <span>Software developer from Assam</span>
          <span>Final-year CSE · Jorhat Engineering College</span>
        </div>
      </div>
    ),
    size,
  );
}
