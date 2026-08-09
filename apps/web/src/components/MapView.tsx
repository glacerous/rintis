"use client";

import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";

interface MapViewProps {
  slug: string;
  apiUrl: string;
}

export default function MapView({ slug, apiUrl }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maptilerKey, setMaptilerKey] = useState<string>("");
  const [trailMeta, setTrailMeta] = useState<{ name: string; region: string } | null>(null);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_MAPTILER_KEY || "";
    setMaptilerKey(key);
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || !maptilerKey) return;

    // Initialize MapLibre
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: `https://api.maptiler.com/maps/outdoor/style.json?key=${maptilerKey}`,
      center: [110.44, -7.45], // Default near Gunung Merbabu
      zoom: 12,
      pitch: 45, // Tilt for 3D look
      bearing: -10,
      maxPitch: 85,
    });

    mapRef.current = map;

    // Add navigation and terrain control
    map.addControl(new maplibregl.NavigationControl({
      visualizePitch: true,
      showCompass: true,
    }), "top-right");

    map.on("load", () => {
      // Add Terrain RGB-DEM source (encoding is 'terrarium' for MapTiler)
      map.addSource("terrain-rgb", {
        type: "raster-dem",
        tiles: [
          `https://api.maptiler.com/tiles/terrain-rgb/{z}/{x}/{y}.png?key=${maptilerKey}`
        ],
        tileSize: 256,
        encoding: "terrarium",
      });

      // Activate terrain
      map.setTerrain({
        source: "terrain-rgb",
        exaggeration: 1.5,
      });

      // Add simple atmosphere sky layer if available in MapLibre
      try {
        map.addLayer({
          id: "sky-layer",
          type: "sky",
          paint: {
            "sky-type": "atmosphere",
            "sky-atmosphere-color": "#0a0f1a",
            "sky-atmosphere-halo-color": "#1e293b",
          },
        });
      } catch (e) {
        console.log("Sky layer not supported on this style", e);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [maptilerKey]);

  // Load Trail Data when Slug changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !slug) return;

    const fetchTrail = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`${apiUrl}/trails/${slug}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch trail: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Find the route feature
        const routeFeature = data.features.find((f: any) => f.properties?.type === "route");
        if (!routeFeature) {
          throw new Error("No route LineString found in trail data.");
        }

        // Set metadata
        setTrailMeta({
          name: routeFeature.properties.name,
          region: routeFeature.properties.region
        });

        // Ensure map is loaded before styling
        if (!map.isStyleLoaded()) {
          await new Promise<void>((resolve) => {
            map.once("idle", resolve);
          });
        }

        // 1. Plot Route LineString
        if (map.getSource("route")) {
          (map.getSource("route") as maplibregl.GeoJSONSource).setData(routeFeature);
        } else {
          map.addSource("route", {
            type: "geojson",
            data: routeFeature,
          });

          // Glow Layer (thick, semi-transparent)
          map.addLayer({
            id: "route-glow",
            type: "line",
            source: "route",
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": "#10b981", // Emerald green glow
              "line-width": 8,
              "line-opacity": 0.35,
            },
          });

          // Solid Layer (thin, bright core)
          map.addLayer({
            id: "route-solid",
            type: "line",
            source: "route",
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": "#34d399", // Mint green
              "line-width": 4.5,
              "line-opacity": 0.95,
            },
          });
        }

        // 2. Clear previous markers
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];

        // 3. Add Custom Markers for Waypoints
        data.features.forEach((feature: any) => {
          if (feature.properties?.type !== "waypoint") return;

          const [lng, lat] = feature.geometry.coordinates;
          const { name, waypoint_type, elevation_m, condition_reports } = feature.properties;

          // Create custom marker container
          const markerEl = document.createElement("div");
          markerEl.className = "custom-marker w-7 h-7 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-md text-white font-extrabold select-none";
          markerEl.style.fontSize = "11px";

          // Styling colors based on waypoint types
          let markerColor = "#6366f1"; // Indigo default for pos
          let symbol = "P";

          if (waypoint_type === "peak") {
            markerColor = "#ef4444"; // Red
            symbol = "▲";
          } else if (waypoint_type === "camp") {
            markerColor = "#f97316"; // Orange/Amber
            symbol = "⛺";
          } else if (waypoint_type === "water_source") {
            markerColor = "#06b6d4"; // Cyan
            symbol = "💧";
          } else if (waypoint_type === "trailhead") {
            markerColor = "#10b981"; // Emerald
            symbol = "🏁";
          }

          markerEl.style.backgroundColor = markerColor;
          markerEl.style.color = "#ffffff";
          markerEl.innerHTML = `<span>${symbol}</span>`;

          // Setup Condition Reports HTML
          const reports = condition_reports || [];
          let reportsHtml = "";
          if (reports.length > 0) {
            reportsHtml = `
              <div class="mt-2 pt-2 border-t border-slate-700/60 max-h-36 overflow-y-auto space-y-1.5 pr-1 select-text">
                <div class="text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1">Laporan Kondisi</div>
                ${reports.map((r: any) => {
                  let badgeClass = "bg-slate-800 text-slate-400 border border-slate-700";
                  if (r.confidence_score >= 0.7) {
                    badgeClass = "bg-emerald-950 text-emerald-400 border border-emerald-900";
                  } else if (r.confidence_score >= 0.4) {
                    badgeClass = "bg-amber-950 text-amber-400 border border-amber-900";
                  }

                  let sourceLabel = r.source_type || "Source";
                  if (sourceLabel === "official_govt") sourceLabel = "Pemerintah";
                  else if (sourceLabel === "established_media") sourceLabel = "Media";
                  else if (sourceLabel === "verified_community") sourceLabel = "Komunitas";
                  else if (sourceLabel === "individual_post") sourceLabel = "Individu";

                  const dateStr = r.published_or_scraped_at 
                    ? new Date(r.published_or_scraped_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'short' }) 
                    : "-";

                  return `
                    <div class="text-[10px] leading-snug p-1.5 rounded bg-slate-900/60 border border-slate-800">
                      <div class="flex items-center justify-between gap-1 mb-1">
                        <span class="text-[7px] font-bold uppercase px-1 rounded ${badgeClass}">
                          C: ${Math.round(r.confidence_score * 100)}%
                        </span>
                        <span class="text-[7px] text-slate-500 font-bold uppercase">${sourceLabel} • ${dateStr}</span>
                      </div>
                      <div class="text-slate-200 font-normal">${r.claim_text}</div>
                      <a href="${r.source_url}" target="_blank" rel="noopener noreferrer" class="text-[8px] text-emerald-400 hover:underline block mt-0.5 pointer-events-auto">Buka Sumber ↗</a>
                    </div>
                  `;
                }).join("")}
              </div>
            `;
          }

          // Setup Popup
          const popupHtml = `
            <div class="flex flex-col select-none w-56">
              <span class="text-[9px] tracking-widest font-black uppercase text-slate-400 mb-0.5">${waypoint_type}</span>
              <span class="text-sm font-extrabold text-slate-100 leading-tight mb-1">${name}</span>
              ${elevation_m ? `<span class="text-xs text-emerald-400 font-semibold">Elevasi: ${elevation_m} mdpl</span>` : ""}
              ${reportsHtml}
            </div>
          `;

          const popup = new maplibregl.Popup({
            offset: 12,
            closeButton: true,
            closeOnClick: false,
            anchor: "bottom"
          }).setHTML(popupHtml);

          // Add Marker
          const marker = new maplibregl.Marker({ element: markerEl })
            .setLngLat([lng, lat])
            .setPopup(popup)
            .addTo(map);

          markersRef.current.push(marker);
        });

        // 4. Adjust camera to fit the path
        const coordinates = routeFeature.geometry.coordinates;
        if (coordinates.length > 0) {
          const bounds = new maplibregl.LngLatBounds();
          coordinates.forEach((coord: [number, number]) => {
            bounds.extend(coord);
          });

          map.fitBounds(bounds, {
            padding: { top: 80, bottom: 80, left: 240, right: 80 }, // give padding for sidebar
            duration: 2500,
            pitch: 50, // tilt to show 3D elevation
            bearing: -15,
          });
        }

      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load trail data.");
      } finally {
        setLoading(false);
      }
    };

    fetchTrail();
  }, [slug, apiUrl]);

  if (!maptilerKey) {
    return (
      <div className="w-full h-full min-h-[500px] flex items-center justify-center bg-slate-950 p-6">
        <div className="glass-panel max-w-md p-8 rounded-2xl text-center shadow-xl">
          <div className="w-12 h-12 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-2xl">!</div>
          <h2 className="text-xl font-bold mb-2">MapTiler Key Missing</h2>
          <p className="text-sm text-slate-400 mb-6">
            Please define the <b>NEXT_PUBLIC_MAPTILER_KEY</b> variable in your <b>.env.local</b> file at the frontend root directory to load the 3D map.
          </p>
          <div className="text-xs text-left bg-slate-900/80 p-3 rounded-lg border border-slate-800 font-mono text-slate-300">
            NEXT_PUBLIC_MAPTILER_KEY=your_key_here
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[500px]">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />

      {/* Floating Header info */}
      {trailMeta && (
        <div className="absolute top-4 left-4 z-10 glass-panel px-4 py-3 rounded-xl pointer-events-none select-none max-w-xs shadow-lg">
          <div className="text-[10px] tracking-wider font-extrabold uppercase text-emerald-400 mb-0.5">Jalur Pendakian Aktif</div>
          <h2 className="text-base font-bold text-slate-50 truncate">{trailMeta.name}</h2>
          <p className="text-xs text-slate-400 truncate">{trailMeta.region}</p>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="flex flex-col items-center bg-slate-900/90 border border-slate-800 px-6 py-4 rounded-xl shadow-2xl">
            <svg className="animate-spin h-6 w-6 text-emerald-500 mb-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-xs font-semibold text-slate-300">Memuat rute & waypoint 3D...</span>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute top-4 left-4 right-4 z-20 bg-red-950/80 border border-red-800/80 p-3 rounded-xl text-center shadow-lg text-sm text-red-200">
          ⚠️ {error}
        </div>
      )}

      {/* Map Legend */}
      <div className="absolute bottom-4 right-4 z-10 glass-panel px-3 py-2 rounded-xl text-[11px] shadow-lg flex flex-col gap-1.5 pointer-events-none select-none text-slate-300">
        <div className="font-extrabold uppercase text-[9px] text-slate-400 tracking-wider mb-0.5">Legenda Peta</div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-red-500 border border-slate-900 flex items-center justify-center text-[8px]">▲</span>
          <span>Puncak Gunung</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-orange-500 border border-slate-900 flex items-center justify-center text-[8px]">⛺</span>
          <span>Camp Site / Sabana</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-cyan-500 border border-slate-900 flex items-center justify-center text-[8px]">💧</span>
          <span>Sumber Air</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border border-slate-900 flex items-center justify-center text-[8px]">🏁</span>
          <span>Basecamp / Trailhead</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-indigo-500 border border-slate-900 flex items-center justify-center text-[8px]">P</span>
          <span>Pos / Informasi</span>
        </div>
      </div>
    </div>
  );
}
