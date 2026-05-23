"use client";
import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { useStore } from "@/lib/store";

const TOPOJSON_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Map ISO numeric -> ISO alpha-2 (a small selection — covers our country list)
const NUMERIC_TO_ALPHA2: Record<string, string> = {
  "004": "AF", "008": "AL", "012": "DZ", "032": "AR", "036": "AU", "040": "AT",
  "050": "BD", "056": "BE", "076": "BR", "100": "BG", "124": "CA", "152": "CL",
  "156": "CN", "158": "TW", "170": "CO", "188": "CR", "192": "CU", "203": "CZ",
  "208": "DK", "218": "EC", "230": "ET", "246": "FI", "250": "FR", "276": "DE",
  "300": "GR", "320": "GT", "344": "HK", "348": "HU", "352": "IS", "356": "IN",
  "360": "ID", "364": "IR", "368": "IQ", "372": "IE", "376": "IL", "380": "IT",
  "388": "JM", "392": "JP", "398": "KZ", "400": "JO", "404": "KE", "410": "KR",
  "414": "KW", "428": "LV", "434": "LY", "440": "LT", "442": "LU", "458": "MY",
  "484": "MX", "504": "MA", "528": "NL", "554": "NZ", "566": "NG", "578": "NO",
  "586": "PK", "591": "PA", "604": "PE", "608": "PH", "616": "PL", "620": "PT",
  "634": "QA", "642": "RO", "643": "RU", "682": "SA", "688": "RS", "702": "SG",
  "703": "SK", "705": "SI", "710": "ZA", "724": "ES", "752": "SE", "756": "CH",
  "764": "TH", "788": "TN", "792": "TR", "800": "UG", "804": "UA", "818": "EG",
  "826": "GB", "840": "US", "858": "UY", "862": "VE", "704": "VN",
};

type ZoomPreset = "world" | "europe" | "asia" | "africa";

const PRESETS: Record<
  ZoomPreset,
  { center: [number, number]; scale: number; label: string }
> = {
  world:  { center: [0, 0],       scale: 1.0, label: "World" },
  europe: { center: [12, 50],     scale: 4.5, label: "Europe" },
  asia:   { center: [100, 30],    scale: 2.5, label: "Asia" },
  africa: { center: [20, 0],      scale: 2.5, label: "Africa" },
};

export function WorldMap() {
  const { config } = useStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const [topo, setTopo] = useState<any>(null);
  const [preset, setPreset] = useState<ZoomPreset>("world");
  const [hoverCountry, setHoverCountry] = useState<string | null>(null);

  useEffect(() => {
    fetch(TOPOJSON_URL)
      .then((r) => r.json())
      .then((data) => {
        const fc = feature(data, data.objects.countries) as any;
        setTopo(fc);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!topo || !svgRef.current) return;
    const width = 520;
    const height = 320;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { center, scale } = PRESETS[preset];
    const projection = geoNaturalEarth1()
      .scale((width / 6.2) * scale)
      .translate([width / 2, height / 2])
      .center(center as [number, number]);

    const path = geoPath().projection(projection as any);

    const selectedSet = new Set(config.countries);

    svg
      .append("g")
      .selectAll("path")
      .data(topo.features)
      .join("path")
      .attr("d", path as any)
      .attr("fill", (d: any) => {
        const numeric = String(d.id).padStart(3, "0");
        const alpha2 = NUMERIC_TO_ALPHA2[numeric];
        if (alpha2 && selectedSet.has(alpha2)) return "#1A56DB";
        return "#F7F6F4";
      })
      .attr("stroke", "#E8E8E8")
      .attr("stroke-width", 0.5)
      .on("mouseenter", (_, d: any) => {
        const numeric = String(d.id).padStart(3, "0");
        const alpha2 = NUMERIC_TO_ALPHA2[numeric];
        if (alpha2) setHoverCountry(alpha2);
      })
      .on("mouseleave", () => setHoverCountry(null));
  }, [topo, config.countries, preset]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="font-mono uppercase text-[10px] tracking-widest text-tt-faint">
          Selected Geography
        </div>
        <div className="flex gap-1">
          {(Object.keys(PRESETS) as ZoomPreset[]).map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`font-mono text-[9px] tracking-widest uppercase px-2 py-1 border ${
                preset === p
                  ? "border-tt-text bg-tt-text text-white"
                  : "border-tt-border bg-white text-tt-muted hover:bg-tt-bg-alt"
              }`}
            >
              {PRESETS[p].label}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-tt-bg-alt border border-tt-border">
        <svg
          ref={svgRef}
          viewBox="0 0 520 320"
          className="w-full h-auto block"
        />
      </div>
      <div className="font-mono text-[10px] text-tt-muted mt-2 flex items-center justify-between">
        <span>{config.countries.length} countries</span>
        {hoverCountry && (
          <span className="text-tt-text">
            ◇ {hoverCountry}
            {config.countries.includes(hoverCountry) ? " · selected" : ""}
          </span>
        )}
      </div>
    </div>
  );
}
