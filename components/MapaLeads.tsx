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

export default function MapaLeads({
  pontos,
  selecionado,
  aoSelecionar,
}: {
  pontos: Ponto[];
  selecionado: number | null;
  aoSelecionar: (id: number) => void;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const camadaRef = useRef<L.LayerGroup | null>(null);

  // Cria o mapa uma vez
  useEffect(() => {
    if (!divRef.current || mapaRef.current) return;
    const mapa = L.map(divRef.current, { zoomControl: false, attributionControl: true });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap, © CARTO',
      maxZoom: 19,
      className: 'mapa-tema',
    }).addTo(mapa);
    L.control.zoom({ position: 'bottomright' }).addTo(mapa);
    mapa.setView([-14.24, -51.93], 4);
    mapaRef.current = mapa;
    camadaRef.current = L.layerGroup().addTo(mapa);
    return () => {
      mapa.remove();
      mapaRef.current = null;
    };
  }, []);

  // Redesenha os marcadores quando os pontos mudam
  useEffect(() => {
    const mapa = mapaRef.current;
    const camada = camadaRef.current;
    if (!mapa || !camada) return;

    camada.clearLayers();
    const comCoord = pontos.filter((p) => p.latitude != null && p.longitude != null);
    if (comCoord.length === 0) return;

    comCoord.forEach((p) => {
      const ativo = p.id === selecionado;
      const marcador = L.circleMarker([Number(p.latitude), Number(p.longitude)], {
        radius: ativo ? 9 : 6,
        weight: ativo ? 3 : 1.5,
        color: ativo ? 'var(--accent)' : p.contatado ? 'var(--ink-3)' : 'var(--accent)',
        fillColor: p.contatado ? 'var(--surface)' : 'var(--accent)',
        fillOpacity: p.contatado ? 0.35 : 0.75,
      });
      marcador.bindTooltip(p.nome, { direction: 'top', offset: [0, -8] });
      marcador.on('click', () => aoSelecionar(p.id));
      marcador.addTo(camada);
    });

    const limites = L.latLngBounds(comCoord.map((p) => [Number(p.latitude), Number(p.longitude)] as [number, number]));
    mapa.fitBounds(limites, { padding: [36, 36], maxZoom: 15 });
  }, [pontos, selecionado, aoSelecionar]);

  // Centraliza no lead selecionado
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || selecionado == null) return;
    const p = pontos.find((x) => x.id === selecionado);
    if (p?.latitude != null && p?.longitude != null) {
      mapa.panTo([Number(p.latitude), Number(p.longitude)], { animate: true });
    }
  }, [selecionado, pontos]);

  return <div ref={divRef} className="w-full h-full" />;
}
