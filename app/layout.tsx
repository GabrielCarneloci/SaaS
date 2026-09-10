import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";

const corpo = Inter({ subsets: ["latin"], variable: "--font-corpo" });
const serifa = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-serifa" });

export const metadata: Metadata = {
  title: "Radar de Leads",
  description: "Encontre empresas locais que ainda não têm site",
};

const scriptTema = `
(function(){
  try {
    var t = localStorage.getItem('tema');
    if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
    document.documentElement.setAttribute('data-tema', t);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${corpo.variable} ${serifa.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
