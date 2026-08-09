"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { motion, AnimatePresence } from "framer-motion";

interface UrlJobStatus {
  url: string;
  stage: "discovered" | "scraping" | "resolving" | "scoring" | "done" | "failed";
  updated_at: string;
}

interface ScrapeJob {
  id: string;
  status: "pending" | "running" | "done" | "failed";
  discovered_count: number;
  processed_count: number;
  failed_count: number;
  error_message?: string | null;
  urls?: UrlJobStatus[];
}

function DiscoveryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug") || "gunung-merbabu-selo";

  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<ScrapeJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // New claims created summary
  const [newReports, setNewReports] = useState<any[]>([]);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // Poll Job Status
  const startPolling = (id: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${apiUrl}/trails/${slug}/scrape-jobs/${id}`);
        if (!res.ok) return;
        const data: ScrapeJob = await res.json();
        setJob(data);

        if (data.status === "done" || data.status === "failed") {
          stopPolling();
          if (data.status === "done") {
            // Fetch newly updated condition reports list
            fetchNewReports();
          }
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    }, 2000);
  };

  const fetchNewReports = async () => {
    try {
      const res = await fetch(`${apiUrl}/trails/${slug}`);
      if (res.ok) {
        const data = await res.json();
        // Extract waypoints with condition reports
        const wps = data.features.filter((f: any) => f.properties?.type === "waypoint");
        const allReports: any[] = [];
        wps.forEach((wp: any) => {
          const reports = wp.properties.condition_reports || [];
          reports.forEach((r: any) => {
            allReports.push({
              waypointName: wp.properties.name,
              claim_text: r.claim_text,
              confidence_score: r.confidence_score,
              source_type: r.source_type,
            });
          });
        });
        // Sort reports by confidence score (descending)
        allReports.sort((a, b) => b.confidence_score - a.confidence_score);
        setNewReports(allReports.slice(0, 5)); // show top 5 reports
      }
    } catch (err) {
      console.error("Failed to fetch condition reports summary", err);
    }
  };

  // Trigger discovery job on mount
  useEffect(() => {
    const triggerJob = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiUrl}/trails/${slug}/discover-and-scrape`, {
          method: "POST",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || `HTTP ${res.status}`);
        }
        const data = await res.json();
        setJobId(data.job_id);
        const initialJob: ScrapeJob = {
          id: data.job_id,
          status: "pending",
          discovered_count: 0,
          processed_count: 0,
          failed_count: 0,
          urls: [],
        };
        setJob(initialJob);
        startPolling(data.job_id);
      } catch (err: any) {
        setError(err.message || "Gagal memicu live discovery pipeline.");
      } finally {
        setLoading(false);
      }
    };

    triggerJob();

    return () => {
      stopPolling();
    };
  }, [slug, apiUrl]);

  // Framer Motion Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 90, damping: 15 } },
  };

  const getStageColor = (stage: string, currentUrlStage: string) => {
    const stagesOrder = ["discovered", "scraping", "resolving", "scoring", "done"];
    const currentIdx = stagesOrder.indexOf(currentUrlStage);
    const targetIdx = stagesOrder.indexOf(stage);

    if (currentUrlStage === "failed") {
      return stage === "failed" ? "#ef4444" : "rgba(240, 237, 230, 0.15)";
    }

    if (currentIdx >= targetIdx && targetIdx !== -1) {
      return "#E55B3C"; // Active/completed stage color
    }
    return "rgba(240, 237, 230, 0.15)"; // Inactive stage color
  };

  const getStageText = (stage: string) => {
    switch (stage) {
      case "discovered":
        return "Ditemukan";
      case "scraping":
        return "Scraping";
      case "resolving":
        return "Ekstraksi";
      case "scoring":
        return "Scoring";
      case "done":
        return "Tersimpan";
      case "failed":
        return "Gagal";
      default:
        return stage;
    }
  };

  const activeUrls = job?.urls || [];

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        minHeight: "100vh",
        background: "radial-gradient(ellipse at 50% 0%, #2b2319 0%, #161210 52%, #0c0a09 100%)",
        fontFamily: "var(--font-sans)",
        color: "#f0ede6",
        paddingBottom: "80px",
      }}
    >
      <Navbar />

      <div
        style={{
          maxWidth: "760px",
          margin: "0 auto",
          padding: "120px 24px 40px",
        }}
      >
        {/* Header Block */}
        <div style={{ marginBottom: "2.5rem", borderBottom: "1px solid rgba(240, 237, 230, 0.08)", paddingBottom: "1.5rem" }}>
          <span style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.18em", color: "#E55B3C" }}>
            Live Pipeline Discovery
          </span>
          <h1 style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.02em", color: "#f0ede6", marginTop: "8px" }}>
            {slug.replace(/-/g, " ").toUpperCase()}
          </h1>
          <p style={{ fontSize: "13px", color: "rgba(240, 237, 230, 0.6)", marginTop: "6px", lineHeight: 1.6 }}>
            Pipeline berjalan secara asinkron. TinyFish menyisir web untuk mengumpulkan info terbaru, mengekstrak kondisi via LLM, mencocokkan pos pendakian, dan menghitung confidence score.
          </p>
        </div>

        {/* Loading / Error States */}
        {loading && (
          <div style={{ padding: "40px 0", textAlign: "center", color: "rgba(240, 237, 230, 0.5)", fontSize: "14px" }} className="animate-pulse">
            Menginisialisasi pipeline discovery...
          </div>
        )}

        {error && (
          <div style={{ backgroundColor: "rgba(239, 68, 68, 0.04)", border: "1px solid rgba(239, 68, 68, 0.2)", padding: "16px", borderRadius: "2px", color: "#f87171", fontSize: "13px", marginBottom: "2rem" }}>
            {error}
          </div>
        )}

        {/* Main Process Dashboard */}
        {job && (
          <div>
            {/* Top Job Status Indicator */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 18px",
                backgroundColor: "rgba(12, 11, 9, 0.45)",
                border: "1px solid rgba(240, 237, 230, 0.08)",
                borderRadius: "2px",
                marginBottom: "2rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {(job.status === "pending" || job.status === "running") && (
                  <svg className="animate-spin h-4 w-4 text-[#E55B3C]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {job.status === "done" && <span style={{ color: "#E55B3C", fontWeight: "bold" }}>✓</span>}
                {job.status === "failed" && <span style={{ color: "#ef4444", fontWeight: "bold" }}>✗</span>}
                <span style={{ fontSize: "13px", fontWeight: 500, color: "#f0ede6" }}>
                  Status Job: <span style={{ textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.08em", color: "#E55B3C", fontWeight: 600 }}>{job.status}</span>
                </span>
              </div>
              <div style={{ fontSize: "12px", color: "rgba(240, 237, 230, 0.6)" }}>
                Ditemukan: {job.discovered_count} • Sukses: {job.processed_count} {job.failed_count > 0 && `• Gagal: ${job.failed_count}`}
              </div>
            </div>

            {/* URL list Staggered Visual Flow */}
            <div style={{ marginBottom: "3rem" }}>
              <h3 style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(240, 237, 230, 0.4)", marginBottom: "1.2rem" }}>
                Target URL & Live Tracking
              </h3>

              {activeUrls.length === 0 ? (
                <div style={{ padding: "30px 0", textAlign: "center", color: "rgba(240, 237, 230, 0.35)", fontSize: "13px", border: "1px dashed rgba(240, 237, 230, 0.08)", fontStyle: "italic" }}>
                  Mencari kandidat URL di web...
                </div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  style={{ display: "flex", flexDirection: "column", gap: "12px" }}
                >
                  <AnimatePresence>
                    {activeUrls.map((urlJob, index) => (
                      <motion.div
                        key={urlJob.url}
                        variants={itemVariants}
                        layout
                        style={{
                          backgroundColor: "rgba(17, 15, 13, 0.8)",
                          border: "1px solid rgba(240, 237, 230, 0.05)",
                          borderRadius: "2px",
                          padding: "16px 20px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "12px",
                        }}
                      >
                        {/* URL info */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: 500,
                              color: "#f0ede6",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: "80%",
                            }}
                          >
                            {urlJob.url}
                          </span>
                          <span
                            style={{
                              fontSize: "9px",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
                              color: urlJob.stage === "failed" ? "#f87171" : urlJob.stage === "done" ? "#E55B3C" : "#f0ede6",
                            }}
                          >
                            {getStageText(urlJob.stage)}
                          </span>
                        </div>

                        {/* Pipeline visual steps */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", padding: "0 4px" }}>
                          {/* Horizontal line background */}
                          <div style={{ position: "absolute", top: "8px", left: "10px", right: "10px", height: "1px", backgroundColor: "rgba(240, 237, 230, 0.06)", zIndex: 0 }} />

                          {/* Steps loop */}
                          {["discovered", "scraping", "resolving", "scoring", "done"].map((step, stepIdx) => {
                            const isFailedStep = urlJob.stage === "failed" && step === "done";
                            const dotColor = isFailedStep ? "#ef4444" : getStageColor(step, urlJob.stage);
                            const labelText = isFailedStep ? "Gagal" : getStageText(step);

                            return (
                              <div
                                key={step}
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  gap: "6px",
                                  zIndex: 1,
                                  position: "relative",
                                }}
                              >
                                <motion.div
                                  animate={{
                                    scale: urlJob.stage === step ? [1, 1.25, 1] : 1,
                                    backgroundColor: dotColor,
                                  }}
                                  transition={{
                                    repeat: urlJob.stage === step ? Infinity : 0,
                                    duration: 1.5,
                                  }}
                                  style={{
                                    width: "8px",
                                    height: "8px",
                                    borderRadius: "50%",
                                  }}
                                />
                                <span
                                  style={{
                                    fontSize: "9px",
                                    color: urlJob.stage === step ? "#E55B3C" : "rgba(240, 237, 230, 0.4)",
                                    fontWeight: urlJob.stage === step ? 600 : 400,
                                  }}
                                >
                                  {labelText}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>

            {/* Finished State Summary Panel */}
            {job.status === "done" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{
                  backgroundColor: "rgba(17, 15, 13, 0.95)",
                  border: "1px solid rgba(229, 91, 60, 0.2)",
                  borderRadius: "2px",
                  padding: "24px 28px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.5rem",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                }}
              >
                <div>
                  <h3 style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", color: "#E55B3C", marginBottom: "4px" }}>
                    Hasil Pipeline
                  </h3>
                  <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#f0ede6", letterSpacing: "-0.01em" }}>
                    Discovery Selesai Sukses
                  </h2>
                </div>

                {newReports.length > 0 ? (
                  <div>
                    <h4 style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(240, 237, 230, 0.4)", marginBottom: "10px" }}>
                      Laporan Kondisi Pos Terbaru (Top 5 Kredibilitas)
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {newReports.map((report, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 0",
                            borderBottom: "1px solid rgba(240, 237, 230, 0.05)",
                            gap: "1rem",
                          }}
                        >
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: "12px", fontWeight: 600, color: "#f0ede6" }}>
                              {report.waypointName}
                            </div>
                            <div style={{ fontSize: "11px", color: "rgba(240, 237, 230, 0.5)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {report.claim_text}
                            </div>
                          </div>

                          <span
                            style={{
                              fontSize: "9px",
                              fontWeight: 700,
                              padding: "2px 6px",
                              borderRadius: "2px",
                              backgroundColor: "rgba(229, 91, 60, 0.15)",
                              border: "1px solid rgba(229, 91, 60, 0.3)",
                              color: "#ff8264",
                              flexShrink: 0,
                            }}
                          >
                            Score: {Math.round(report.confidence_score * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: "12px", color: "rgba(240, 237, 230, 0.5)", margin: 0, fontStyle: "italic" }}>
                    Tidak ada laporan kondisi baru yang tersimpan untuk jalur ini.
                  </p>
                )}

                {/* Back to Map CTA Button */}
                <button
                  onClick={() => router.push(`/app`)}
                  style={{
                    width: "100%",
                    padding: "12px 20px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: "#E55B3C",
                    color: "#ffffff",
                    boxShadow: "0 4px 16px rgba(229, 91, 60, 0.3)",
                    transition: "all 0.2s ease",
                    marginTop: "0.5rem",
                  }}
                >
                  Lihat Hasil di Peta →
                </button>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DiscoveryPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", backgroundColor: "#0c0a09", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(240, 237, 230, 0.5)", fontSize: "14px" }}>
        Memuat live pipeline discovery...
      </div>
    }>
      <DiscoveryContent />
    </Suspense>
  );
}
