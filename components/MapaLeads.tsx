'use client';
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Ponto {
  id: number;
  nome: string;
  latitude: number | null;
  longitude: number | null;
  contatado: boolean;
}

const TILES = {
  claro: 'https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png',
  escuro: 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png',
};

function corDeVar(nome: string, alternativa: string) {
  if (typeof window === 'undefined') return alternativa;
  const v = getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
  return v || alternativa;
}

export default function MapaLeads({
  pontos,
  selecionado,
  aoSelecionar,
  tema,
  aberturaLateral = 0,
}: {
  pontos: Ponto[];
  selecionado: number | null;
  aoSelecionar: (id: number) => void;
  tema: 'claro' | 'escuro';
  aberturaLateral?: number;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const camadaRef = useRef<L.LayerGroup | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);

  // cria o mapa uma vez
  useEffect(() => {
    if (!divRef.current || mapaRef.current) return;
    const mapa = L.map(divRef.current, { zoomControl: false, attributionControl: true });
    tileRef.current = L.tileLayer(TILES[tema], {
      attribution: '© OpenStreetMap · CARTO',
      maxZoom: 19,
    }).addTo(mapa);
    L.control.zoom({ position: 'bottomright' }).addTo(mapa);
    mapa.setView([-14.6, -52.5], 4);
    mapaRef.current = mapa;
    camadaRef.current = L.layerGroup().addTo(mapa);
    return () => {
      mapa.remove();
      mapaRef.current = null;
    };
  }, []);

  // troca os tiles quando o tema muda
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !tileRef.current) return;
    tileRef.current.setUrl(TILES[tema]);
  }, [tema]);

  // desenha os marcadores
  useEffect(() => {
    const mapa = mapaRef.current;
    const camada = camadaRef.current;
    if (!mapa || !camada) return;

    const latao = corDeVar('--brass', '#c9a45c');
    const apagado = corDeVar('--ink-3', '#8d9295');
    const fundo = corDeVar('--surface', '#fff');

    camada.clearLayers();
    const comCoord = pontos.filter((p) => p.latitude != null && p.longitude != null);
    if (comCoord.length === 0) return;

    comCoord.forEach((p) => {
      const ativo = p.id === selecionado;
      const marcador = L.circleMarker([Number(p.latitude), Number(p.longitude)], {
        radius: ativo ? 10 : 6.5,
        weight: ativo ? 3 : 1.5,
        color: p.contatado ? apagado : latao,
        fillColor: p.contatado ? fundo : latao,
        fillOpacity: p.contatado ? 0.5 : 0.85,
      });
      marcador.bindTooltip(p.nome, { direction: 'top', offset: [0, -8], opacity: 1 });
      marcador.on('click', () => aoSelecionar(p.id));
      marcador.addTo(camada);
    });

    const limites = L.latLngBounds(
      comCoord.map((p) => [Number(p.latitude), Number(p.longitude)] as [number, number])
    );
    // deixa espaço à esquerda para o painel flutuante não cobrir os pontos
    mapa.fitBounds(limites, {
      paddingTopLeft: [aberturaLateral, 90],
      paddingBottomRight: [60, 60],
      maxZoom: 15,
    });
  }, [pontos, selecionado, aoSelecionar, aberturaLateral]);

  // centraliza no selecionado
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || selecionado == null) return;
    const p = pontos.find((x) => x.id === selecionado);
    if (p?.latitude != null && p?.longitude != null) {
      mapa.panTo([Number(p.latitude), Number(p.longitude)], { animate: true, duration: 0.4 });
    }
  }, [selecionado, pontos]);

  return <div ref={divRef} className="w-full h-full" />;
}
