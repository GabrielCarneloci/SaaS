// Protege rotas: exige cookie de sessão presente para /dashboard, /admin, /perfil e as APIs.
// A validação completa (sessão não revogada) acontece em usuarioDaSessao(), chamada
// dentro das rotas — o middleware só barra quem não tem cookie nenhum.
import { NextRequest, NextResponse } from 'next/server';
import { tokenEhValido, NOME_COOKIE_SESSAO } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/api/leads/preview')) {
    return NextResponse.next();
  }

  const token = req.cookies.get(NOME_COOKIE_SESSAO)?.value;
  const valido = token ? await tokenEhValido(token) : false;

  const rotaProtegida =
    req.nextUrl.pathname.startsWith('/dashboard') ||
    req.nextUrl.pathname.startsWith('/admin') ||
    req.nextUrl.pathname.startsWith('/perfil') ||
    req.nextUrl.pathname.startsWith('/api/leads') ||
    req.nextUrl.pathname.startsWith('/api/admin') ||
    req.nextUrl.pathname.startsWith('/api/historico');

  if (rotaProtegida && !valido) {
    if (req.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/perfil/:path*', '/api/leads/:path*', '/api/admin/:path*', '/api/historico/:path*'],
};
