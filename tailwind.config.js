/** All values point at src/styles/tokens.css so white-label theme swaps restyle everything. */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        search: "var(--search)",
        "placeholder-img": "var(--placeholder-img)",
        accent: "rgb(var(--configThemeColorRgb) / <alpha-value>)",
        "accent-tint": "var(--accent-tint)",
        "accent-tint-strong": "var(--accent-tint-strong)",
        fg: "var(--text)",
        muted: "var(--text-muted)",
        soft: "var(--text-soft)",
        date: "var(--text-date)",
        danger: "var(--danger)",
        "toggle-off": "var(--toggle-off)",
        line: "var(--border)",
      },
      fontFamily: {
        sans: "var(--font-sans)",
        display: "var(--font-display)",
        logo: "var(--font-logo)",
        mono: "var(--font-mono)",
      },
      borderRadius: {
        pill: "var(--radius-pill)",
        card: "var(--radius-card)",
        panel: "var(--radius-panel)",
        inner: "var(--radius-inner)",
        tile: "var(--radius-tile)",
        popover: "var(--radius-popover)",
      },
      letterSpacing: { caps: "var(--tracking-caps)" },
    },
  },
  plugins: [],
};
