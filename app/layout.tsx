import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const corpo = Inter({ subsets: ["latin"], variable: "--font-corpo" });
const destaque = Outfit({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-destaque" });

export const metadata: Metadata = {
  title: "Radar de Leads",
  description: "Encontre empresas locais que ainda não têm site",
};

// Sem isso, navegadores de celular renderizam a página como se fosse
// uma tela larga de desktop e depois encolhem tudo — é a causa mais
// comum de "layout quebrado" só no mobile.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
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
    <html lang="pt-BR" className={`${corpo.variable} ${destaque.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: scriptTema }} /></head>
      <body>{children}</body>
    </html>
  );
}
