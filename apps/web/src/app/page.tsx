"use client";

import React from "react";
import Link from "next/link";
import { motion } from "motion/react";

export default function LandingPage() {
  return (
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
      {/* NOISE */}
      <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 50, pointerEvents: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, opacity: 0.034 }} />

      {/* DOT GRID */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none", backgroundImage: "radial-gradient(rgba(240,237,230,0.08) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

      {/* NAV */}
      <nav aria-label="Main Navigation" style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 40, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2rem 3.5rem" }}>
        <Link href="/" id="nav-logo" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
          <span style={{ color: "#f0ede6", fontSize: "15px", fontWeight: 600, letterSpacing: "0.08em" }}>RINTIS</span>
        </Link>
        <div style={{ display: "flex", gap: "3rem" }}>
          {["Work", "Research", "Studio", "Journal", "Contact"].map((item) => (
            <a key={item} href="#" style={{ color: "rgba(240,237,230,0.55)", fontSize: "12px", fontWeight: 400, letterSpacing: "0.12em", textTransform: "uppercase", textDecoration: "none" }}>{item}</a>
          ))}
        </div>
        <div style={{ width: "42px" }} />
      </nav>

      {/* LEFT TEXT COLUMN */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "30%", zIndex: 30, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 3.5rem 2rem 6.5rem" }}>
        <p style={{ color: "#E55B3C", fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.24em", margin: "0 0 1.4rem" }}>SELECTED WORK</p>
        <h1 style={{ margin: 0, lineHeight: 1.0, letterSpacing: "-0.028em", color: "#f0ede6", fontSize: "clamp(2.5rem, 4vw, 4.6rem)", fontFamily: "var(--font-sans)", fontWeight: 500 }}>
          Jalur yang<br />
          mengubah data<br />
          menjadi{" "}
          <em style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontWeight: 400, fontSize: "1.06em", letterSpacing: "-0.02em" }}>
            <br />pendakian<br />aman
          </em>
          <span style={{ color: "#E55B3C", fontStyle: "normal" }}>.</span>
        </h1>
        <Link href="/app" id="hero-cta-view" style={{ display: "inline-flex", alignItems: "center", gap: "0.85rem", textDecoration: "none", marginTop: "3rem" }}>
          <span style={{ color: "#f0ede6", fontSize: "13px", fontWeight: 400, borderBottom: "1px solid rgba(240,237,230,0.28)", paddingBottom: "3px" }}>Jelajahi semua jalur</span>
          <span style={{ color: "#E55B3C", fontSize: "13px" }}>| ↗</span>
        </Link>
      </div>

      {/* CORAL CIRCLE */}
      <div aria-hidden="true" style={{ position: "absolute", borderRadius: "50%", backgroundColor: "#E55B3C", width: "clamp(320px, 38vw, 560px)", height: "clamp(320px, 38vw, 560px)", left: "43%", top: "-10%", zIndex: 5, pointerEvents: "none" }} />

      {/* VECTOR RINGS */}
      <svg aria-hidden="true" style={{ position: "absolute", top: 0, right: "2%", width: "54vw", height: "78vh", zIndex: 6, pointerEvents: "none", opacity: 0.18 }} viewBox="0 0 440 440" fill="none">
        <circle cx="275" cy="165" r="182" stroke="#f0ede6" strokeWidth="0.5" strokeDasharray="4 5" />
        <circle cx="275" cy="165" r="250" stroke="#f0ede6" strokeWidth="0.3" />
        <line x1="20" y1="165" x2="430" y2="165" stroke="#f0ede6" strokeWidth="0.3" />
        <line x1="275" y1="0" x2="275" y2="420" stroke="#f0ede6" strokeWidth="0.3" />
      </svg>



      {/* FLOATING SPHERE */}
      <div aria-hidden="true" style={{ position: "absolute", width: "clamp(22px, 2.3vw, 36px)", height: "clamp(22px, 2.3vw, 36px)", borderRadius: "50%", background: "radial-gradient(circle at 36% 32%, #ffffff 0%, #c0bbb4 100%)", left: "58%", top: "9%", zIndex: 30, boxShadow: "0 5px 18px rgba(0,0,0,0.5)" }} />


    </section>
  );
}
