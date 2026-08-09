"use client";

import React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import Navbar from "../components/Navbar";

export default function LandingPage() {
  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        backgroundColor: "#0c0a09",
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      <Navbar />

      {/* ── NOISE OVERLAY ── */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          pointerEvents: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          opacity: 0.034,
        }}
      />

      {/* ── HERO VIEWPORT ── */}
      <section
        id="hero"
        style={{
          position: "relative",
          width: "100%",
          height: "100dvh",
          overflow: "hidden",
          background: "radial-gradient(ellipse at 72% 0%, #2b2319 0%, #161210 52%, #0c0a09 100%)",
          fontFamily: "var(--font-sans)",
        }}
      >
        {/* DOT GRID */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            pointerEvents: "none",
            backgroundImage: "radial-gradient(rgba(240,237,230,0.08) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* LEFT TEXT COLUMN */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "30%",
            zIndex: 30,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 3.5rem 2rem 6.5rem",
          }}
        >
          <p
            style={{
              color: "#E55B3C",
              fontSize: "10px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.24em",
              margin: "0 0 1.4rem",
            }}
          >
            SELECTED WORK
          </p>
          <h1
            style={{
              margin: 0,
              lineHeight: 1.0,
              letterSpacing: "-0.028em",
              color: "#f0ede6",
              fontSize: "clamp(2.5rem, 4vw, 4.6rem)",
              fontFamily: "var(--font-sans)",
              fontWeight: 500,
            }}
          >
            Jalur yang
            <br />
            mengubah data
            <br />
            menjadi{" "}
            <em
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontWeight: 400,
                fontSize: "1.06em",
                letterSpacing: "-0.02em",
              }}
            >
              <br />
              pendakian
              <br />
              aman
            </em>
            <span style={{ color: "#E55B3C", fontStyle: "normal" }}>.</span>
          </h1>

          <Link
            href="/app"
            id="hero-cta-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.75rem",
              padding: "16px 32px",
              borderRadius: "4px",
              backgroundColor: "#E55B3C",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 600,
              letterSpacing: "0.04em",
              textDecoration: "none",
              textTransform: "uppercase",
              marginTop: "3rem",
              boxShadow: "0 6px 20px rgba(229, 91, 60, 0.25)",
              transition: "all 0.2s ease-in-out",
              width: "fit-content",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#d04b2c";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#E55B3C";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            Mulai Jelajahi Jalur →
          </Link>
        </div>

        {/* CORAL CIRCLE */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            borderRadius: "50%",
            backgroundColor: "#E55B3C",
            width: "clamp(320px, 38vw, 560px)",
            height: "clamp(320px, 38vw, 560px)",
            left: "43%",
            top: "-10%",
            zIndex: 5,
            pointerEvents: "none",
          }}
        />

        {/* VECTOR RINGS */}
        <svg
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            right: "2%",
            width: "54vw",
            height: "78vh",
            zIndex: 6,
            pointerEvents: "none",
            opacity: 0.18,
          }}
          viewBox="0 0 440 440"
          fill="none"
        >
          <circle cx="275" cy="165" r="182" stroke="#f0ede6" strokeWidth="0.5" strokeDasharray="4 5" />
          <circle cx="275" cy="165" r="250" stroke="#f0ede6" strokeWidth="0.3" />
          <line x1="20" y1="165" x2="430" y2="165" stroke="#f0ede6" strokeWidth="0.3" />
          <line x1="275" y1="0" x2="275" y2="420" stroke="#f0ede6" strokeWidth="0.3" />
        </svg>

        {/* FLOATING SPHERE */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            width: "clamp(22px, 2.3vw, 36px)",
            height: "clamp(22px, 2.3vw, 36px)",
            borderRadius: "50%",
            background: "radial-gradient(circle at 36% 32%, #ffffff 0%, #c0bbb4 100%)",
            left: "58%",
            top: "9%",
            zIndex: 30,
            boxShadow: "0 5px 18px rgba(0,0,0,0.5)",
          }}
        />
      </section>

      {/* ── METODOLOGI SECTION ── */}
      <section
        id="metodologi"
        style={{
          position: "relative",
          backgroundColor: "#110f0d",
          borderTop: "1px solid rgba(240, 237, 230, 0.05)",
          padding: "8rem 6.5rem",
          fontFamily: "var(--font-sans)",
          color: "#f0ede6",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <p
            style={{
              color: "#E55B3C",
              fontSize: "10px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.24em",
              margin: "0 0 1rem",
            }}
          >
            Metodologi Validasi
          </p>
          <h2
            style={{
              fontSize: "clamp(2rem, 3.5vw, 3rem)",
              fontWeight: 500,
              letterSpacing: "-0.02em",
              margin: "0 0 3.5rem",
              lineHeight: 1.1,
              maxWidth: "24ch",
            }}
          >
            Uji Keandalan Laporan Kondisi Multi-Layer
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "2rem",
            }}
          >
            {/* Card 1 */}
            <div
              style={{
                backgroundColor: "rgba(240, 237, 230, 0.02)",
                border: "1px solid rgba(240, 237, 230, 0.06)",
                padding: "2.5rem 2rem",
                borderRadius: "4px",
              }}
            >
              <div style={{ color: "#E55B3C", fontSize: "20px", fontWeight: 700, marginBottom: "1.5rem" }}>01</div>
              <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 1rem", letterSpacing: "-0.01em" }}>
                Kredibilitas Sumber
              </h3>
              <p style={{ fontSize: "13px", color: "rgba(240, 237, 230, 0.6)", lineHeight: 1.6, margin: 0 }}>
                Pembobotan bertingkat di mana otoritas resmi pemerintah (Taman Nasional, BMKG) menempati prioritas utama,
                diikuti oleh media terverifikasi, komunitas, dan pos laporan individu.
              </p>
            </div>

            {/* Card 2 */}
            <div
              style={{
                backgroundColor: "rgba(240, 237, 230, 0.02)",
                border: "1px solid rgba(240, 237, 230, 0.06)",
                padding: "2.5rem 2rem",
                borderRadius: "4px",
              }}
            >
              <div style={{ color: "#E55B3C", fontSize: "20px", fontWeight: 700, marginBottom: "1.5rem" }}>02</div>
              <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 1rem", letterSpacing: "-0.01em" }}>
                Kesesuaian Waktu (Recency)
              </h3>
              <p style={{ fontSize: "13px", color: "rgba(240, 237, 230, 0.6)", lineHeight: 1.6, margin: 0 }}>
                Data memiliki masa usang otomatis. Laporan kondisi ter-update dalam 24-48 jam terakhir memegang signifikansi
                nilai confidence tertinggi untuk mencerminkan kondisi lapangan termutakhir.
              </p>
            </div>

            {/* Card 3 */}
            <div
              style={{
                backgroundColor: "rgba(240, 237, 230, 0.02)",
                border: "1px solid rgba(240, 237, 230, 0.06)",
                padding: "2.5rem 2rem",
                borderRadius: "4px",
              }}
            >
              <div style={{ color: "#E55B3C", fontSize: "20px", fontWeight: 700, marginBottom: "1.5rem" }}>03</div>
              <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 1rem", letterSpacing: "-0.01em" }}>
                Konsensus Laporan
              </h3>
              <p style={{ fontSize: "13px", color: "rgba(240, 237, 230, 0.6)", lineHeight: 1.6, margin: 0 }}>
                Algoritma secara dinamis meningkatkan skor keandalan ketika klaim mengenai rintangan (misal: pohon tumbang
                atau longsor) dilaporkan secara konsisten oleh beberapa sumber independen.
              </p>
            </div>

            {/* Card 4 */}
            <div
              style={{
                backgroundColor: "rgba(240, 237, 230, 0.02)",
                border: "1px solid rgba(240, 237, 230, 0.06)",
                padding: "2.5rem 2rem",
                borderRadius: "4px",
              }}
            >
              <div style={{ color: "#E55B3C", fontSize: "20px", fontWeight: 700, marginBottom: "1.5rem" }}>04</div>
              <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 1rem", letterSpacing: "-0.01em" }}>
                Klasifikasi NLP Klaim
              </h3>
              <p style={{ fontSize: "13px", color: "rgba(240, 237, 230, 0.6)", lineHeight: 1.6, margin: 0 }}>
                Analisis ekstraksi teks menggunakan Natural Language Processing untuk mengkategorikan tipe rintangan serta tingkat
                keparahan berdasarkan deskripsi klaim yang terdeteksi.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FITUR SECTION ── */}
      <section
        id="fitur"
        style={{
          position: "relative",
          backgroundColor: "#0c0a09",
          borderTop: "1px solid rgba(240, 237, 230, 0.05)",
          padding: "8rem 6.5rem",
          fontFamily: "var(--font-sans)",
          color: "#f0ede6",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <p
            style={{
              color: "#E55B3C",
              fontSize: "10px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.24em",
              margin: "0 0 1rem",
            }}
          >
            Fitur Utama &amp; Roadmap
          </p>
          <h2
            style={{
              fontSize: "clamp(2rem, 3.5vw, 3rem)",
              fontWeight: 500,
              letterSpacing: "-0.02em",
              margin: "0 0 4.5rem",
              lineHeight: 1.1,
              maxWidth: "24ch",
            }}
          >
            Fungsionalitas Sistem Pendukung Keputusan
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "4rem",
            }}
          >
            {/* Tersedia Sekarang */}
            <div>
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#E55B3C",
                  borderBottom: "1px solid rgba(229, 91, 60, 0.2)",
                  paddingBottom: "1rem",
                  marginBottom: "2rem",
                }}
              >
                Sudah Dapat Diakses
              </h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {[
                  {
                    title: "Visualisasi Peta 3D Interaktif",
                    desc: "Navigasi visualisasi relief 3D topografi medan ekstrem memanfaatkan MapLibre & MapTiler DEM.",
                  },
                  {
                    title: "Pipa Auto-Discovery Kondisi",
                    desc: "Pipeline scraping otomatis terjadwal yang menyisir berbagai sumber informasi jalur terkini.",
                  },
                  {
                    title: "Kalkulasi Skor Confidence",
                    desc: "Skoring keandalan kuantitatif otomatis untuk memilah kredibilitas info pos sebelum pendakian dimulai.",
                  },
                  {
                    title: "Transkripsi Claims Spasial",
                    desc: "Lokalisasi laporan claims teks langsung ke koordinat pos jalur pendakian yang terdampak.",
                  },
                ].map((item, index) => (
                  <li key={index} style={{ marginBottom: "1.8rem" }}>
                    <h4 style={{ fontSize: "15px", fontWeight: 600, margin: "0 0 0.4rem", color: "#f0ede6" }}>
                      {item.title}
                    </h4>
                    <p style={{ fontSize: "13px", color: "rgba(240, 237, 230, 0.6)", lineHeight: 1.5, margin: 0 }}>
                      {item.desc}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Rencana Pengambangan */}
            <div>
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "rgba(240, 237, 230, 0.4)",
                  borderBottom: "1px solid rgba(240, 237, 230, 0.08)",
                  paddingBottom: "1rem",
                  marginBottom: "2rem",
                }}
              >
                Roadmap Pengembangan
              </h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {[
                  {
                    title: "Rekonstruksi 3D Point Cloud",
                    desc: "Fitur rekonstruksi 3D dari unggahan visual/video pendaki untuk merekonstruksi rintangan jalur secara spasial.",
                  },
                  {
                    title: "Ekspansi Jalur Gunung Nasional",
                    desc: "Perluasan cakupan visualisasi 3D dan automasi data ke gunung-gunung aktif lainnya di Indonesia.",
                  },
                ].map((item, index) => (
                  <li key={index} style={{ marginBottom: "1.8rem", opacity: 0.6 }}>
                    <h4 style={{ fontSize: "15px", fontWeight: 600, margin: "0 0 0.4rem", color: "#f0ede6" }}>
                      {item.title} <span style={{ fontSize: "10px", fontWeight: 500, color: "rgba(240, 237, 230, 0.4)", marginLeft: "0.5rem" }}>(Coming Soon)</span>
                    </h4>
                    <p style={{ fontSize: "13px", color: "rgba(240, 237, 230, 0.6)", lineHeight: 1.5, margin: 0 }}>
                      {item.desc}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
