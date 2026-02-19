import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)"],
        sans: ["var(--font-sans)"],
      },
      boxShadow: {
        neon: "0 0 18px rgba(34,211,238,.25), 0 0 42px rgba(168,85,247,.18)",
        neonStrong: "0 0 24px rgba(34,211,238,.35), 0 0 62px rgba(236,72,153,.22)",
      },
      colors: {
        bg0: "#050713",
        bg1: "#070a18",
        panel: "#0b1023",
        line: "rgba(34,211,238,.25)",
        neonCyan: "#22d3ee",
        neonPink: "#ff2fa7",
        neonViolet: "#a855f7",
      },
    },
  },
  plugins: [],
} satisfies Config;
