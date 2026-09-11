'use client';
// Controle do tema claro/escuro. Guarda a escolha no navegador,
// sem envolver backend nem banco de dados.
import { useEffect, useState } from 'react';

export type Tema = 'claro' | 'escuro';

export function useTema() {
  const [tema, definirTema] = useState<Tema>('claro');

  useEffect(() => {
    const salvo = (localStorage.getItem('tema') as Tema) || null;
    const inicial = salvo || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro');
    definirTema(inicial);
    document.documentElement.setAttribute('data-tema', inicial);
  }, []);

  function alternarTema() {
    const novo: Tema = tema === 'claro' ? 'escuro' : 'claro';
    definirTema(novo);
    localStorage.setItem('tema', novo);
    document.documentElement.setAttribute('data-tema', novo);
  }

  return { tema, alternarTema };
}
