import type { Config } from "tailwindcss";

export default {
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-source-code-pro)"],
        mono: ["var(--font-source-code-pro)"],
      },
    },
  },
  plugins: [],
} satisfies Config