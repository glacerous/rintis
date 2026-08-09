"use client";

import React, { useState, useEffect } from "react";
import MapView from "@/components/MapView";

export default function Home() {
  const [activeSlug, setActiveSlug] = useState("gunung-merbabu-selo");
  const [waypoints, setWaypoints] = useState<any[]>([]);
  const [trailMeta, setTrailMeta] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

  // Fetch list of waypoints for the sidebar display
  useEffect(() => {
    if (!activeSlug) return;
    
    const fetchTrailInfo = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiUrl}/trails/${activeSlug}`);
        if (res.ok) {
          const data = await res.json();
          const route = data.features.find((f: any) => f.properties?.type === "route");
          if (route) {
            setTrailMeta(route.properties);
          }
          const wps = data.features
            .filter((f: any) => f.properties?.type === "waypoint")
            .map((f: any) => f.properties);
          setWaypoints(wps);
        }
      } catch (err) {
        console.error("Failed to fetch sidebar info", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrailInfo();
  }, [activeSlug, apiUrl]);

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Sidebar Panel */}
      <aside className="w-80 h-full flex flex-col glass-panel border-r border-slate-900 z-10 shrink-0 select-none">
        {/* Brand */}
        <div className="p-6 border-b border-slate-900 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center font-black text-slate-950 text-sm">R</span>
            <h1 className="text-xl font-black tracking-wider text-white">RINTIS</h1>
          </div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mt-1">
            Decision-Support Hiking Layer
          </p>
        </div>

        {/* Trail Info */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Jalur Pendakian</span>
            {trailMeta ? (
              <div className="mt-1">
                <h2 className="text-lg font-bold text-white leading-tight">{trailMeta.name}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{trailMeta.region}</p>
              </div>
            ) : (
              <div className="mt-1">
                <h2 className="text-lg font-bold text-slate-400 italic">Belum di-import</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Gunakan POST `/api/trails/import-osm` untuk memuat data gunung.
                </p>
              </div>
            )}
          </div>

          {/* Quick Guide */}
          <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800/80 text-xs text-slate-300 space-y-2">
            <div className="font-extrabold text-[9px] uppercase tracking-wider text-slate-400">Navigasi Peta 3D</div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400">🖱️</span>
              <p><b>Klik Kanan + Tarik</b>: Memutar & mengatur sudut pandang 3D (tilt/pitch).</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400">👆</span>
              <p><b>Klik Kiri</b>: Memilih marker waypoint untuk detail.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400">🔄</span>
              <p><b>Scroll</b>: Zoom in/out untuk memperbesar peta.</p>
            </div>
          </div>

          {/* Waypoints List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Daftar Waypoint ({waypoints.length})</span>
            </div>
            {loading ? (
              <div className="text-xs text-slate-400 animate-pulse py-4">Memuat daftar pos...</div>
            ) : waypoints.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {waypoints.map((wp, idx) => {
                  let badgeColor = "bg-indigo-950 text-indigo-400 border border-indigo-900";
                  if (wp.waypoint_type === "peak") badgeColor = "bg-red-950 text-red-400 border border-red-900";
                  if (wp.waypoint_type === "camp") badgeColor = "bg-orange-950 text-orange-400 border border-orange-900";
                  if (wp.waypoint_type === "water_source") badgeColor = "bg-cyan-950 text-cyan-400 border border-cyan-900";
                  if (wp.waypoint_type === "trailhead") badgeColor = "bg-emerald-950 text-emerald-400 border border-emerald-900";
                  
                  return (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-900 hover:border-slate-800 transition flex items-center justify-between gap-2">
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-200 truncate">{wp.name}</div>
                        {wp.elevation_m && (
                          <div className="text-[10px] text-emerald-400/80 font-semibold">{wp.elevation_m} mdpl</div>
                        )}
                      </div>
                      <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${badgeColor} shrink-0`}>
                        {wp.waypoint_type}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic py-4">Tidak ada waypoint. Silakan import data terlebih dahulu.</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-900 text-center text-[10px] text-slate-500 bg-slate-950/20">
          Rintis App &copy; {new Date().getFullYear()} • Stage 1
        </div>
      </aside>

      {/* Map Content */}
      <section className="flex-1 h-full relative bg-slate-950">
        <MapView slug={activeSlug} apiUrl={apiUrl} />
      </section>
    </main>
  );
}
