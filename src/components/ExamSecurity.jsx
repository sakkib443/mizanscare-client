"use client";

import { useState, useEffect, useCallback } from "react";
import { FaExpandArrowsAlt, FaLock } from "react-icons/fa";

/**
 * Exam Security Component — Fullscreen Lock Only
 * 
 * ✅ What it does:
 * - Forces fullscreen mode when exam starts
 * - If student exits fullscreen (ESC), immediately shows overlay + re-requests fullscreen
 * - Hides browser chrome (address bar, tabs, close button)
 * - Shows "beforeunload" warning if student tries to close browser
 * - Content is hidden until student returns to fullscreen
 * 
 * ❌ What it does NOT block:
 * - Right-click, copy, paste, text selection — all allowed
 * - Keyboard shortcuts — all allowed (except leaving page)
 * - Dev tools — allowed
 */
export default function ExamSecurity({ examId, onViolationLimit = () => { } }) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [hasEnteredFullscreen, setHasEnteredFullscreen] = useState(false);

    // Request fullscreen
    const requestFullscreen = useCallback(async () => {
        try {
            const elem = document.documentElement;
            if (elem.requestFullscreen) {
                await elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                await elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) {
                await elem.msRequestFullscreen();
            }
        } catch (err) {
            console.log("Fullscreen request failed:", err);
        }
    }, []);

    // Track fullscreen changes
    const handleFullscreenChange = useCallback(() => {
        const isNowFullscreen = !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.msFullscreenElement
        );
        setIsFullscreen(isNowFullscreen);
        if (isNowFullscreen) {
            setHasEnteredFullscreen(true);
        }
    }, []);

    // Setup fullscreen listener + auto-enter fullscreen
    useEffect(() => {
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

        // Auto-enter fullscreen after a brief delay
        const timer = setTimeout(() => {
            requestFullscreen();
        }, 500);

        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
            clearTimeout(timer);
        };
    }, [handleFullscreenChange, requestFullscreen]);

    // Prevent page close / refresh — show browser warning
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = "Your exam is in progress. Are you sure you want to leave?";
            return e.returnValue;
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, []);

    // If not in fullscreen, show overlay that forces re-entry
    if (!isFullscreen) {
        return (
            <div
                style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 999999,
                    backgroundColor: "rgba(0, 0, 0, 0.95)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "20px",
                }}
            >
                <div
                    style={{
                        backgroundColor: "#fff",
                        borderRadius: "16px",
                        padding: "40px",
                        maxWidth: "420px",
                        width: "100%",
                        textAlign: "center",
                        boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
                    }}
                >
                    {/* Lock Icon */}
                    <div
                        style={{
                            width: "70px",
                            height: "70px",
                            backgroundColor: "#fee2e2",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 20px",
                        }}
                    >
                        <FaLock style={{ fontSize: "28px", color: "#dc2626" }} />
                    </div>

                    <h2
                        style={{
                            fontSize: "22px",
                            fontWeight: "bold",
                            color: "#1f2937",
                            marginBottom: "10px",
                        }}
                    >
                        Fullscreen Required
                    </h2>

                    <p
                        style={{
                            fontSize: "14px",
                            color: "#6b7280",
                            marginBottom: "8px",
                            lineHeight: "1.6",
                        }}
                    >
                        This exam must be taken in fullscreen mode.
                        Please click the button below to continue your exam.
                    </p>

                    <p
                        style={{
                            fontSize: "12px",
                            color: "#ef4444",
                            marginBottom: "24px",
                            fontWeight: "600",
                        }}
                    >
                        ⚠️ Do not close or leave this page until you submit your exam.
                    </p>

                    <button
                        onClick={requestFullscreen}
                        style={{
                            width: "100%",
                            backgroundColor: "#dc2626",
                            color: "white",
                            padding: "14px 24px",
                            borderRadius: "12px",
                            fontWeight: "bold",
                            fontSize: "16px",
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "10px",
                            transition: "background-color 0.2s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#b91c1c")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#dc2626")}
                    >
                        <FaExpandArrowsAlt style={{ fontSize: "16px" }} />
                        Enter Fullscreen & Continue Exam
                    </button>
                </div>
            </div>
        );
    }

    // In fullscreen — render nothing (exam page shows normally)
    return null;
}
