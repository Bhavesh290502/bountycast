import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                "brand-purple": "var(--brand-purple)",
                "brand-purple-dark": "var(--brand-purple-dark)",
                "brand-gold": "var(--brand-gold)",
                "brand-gold-dim": "var(--brand-gold-dim)",
            },
        },
    },
    plugins: [],
};
export default config;
