import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;

// ImageResponse supports only a subset of CSS: flexbox only, no grid, no
// external stylesheets — so all styles here are inline and Tailwind does not
// apply.
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
          background: "#ffffff",
          padding: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 44,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: "#ED1B58",
          }}
        >
          YUFORA
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "#272123",
              maxWidth: 900,
            }}
          >
            Show your donors exactly what you need.
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 30,
              color: "#53464A",
              maxWidth: 860,
            }}
          >
            A wishlist shop and skill-based contests that run on your own
            website.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            height: 10,
            width: 220,
            background: "#ED1B58",
            borderRadius: 5,
          }}
        />
      </div>
    ),
    size,
  );
}
