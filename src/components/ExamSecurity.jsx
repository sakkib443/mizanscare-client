"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Exam Security Component — Aggressive Fullscreen Lock
 * 
 * ✅ Auto-enters fullscreen on mount
 * ✅ If student exits fullscreen, tries to immediately re-enter
 * ✅ If browser blocks auto-fullscreen, clicking ANYWHERE re-enters
 * ✅ Any keypress also re-enters fullscreen
 * ✅ beforeunload warning prevents accidental browser close
 */
export default function ExamSecurity({ examId, onViolationLimit = () => { } }) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const retryTimerRef = useRef(null);

    // Request fullscreen
    const requestFullscreen = useCallback(async () => {
        try {
            const elem = document.documentElement;
            if (document.fullscreenElement || document.webkitFullscreenElement) return;
            if (elem.requestFullscreen) {
                await elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                await elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) {
                await elem.msRequestFullscreen();
            }
        } catch (err) {
            // Browser blocked — needs user gesture, overlay click will handle it
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

        // If exited fullscreen, try to re-enter immediately
        if (!isNowFullscreen) {
            if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
            retryTimerRef.current = setTimeout(() => {
                requestFullscreen();
            }, 100);
        }
    }, [requestFullscreen]);

    // Setup fullscreen listener + auto-enter on mount
    useEffect(() => {
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

        const timer = setTimeout(() => {
            requestFullscreen();
        }, 300);

        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
            clearTimeout(timer);
            if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        };
    }, [handleFullscreenChange, requestFullscreen]);

    // When NOT in fullscreen: any keypress re-enters fullscreen
    useEffect(() => {
        if (isFullscreen) return;

        const handleKeyDown = (e) => {
            e.preventDefault();
            requestFullscreen();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isFullscreen, requestFullscreen]);

    // Prevent page close / refresh
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = "Your exam is in progress. Are you sure you want to leave?";
            return e.returnValue;
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, []);

    // If not in fullscreen — overlay, ANY click re-enters fullscreen
    if (!isFullscreen) {
        return (
            <div
                onClick={requestFullscreen}
                style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 999999,
                    backgroundColor: "rgba(0, 0, 0, 0.97)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    userSelect: "none",
                }}
            >
                <div style={{ textAlign: "center", color: "white", pointerEvents: "none" }}>
                    <div style={{
                        fontSize: "48px",
                        marginBottom: "16px",
                        animation: "pulse 1.5s ease-in-out infinite",
                    }}>
                        🔒
                    </div>
                    <p style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "8px" }}>
                        Click anywhere to continue exam
                    </p>
                    <p style={{ fontSize: "13px", color: "#9ca3af" }}>
                        Fullscreen mode is required during the exam
                    </p>
                </div>
                <style>{`
                    @keyframes pulse {
                        0%, 100% { opacity: 1; transform: scale(1); }
                        50% { opacity: 0.7; transform: scale(1.1); }
                    }
                `}</style>
            </div>
        );
    }

    // In fullscreen — render nothing
    return null;
}
