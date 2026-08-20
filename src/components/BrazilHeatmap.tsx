"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Map as LeafletMap, GeoJSON as LeafletGeoJSON } from "leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { IBGE_CODAREA_PARA_UF, NOMES_UF } from "@/lib/geo";
import "leaflet/dist/leaflet.css";

/**
 * Mapa coroplético real dos estados brasileiros (Leaflet + GeoJSON oficial
 * do IBGE, servicodados.ibge.gov.br — ver public/geo/brasil-uf.json),
 * intensidade de cinza proporcional ao número de candidatos por UF. Sem
 * camada de mapa-base (tiles) de propósito: um basemap colorido (OSM,
 * satélite) quebraria a regra de neutralidade preto/branco deste projeto,
 * e não é necessário para um coroplético de fronteiras estaduais — ver
 * docs/DESIGN_SYSTEM.md. Renderizado só no client (Leaflet depende de
 * `window`), guardado por `montado` em vez de next/dynamic para manter
 * um único arquivo simples.
 */
export function BrazilHeatmap({ porUf }: { porUf: Array<{ uf: string; total: number }> }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  // Efeito único: monta o mapa Leaflet no elemento do ref assim que o
  // componente aparece no DOM do browser (useEffect nunca roda durante
  // SSR, então não precisa de um estado "montado" à parte para isso).
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelado = false;
    let geoLayer: LeafletGeoJSON | null = null;

    (async () => {
      const L = await import("leaflet");
      if (cancelado || !containerRef.current) return;

      const totalPorUf = new Map(porUf.map((r) => [r.uf, r.total]));
      const maxTotal = Math.max(...porUf.map((r) => r.total), 1);

      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
        minZoom: 3,
        maxZoom: 8,
        scrollWheelZoom: false,
      }).setView([-14.2, -51.9], 4);
      mapRef.current = map;

      const res = await fetch("/geo/brasil-uf.json");
      const geojson = (await res.json()) as FeatureCollection<Geometry, { codarea: string }>;
      if (cancelado) return;

      const corParaTotal = (total: number) => {
        if (total <= 0) return "var(--surface-2)";
        const intensidade = 0.25 + 0.65 * (total / maxTotal);
        return `rgba(30, 30, 30, ${intensidade.toFixed(2)})`;
      };

      geoLayer = L.geoJSON(geojson, {
        style: (feature?: Feature<Geometry, { codarea: string }>) => {
          const uf = feature ? IBGE_CODAREA_PARA_UF[feature.properties.codarea] : undefined;
          const total = uf ? (totalPorUf.get(uf) ?? 0) : 0;
          return {
            fillColor: corParaTotal(total),
            fillOpacity: 1,
            color: "var(--hairline-strong)",
            weight: 1,
          };
        },
        onEachFeature: (feature: Feature<Geometry, { codarea: string }>, layer) => {
          const uf = IBGE_CODAREA_PARA_UF[feature.properties.codarea];
          const total = uf ? (totalPorUf.get(uf) ?? 0) : 0;
          const nome = uf ? NOMES_UF[uf] : "—";
          layer.bindTooltip(`<strong>${nome} (${uf})</strong><br/>${total} candidato${total === 1 ? "" : "s"}`, {
            sticky: true,
          });
          layer.on("click", () => {
            if (uf) router.push(`/buscar?modo=indireta&uf=${uf}`);
          });
        },
      }).addTo(map);

      map.fitBounds(geoLayer.getBounds(), { padding: [8, 8] });
    })();

    return () => {
      cancelado = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [porUf, router]);

  return (
    <div>
      <div
        ref={containerRef}
        className="h-[420px] w-full rounded-[18px] border sm:h-[520px]"
        style={{ borderColor: "var(--hairline)", background: "var(--surface-1)" }}
        role="img"
        aria-label="Mapa do Brasil com número de candidatos por estado"
      />
      <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
        <span>Menos candidatos</span>
        <span
          className="h-3 w-32 rounded-full"
          style={{
            background: "linear-gradient(to right, var(--surface-2), rgba(30,30,30,0.9))",
            border: "1px solid var(--hairline-strong)",
          }}
        />
        <span>Mais candidatos</span>
        <span className="ml-auto">Fonte: malhas territoriais do IBGE</span>
      </div>
    </div>
  );
}
