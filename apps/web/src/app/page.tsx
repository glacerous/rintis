"use client";

import React, { useState, useEffect, useRef } from "react";
import MapView from "@/components/MapView";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ScrapeJob {
  id: string;
  status: "pending" | "running" | "done" | "failed";
  discovered_count: number;
  processed_count: number;
  failed_count: number;
  error_message?: string | null;
}

// ── Discovery Card Component ──────────────────────────────────────────────────
function DiscoveryCard({
  slug,
  apiUrl,
  onJobDone,
}: {
  slug: string;
  apiUrl: string;
  onJobDone: () => void;
}) {
  const [job, setJob] = useState<ScrapeJob | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stop polling when unmounted
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startPolling = (jobId: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${apiUrl}/trails/${slug}/scrape-jobs/${jobId}`);
        if (!res.ok) return;
        const data: ScrapeJob = await res.json();
        setJob(data);
        if (data.status === "done" || data.status === "failed") {
          stopPolling();
          if (data.status === "done") {
            onJobDone();
          }
        }
      } catch {
        // silently retry next tick
      }
    }, 2500);
  };

  const handleDiscover = async () => {
    setTriggering(true);
    setError(null);
    setJob(null);
    try {
      const res = await fetch(`${apiUrl}/trails/${slug}/discover-and-scrape`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const initialJob: ScrapeJob = {
        id: data.job_id,
        status: "pending",
        discovered_count: 0,
        processed_count: 0,
        failed_count: 0,
      };
      setJob(initialJob);
      startPolling(data.job_id);
    } catch (err: any) {
      setError(err.message || "Gagal memulai discovery.");
    } finally {
      setTriggering(false);
    }
  };

  // ── Status display helpers ────────────────────────────────────────────────
  const isActive = job && (job.status === "pending" || job.status === "running");
  const isDone = job?.status === "done";
  const isFailed = job?.status === "failed";

  const statusLabel = () => {
    if (!job) return null;
    if (job.status === "pending") return "Menghubungi TinyFish...";
    if (job.status === "running") {
      if (job.discovered_count === 0) return "Mencari sumber data...";
      return `Memproses data (${job.processed_count}/${job.discovered_count} selesai${
        job.failed_count > 0 ? `, ${job.failed_count} gagal` : ""
      })`;
    }
    if (job.status === "done")
      return `Selesai! ${job.processed_count} URL diproses${
        job.failed_count > 0 ? `, ${job.failed_count} gagal` : ""
      }.`;
    if (job.status === "failed") return `Gagal: ${job.error_message || "Unknown error"}`;
    return null;
  };

  return (
    <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-lg">🔍</span>
        <div>
          <div className="text-[9px] font-black uppercase tracking-widest text-emerald-400">
            Auto-Discovery
          </div>
          <div className="text-xs font-bold text-slate-200">
            Cari Laporan Kondisi
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-[10px] text-slate-400 leading-relaxed">
        Temukan laporan kondisi jalur terbaru secara otomatis dari sumber resmi,
        media, dan trip report pendaki.
      </p>

      {/* Status banner */}
      {job && (
        <div
          className={`flex items-start gap-2 p-2.5 rounded-lg text-[10px] border ${
            isDone
              ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
              : isFailed
              ? "bg-red-950/60 border-red-800 text-red-300"
              : "bg-slate-800/60 border-slate-700 text-slate-300"
          }`}
        >
          {isActive && (
            <svg
              className="animate-spin h-3 w-3 mt-0.5 text-emerald-400 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          {isDone && <span className="text-emerald-400 shrink-0">✓</span>}
          {isFailed && <span className="text-red-400 shrink-0">✗</span>}
          <span className="leading-snug">{statusLabel()}</span>
        </div>
      )}

      {/* Progress bar when running */}
      {isActive && job.discovered_count > 0 && (
        <div className="w-full bg-slate-800 rounded-full h-1">
          <div
            className="bg-emerald-500 h-1 rounded-full transition-all duration-500"
            style={{
              width: `${Math.round(
                ((job.processed_count + job.failed_count) / job.discovered_count) * 100
              )}%`,
            }}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-[10px] text-red-300 bg-red-950/50 border border-red-800 p-2 rounded-lg">
          {error}
        </div>
      )}

      {/* Button */}
      <button
        id="discover-and-scrape-btn"
        onClick={handleDiscover}
        disabled={triggering || !!isActive}
        className={`w-full py-2 px-4 rounded-lg text-xs font-bold tracking-wide transition-all duration-200 ${
          triggering || isActive
            ? "bg-slate-700 text-slate-400 cursor-not-allowed"
            : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md hover:shadow-emerald-900/40 active:scale-95"
        }`}
      >
        {triggering
          ? "Memulai..."
          : isActive
          ? "Sedang Berjalan..."
          : isDone
          ? "Cari Lagi"
          : "Mulai Discovery"}
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [activeSlug, setActiveSlug] = useState("gunung-merbabu-selo");
  const [waypoints, setWaypoints] = useState<any[]>([]);
  const [trailMeta, setTrailMeta] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  // Incrementing this triggers MapView to re-fetch trail data
  const [mapRefreshKey, setMapRefreshKey] = useState(0);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

  const fetchTrailInfo = async () => {
    if (!activeSlug) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/trails/${activeSlug}`);
      if (res.ok) {
        const data = await res.json();
        const route = data.features.find((f: any) => f.properties?.type === "route");
        if (route) setTrailMeta(route.properties);
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

  // Fetch list of waypoints for the sidebar display
  useEffect(() => {
    fetchTrailInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlug, apiUrl]);

  const handleJobDone = () => {
    // Increment key to force MapView to re-fetch enriched trail data
    setMapRefreshKey((k) => k + 1);
    // Also refresh sidebar waypoint list
    fetchTrailInfo();
  };

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

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Trail Info */}
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

          {/* Auto-Discovery Card */}
          <DiscoveryCard
            slug={activeSlug}
            apiUrl={apiUrl}
            onJobDone={handleJobDone}
          />

          {/* Quick Guide */}
          <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800/80 text-xs text-slate-300 space-y-2">
            <div className="font-extrabold text-[9px] uppercase tracking-wider text-slate-400">Navigasi Peta 3D</div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400">🖱️</span>
              <p><b>Klik Kanan + Tarik</b>: Memutar &amp; mengatur sudut pandang 3D (tilt/pitch).</p>
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
          Rintis App &copy; {new Date().getFullYear()} • Stage 3
        </div>
      </aside>

      {/* Map Content */}
      <section className="flex-1 h-full relative bg-slate-950">
        <MapView slug={activeSlug} apiUrl={apiUrl} refreshKey={mapRefreshKey} />
      </section>
    </main>
  );
}
