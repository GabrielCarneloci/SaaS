// Protege rotas: exige login para /dashboard e para as APIs de leads
import { NextRequest, NextResponse } from 'next/server';
import { verificarToken, NOME_COOKIE_SESSAO } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(NOME_COOKIE_SESSAO)?.value;
  const sessao = token ? await verificarToken(token) : null;

  const rotaProtegida =
    req.nextUrl.pathname.startsWith('/dashboard') ||
    req.nextUrl.pathname.startsWith('/api/leads');

  if (rotaProtegida && !sessao) {
    if (req.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/leads/:path*'],
};
