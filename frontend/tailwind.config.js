/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,jsx}"],
    theme: {
        extend: {
            colors: {
                ink: "#111827",
                mist: "#e5e7eb",
                tide: "#0f766e",
                ember: "#c2410c",
                skywash: "#ecfeff"
            },
            fontFamily: {
                heading: ["'Space Grotesk'", "sans-serif"],
                body: ["'Manrope'", "sans-serif"],
                mono: ["'IBM Plex Mono'", "monospace"]
            },
            boxShadow: {
                panel: "0 20px 50px rgba(2, 6, 23, 0.12)"
            }
        }
    },
    plugins: []
};
