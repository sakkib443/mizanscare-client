"use client";

import React, { useState } from "react";

// Standalone preview of the exam header to verify the last-minute red tint.
// Visit /test-header-preview to use it.
// DELETE THIS FILE after you've confirmed the visual works.

export default function HeaderPreview() {
    const [timeLeft, setTimeLeft] = useState(120); // 2:00 default
    const [contrastMode, setContrastMode] = useState("black-on-white");

    const contrastStyles = {
        "black-on-white": { bg: "#fff", text: "#000" },
        "white-on-black": { bg: "#000", text: "#fff" },
    };
    const cs = contrastStyles[contrastMode];

    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    };

    // EXACT copy of the header logic from reading/listening pages
    const headerBg =
        timeLeft <= 60
            ? contrastMode === "black-on-white"
                ? "#fde8e8"
                : "#3a0d0d"
            : cs.bg;

    return (
        <div style={{ minHeight: "100vh", background: contrastMode === "black-on-white" ? "#f3f4f6" : "#1a1a1a", padding: "20px", color: cs.text }}>
            <h1 style={{ fontSize: "20px", marginBottom: "20px", color: cs.text }}>
                Exam Header — Last-Minute Red Tint Preview
            </h1>

            {/* Controls */}
            <div style={{ background: cs.bg, padding: "16px", borderRadius: "8px", marginBottom: "20px", border: "1px solid #ccc" }}>
                <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold", color: cs.text }}>
                        Time left: <span style={{ color: timeLeft <= 60 ? "#dc2626" : cs.text, fontFamily: "monospace" }}>{formatTime(timeLeft)}</span>
                        {timeLeft <= 60 && <span style={{ marginLeft: "8px", color: "#dc2626", fontWeight: "bold" }}>← RED ZONE</span>}
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="3600"
                        value={timeLeft}
                        onChange={(e) => setTimeLeft(Number(e.target.value))}
                        style={{ width: "100%" }}
                    />
                    <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
                        {[0, 30, 60, 61, 120, 300, 600, 1800, 3600].map((s) => (
                            <button
                                key={s}
                                onClick={() => setTimeLeft(s)}
                                style={{
                                    padding: "6px 12px",
                                    background: timeLeft === s ? "#2563eb" : "#e5e7eb",
                                    color: timeLeft === s ? "#fff" : "#000",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                }}
                            >
                                {formatTime(s)}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold", color: cs.text }}>
                        Theme:
                    </label>
                    <button
                        onClick={() => setContrastMode("black-on-white")}
                        style={{
                            padding: "8px 16px",
                            marginRight: "8px",
                            background: contrastMode === "black-on-white" ? "#2563eb" : "#e5e7eb",
                            color: contrastMode === "black-on-white" ? "#fff" : "#000",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                        }}
                    >
                        Light (Black on White)
                    </button>
                    <button
                        onClick={() => setContrastMode("white-on-black")}
                        style={{
                            padding: "8px 16px",
                            background: contrastMode === "white-on-black" ? "#2563eb" : "#e5e7eb",
                            color: contrastMode === "white-on-black" ? "#fff" : "#000",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                        }}
                    >
                        Dark (White on Black)
                    </button>
                </div>
            </div>

            <p style={{ marginBottom: "10px", color: cs.text }}>
                ↓ Below is the actual exam header (replica). Slide the timer below 1:00 to see the red tint.
            </p>

            {/* The REAL header — exact same JSX as the exam pages */}
            <header
                style={{
                    backgroundColor: timeLeft <= 60 ? (contrastMode === "black-on-white" ? "#fde8e8" : "#3a0d0d") : cs.bg,
                    borderBottom: `1px solid ${contrastMode === "black-on-white" ? "#ccc" : "#555"}`,
                    height: "56px",
                    flexShrink: 0,
                    transition: "background-color 0.5s ease",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "100%", padding: "0 16px" }}>
                    {/* Left */}
                    <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                        <span style={{ fontWeight: "900", color: "#cc0000", fontSize: "32px", letterSpacing: "-0.5px", fontFamily: "Arial, sans-serif" }}>IELTS</span>
                        <div style={{ display: "flex", flexDirection: "column", lineHeight: "1.2" }}>
                            <span style={{ fontSize: "16px", fontWeight: "600", color: cs.text }}>Test taker ID</span>
                        </div>
                    </div>
                    {/* Right */}
                    <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                        {/* Timer */}
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: timeLeft < 300 ? "#dc2626" : cs.text, fontWeight: "700", fontSize: "18px", fontFamily: "monospace" }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            {formatTime(timeLeft)}
                        </div>
                        {/* WiFi */}
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={contrastMode === "black-on-white" ? "#374151" : cs.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                            <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                            <line x1="12" y1="20" x2="12.01" y2="20" />
                        </svg>
                        {/* Bell */}
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={contrastMode === "black-on-white" ? "#374151" : cs.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        {/* Hamburger */}
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={contrastMode === "black-on-white" ? "#374151" : cs.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: "pointer" }}>
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </div>
                </div>
            </header>

            <div style={{ marginTop: "20px", padding: "16px", background: cs.bg, color: cs.text, border: "1px solid #ccc", borderRadius: "8px" }}>
                <strong>Status:</strong>{" "}
                {timeLeft <= 60 ? (
                    <span style={{ color: "#dc2626", fontWeight: "bold" }}>
                        Last minute (≤ 60s) — header tinted red ✅
                    </span>
                ) : (
                    <span>
                        Normal mode ({timeLeft}s remaining)
                    </span>
                )}
            </div>
        </div>
    );
}
