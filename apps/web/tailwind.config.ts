import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}", "../../packages/ui/src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      // ─── Sharp corners — Prinodia Workspace design principle ──────────────────────────
      borderRadius: {
        none: "0px",
        sm: "2px",
        DEFAULT: "2px",
        md: "2px",
        lg: "3px",
        xl: "4px",
        "2xl": "6px",
        "3xl": "8px",
        full: "9999px",
      },

      colors: {
        // ─── Navy — sidebar, dark surfaces ──────────────────────────────────
        navy: {
          950: "#030710",
          900: "#07101D", // ← sidebar background
          800: "#0C1929",
          700: "#122035",
          600: "#182B45",
          500: "#1E3558",
          400: "#2B4A76",
          300: "#3D65A0",
          200: "#5A85C4",
          100: "#9AB5DC",
          50: "#D6E4F4",
        },

        // ─── Primary — government blue, interactive elements ─────────────────
        primary: {
          50: "#EEF4FF",
          100: "#DBE9FF",
          200: "#B8D3FF",
          300: "#85B3FF",
          400: "#4D8CFF",
          500: "#1B6BFF",
          600: "#1550C8", // ← main CTA
          700: "#1040A8",
          800: "#0D2E80",
          900: "#0A205C",
          950: "#061440",
        },

        // ─── Gold — authority accent, used sparingly ─────────────────────────
        gold: {
          50: "#FDFAEB",
          100: "#FCF4CC",
          200: "#F9E799",
          300: "#F5D35A",
          400: "#EDBC28",
          500: "#D4A012", // ← authority accent
          600: "#AA7C09",
          700: "#7E5A06",
          800: "#574004",
          900: "#342601",
        },

        // ─── Danger — destructive actions and errors only ────────────────────
        danger: {
          50: "#FFF1F1",
          100: "#FFE1E1",
          200: "#FFC7C7",
          300: "#FF9D9D",
          400: "#FF6464",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
          800: "#991B1B",
          900: "#7F1D1D",
        },

        // ─── Success ─────────────────────────────────────────────────────────
        success: {
          50: "#F0FDF4",
          100: "#DCFCE7",
          200: "#BBF7D0",
          500: "#22C55E",
          600: "#16A34A",
          700: "#15803D",
          800: "#166534",
        },

        // ─── Warning ─────────────────────────────────────────────────────────
        warning: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
        },
      },

      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },

      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },

      letterSpacing: {
        tightest: "-0.04em",
        tighter: "-0.02em",
        tight: "-0.01em",
        normal: "0em",
        wide: "0.025em",
        wider: "0.05em",
        widest: "0.1em",
        label: "0.06em",
      },

      spacing: {
        "sidebar-width": "248px",
        "topbar-height": "56px",
      },

      screens: {
        xs: "480px",
      },

      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
        "card-md": "0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.05)",
        dialog: "0 20px 60px -12px rgb(0 0 0 / 0.30), 0 8px 24px -6px rgb(0 0 0 / 0.14)",
        authority: "inset 3px 0 0 #D4A012",
        none: "none",
      },

      animation: {
        "fade-in": "fadeIn 0.15s ease-out",
        "slide-down": "slideDown 0.12s ease-out",
        "slide-up": "slideUp 0.12s ease-out",
        "slide-in-left": "slideInLeft 0.2s ease-out",
        "slide-in-right": "slideInRight 0.2s ease-out",
      },

      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInLeft: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
        slideInRight: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
