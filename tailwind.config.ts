import type { Config } from "tailwindcss";
// Design tokens Ghopyeong. Ubah warna di sini saja.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#17110C",      // latar utama (gelap hangat)
        surface: "#221A13",    // kartu, input
        steam: "#3A2D20",      // border
        soy: "#F6E9D2",        // teks krem
        crust: "#F5B731",      // aksen kuning (CTA)
        chili: "#E5484D",      // error / saus
        jade: "#2E9E6F",       // sukses / lunas
        direct: "#D9453B",     // antrean langsung
        preorder: "#3B72B0",   // antrean pre-order
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: { pill: "999px", card: "20px" },
    },
  },
  plugins: [],
};
export default config;
