/** @type {import('tailwindcss').Config} */
export default {
    darkMode: "class",
    content: ["./index.html", "./src/**/*.{js,jsx}"],
    theme: {
        extend: {
            colors: {
                accent: "rgb(var(--accent) / <alpha-value>)",
                canvas: "rgb(var(--canvas) / <alpha-value>)",
                surface: "rgb(var(--surface) / <alpha-value>)",
                subtle: "rgb(var(--subtle) / <alpha-value>)",
                line: "rgb(var(--line) / <alpha-value>)",
                primary: "rgb(var(--text-primary) / <alpha-value>)",
                secondary: "rgb(var(--text-secondary) / <alpha-value>)"
            },
            fontFamily: {
                heading: ["'Inter'", "sans-serif"],
                body: ["'Inter'", "sans-serif"],
                mono: ["'IBM Plex Mono'", "monospace"]
            },
            boxShadow: {
                panel: "0 1px 2px rgba(0, 0, 0, 0.06)",
                menu: "0 12px 30px rgba(0, 0, 0, 0.16)"
            }
        }
    },
    plugins: []
};
