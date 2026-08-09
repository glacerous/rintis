"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { label: "Peta", href: "/app" },
  ];

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isActive = (href: string) => {
    if (href === "/app") {
      return pathname === "/app";
    }
    return pathname === "/" && typeof window !== "undefined" && window.location.hash === href.substring(1);
  };

  return (
    <nav
      aria-label="Main Navigation"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "70px",
        zIndex: 45,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: isMobile ? "0 1.5rem" : "0 6.5rem",
        backgroundColor: "rgba(12, 11, 9, 0.4)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(240, 237, 230, 0.06)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Brand Logo with fixed width for balance alignment on desktop */}
      <Link
        href="/"
        id="nav-logo"
        style={{
          display: "flex",
          alignItems: "center",
          textDecoration: "none",
          width: isMobile ? "auto" : "120px",
        }}
      >
        <span
          style={{
            color: "#f0ede6",
            fontSize: "15px",
            fontWeight: 700,
            letterSpacing: "0.15em",
          }}
        >
          RINTIS
        </span>
      </Link>

      {/* Nav Items - Centered */}
      <div
        style={{
          display: "flex",
          gap: isMobile ? "1.5rem" : "3.5rem",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
        }}
      >
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              style={{
                color: active ? "#E55B3C" : "rgba(240, 237, 230, 0.55)",
                fontSize: "12px",
                fontWeight: active ? 600 : 400,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                textDecoration: "none",
                position: "relative",
                transition: "color 0.2s ease",
              }}
            >
              {item.label}
              {active && (
                <span
                  style={{
                    position: "absolute",
                    bottom: "-6px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "4px",
                    height: "4px",
                    borderRadius: "50%",
                    backgroundColor: "#E55B3C",
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>

      {/* Right Spacer to balance flex layout (centers navbar tab Peta) */}
      {!isMobile && <div style={{ width: "120px" }} />}
    </nav>
  );
}
