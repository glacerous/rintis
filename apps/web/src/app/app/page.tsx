"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MapView from "@/components/MapView";
import Navbar from "@/components/Navbar";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// ── Custom Tooltip for Elevation Profile Chart ────────────────────────────────
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          backgroundColor: "#110f0d",
          border: "1px solid rgba(240, 237, 230, 0.15)",
          padding: "6px 10px",
          borderRadius: "2px",
          fontSize: "10px",
          fontFamily: "var(--font-sans)",
        }}
      >
        <div style={{ color: "rgba(240, 237, 230, 0.5)", fontWeight: 500 }}>{payload[0].payload.name}</div>
        <div style={{ color: "#E55B3C", fontWeight: 700, marginTop: "2px" }}>{payload[0].value} mdpl</div>
      </div>
    );
  }
  return null;
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();
  const [activeSlug, setActiveSlug] = useState("gunung-merbabu-selo");
  const [waypoints, setWaypoints] = useState<any[]>([]);
  const [trailMeta, setTrailMeta] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [mapRefreshKey, setMapRefreshKey] = useState(0);

  const [isMobile, setIsMobile] = useState(false);
  const [drawerExpanded, setDrawerExpanded] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

  // Check mobile viewport dynamically
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  useEffect(() => {
    fetchTrailInfo();
  }, [activeSlug, apiUrl]);

  // Extract chart data
  const elevationData = waypoints
    .filter((wp) => wp.elevation_m)
    .map((wp) => ({
      name: wp.name,
      elevation: wp.elevation_m,
    }));

  // Render Sidebar content
  const renderSidebarContent = () => (
    <>
      {/* Rich Trail Info Header */}
      <div
        style={{
          padding: "24px 24px 28px",
          borderBottom: "1px solid rgba(240, 237, 230, 0.08)",
          margin: "-24px -24px 0",
          backgroundImage: "radial-gradient(rgba(240, 237, 230, 0.1) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
          backgroundColor: "rgba(12, 11, 9, 0.35)",
        }}
      >
        <span style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", color: "#E55B3C" }}>
          Jalur Pendakian
        </span>
        {trailMeta ? (
          <div style={{ marginTop: "10px" }}>
            <h2 style={{ fontSize: "26px", fontWeight: 400, color: "#f0ede6", fontFamily: "var(--font-serif)", fontStyle: "italic", letterSpacing: "-0.01em", lineHeight: 1.15 }}>
              {trailMeta.name}
            </h2>
            <p style={{ fontSize: "11px", color: "rgba(240, 237, 230, 0.5)", marginTop: "4px", fontWeight: 500, letterSpacing: "0.02em" }}>
              {trailMeta.region}
            </p>

            {/* Trail Stats Badges */}
            <div style={{ display: "flex", gap: "16px", marginTop: "20px", borderTop: "1px solid rgba(240, 237, 230, 0.08)", paddingTop: "16px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "8px", fontWeight: 600, color: "rgba(240, 237, 230, 0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Jarak</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#f0ede6", marginTop: "2px" }}>8.9 km</div>
              </div>
              <div style={{ flex: 1, borderLeft: "1px solid rgba(240, 237, 230, 0.08)", paddingLeft: "16px" }}>
                <div style={{ fontSize: "8px", fontWeight: 600, color: "rgba(240, 237, 230, 0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Durasi</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#f0ede6", marginTop: "2px" }}>5-6 Jam</div>
              </div>
              <div style={{ flex: 1, borderLeft: "1px solid rgba(240, 237, 230, 0.08)", paddingLeft: "16px" }}>
                <div style={{ fontSize: "8px", fontWeight: 600, color: "rgba(240, 237, 230, 0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Waypoint</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#f0ede6", marginTop: "2px" }}>{waypoints.length} Pos</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: "8px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 500, color: "rgba(240, 237, 230, 0.4)", fontStyle: "italic" }}>
              Belum di-import
            </h2>
          </div>
        )}
      </div>

      {/* Mini Elevation Profile (Only rendered if data exists) */}
      {elevationData.length > 1 && (
        <div style={{ padding: "2rem 0 1.5rem", borderBottom: "1px solid rgba(240, 237, 230, 0.08)" }}>
          <div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(240, 237, 230, 0.4)", marginBottom: "1rem" }}>
            Profil Elevasi Rute
          </div>
          <div style={{ width: "100%", height: "100px", marginTop: "10px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={elevationData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorElevation" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E55B3C" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#E55B3C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" hide />
                <YAxis
                  domain={["dataMin - 100", "dataMax + 100"]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "rgba(240, 237, 230, 0.4)", fontSize: 8, fontFamily: "var(--font-sans)" }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="elevation"
                  stroke="#E55B3C"
                  strokeWidth={1.5}
                  fillOpacity={1}
                  fill="url(#colorElevation)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Auto-Discovery Section (Navigates to full page /app/discovery) */}
      <div
        style={{
          padding: "2rem 0 2rem",
          borderBottom: "1px solid rgba(240, 237, 230, 0.08)",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", color: "#E55B3C", marginBottom: "0.4rem" }}>
            Auto-Discovery
          </div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: "16px", fontWeight: 700, color: "#f0ede6", letterSpacing: "-0.01em" }}>
            Cari Laporan Kondisi
          </div>
        </div>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "rgba(240, 237, 230, 0.55)", lineHeight: 1.6, margin: 0 }}>
          Temukan laporan kondisi jalur terbaru secara otomatis dari sumber resmi, media, dan trip report pendaki.
        </p>
        <button
          id="discover-and-scrape-btn"
          onClick={() => router.push(`/app/discovery?slug=${activeSlug}`)}
          style={{
            width: "100%",
            padding: "10px 16px",
            borderRadius: "4px",
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            border: "none",
            cursor: "pointer",
            backgroundColor: "#E55B3C",
            color: "#ffffff",
            boxShadow: "0 4px 12px rgba(229, 91, 60, 0.2)",
            transition: "all 0.2s ease",
          }}
        >
          Mulai Discovery
        </button>
      </div>

      {/* Waypoints List */}
      <div style={{ padding: "2.5rem 0 1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <span style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(240, 237, 230, 0.4)" }}>
            Daftar Waypoint ({waypoints.length})
          </span>
        </div>

        {loading ? (
          <div style={{ fontSize: "12px", color: "rgba(240, 237, 230, 0.4)", padding: "16px 0" }} className="animate-pulse">
            Memuat daftar pos...
          </div>
        ) : waypoints.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {waypoints.map((wp, idx) => {
              let accentColor = "rgba(99, 102, 241, 0.4)"; // Indigo default
              if (wp.waypoint_type === "peak") accentColor = "#ef4444";
              else if (wp.waypoint_type === "camp") accentColor = "#f97316";
              else if (wp.waypoint_type === "water_source") accentColor = "#06b6d4";
              else if (wp.waypoint_type === "trailhead") accentColor = "#E55B3C";

              const isPeak = wp.waypoint_type === "peak";

              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 0",
                    borderBottom: "1px solid rgba(240, 237, 230, 0.05)",
                    gap: "1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                    {/* Left Accent Strip */}
                    <div
                      style={{
                        width: "2px",
                        height: "16px",
                        backgroundColor: accentColor,
                        borderRadius: "1px",
                        flexShrink: 0,
                      }}
                    />
                    {/* Meta details */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0, overflow: "hidden" }}>
                      <span
                        style={{
                          fontSize: "13.5px",
                          fontWeight: isPeak ? 400 : 500,
                          color: "#f0ede6",
                          fontFamily: isPeak ? "var(--font-serif)" : "var(--font-sans)",
                          fontStyle: isPeak ? "italic" : "normal",
                          letterSpacing: isPeak ? "0.01em" : "0",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                        }}
                      >
                        {wp.name}
                      </span>
                      <span
                        style={{
                          fontSize: "8.5px",
                          fontWeight: 600,
                          color: accentColor,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                        }}
                      >
                        {wp.waypoint_type}
                      </span>
                    </div>
                  </div>

                  {/* Tabular elevation */}
                  {wp.elevation_m ? (
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "rgba(240, 237, 230, 0.7)",
                        fontFamily: "var(--font-sans)",
                        fontVariantNumeric: "tabular-nums",
                        textAlign: "right",
                        flexShrink: 0,
                      }}
                    >
                      {wp.elevation_m} mdpl
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ fontSize: "12px", color: "rgba(240, 237, 230, 0.4)", padding: "16px 0", fontStyle: "italic" }}>
            Tidak ada waypoint.
          </div>
        )}
      </div>
    </>
  );

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "radial-gradient(ellipse at 72% 0%, #2b2319 0%, #161210 52%, #0c0a09 100%)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <Navbar />

      <main
        style={{
          display: "flex",
          width: "100%",
          height: "calc(100vh - 70px)",
          position: "absolute",
          top: "70px",
          left: 0,
        }}
      >
        {/* DESKTOP SIDEBAR PANEL */}
        {!isMobile && (
          <aside
            className="w-80 h-full flex flex-col border-r border-slate-900 z-10 shrink-0 select-none"
            style={{
              backgroundColor: "rgba(12, 11, 9, 0.45)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {renderSidebarContent()}
            </div>
            {/* Footer */}
            <div className="p-4 border-t border-slate-900 text-center text-[10px] text-slate-500 bg-slate-950/20">
              Rintis App &copy; {new Date().getFullYear()} • Stage 4
            </div>
          </aside>
        )}

        {/* MAP CONTAINER */}
        <section
          style={{
            flex: 1,
            height: "100%",
            position: "relative",
            backgroundColor: "#0c0a09",
          }}
        >
          <MapView slug={activeSlug} apiUrl={apiUrl} refreshKey={mapRefreshKey} />
        </section>

        {/* RESPONSIVE MOBILE BOTTOM SHEET DRAWER */}
        {isMobile && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              width: "100%",
              height: drawerExpanded ? "60vh" : "80px",
              zIndex: 35,
              backgroundColor: "rgba(12, 11, 9, 0.88)",
              backdropFilter: "blur(20px)",
              borderTop: "1px solid rgba(240, 237, 230, 0.08)",
              transition: "height 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Grab Handle Header */}
            <div
              onClick={() => setDrawerExpanded(!drawerExpanded)}
              style={{
                height: "80px",
                padding: "0 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <div>
                <div style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "#E55B3C" }}>
                  Jalur Pendakian
                </div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#f0ede6", marginTop: "2px" }}>
                  {trailMeta ? trailMeta.name : "Memuat..."}
                </div>
              </div>
              <button
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#E55B3C",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {drawerExpanded ? "Tutup Detail" : "Lihat Detail"}
              </button>
            </div>

            {/* Slider drag line marker */}
            <div
              onClick={() => setDrawerExpanded(!drawerExpanded)}
              style={{
                position: "absolute",
                top: "8px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "36px",
                height: "3px",
                borderRadius: "1.5px",
                backgroundColor: "rgba(240, 237, 230, 0.15)",
                cursor: "pointer",
              }}
            />

            {/* Expanded Drawer Scroll Area */}
            {drawerExpanded && (
              <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 24px" }}>
                {renderSidebarContent()}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
