"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Exam Security — Fullscreen Lock
 *
 * ⚠️ BROWSER LIMITATION (important, read this):
 * No website can remove the browser's own "Exit fullscreen" UI or block the
 * Esc / F11 keys. That is a hard browser security rule — if a page could trap
 * you in fullscreen forever, every malicious site would. So the browser ALWAYS
 * guarantees an escape. There is no code that disables it.
 *
 * What we CAN do (and what this does) is make leaving pointless:
 * the instant the student leaves fullscreen — OR switches tab / app / window —
 * an opaque lock covers the entire exam. They cannot see or answer anything
 * until they return to fullscreen. The exam timer keeps running behind the
 * lock, so leaving only wastes their own time.
 *
 * For a TRUE no-exit exam (kiosk mode), you need a dedicated locked browser
 * such as "Safe Exam Browser" (a desktop app), not a website.
 */
export default function ExamSecurity({ examId, onViolationLimit = () => {} }) {
    const [locked, setLocked] = useState(false);
    const hasBeenFullscreenRef = useRef(false);
    const mountedRef = useRef(false);

    const isFullscreen = () =>
        !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.msFullscreenElement
        );

    // Request fullscreen (cross-browser). Needs a user gesture the first time.
    const requestFullscreen = useCallback(async () => {
        try {
            if (isFullscreen()) return true;
            const el = document.documentElement;
            if (el.requestFullscreen) await el.requestFullscreen();
            else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
            else if (el.msRequestFullscreen) await el.msRequestFullscreen();
            return true;
        } catch {
            return false;
        }
    }, []);

    // Left fullscreen → lock instantly. Re-entering clears the lock.
    const handleFullscreenChange = useCallback(() => {
        if (isFullscreen()) {
            hasBeenFullscreenRef.current = true;
            setLocked(false);
        } else if (hasBeenFullscreenRef.current && mountedRef.current) {
            setLocked(true);          // lock immediately — nothing visible outside fullscreen
            requestFullscreen();      // opportunistic silent recovery (works in some browsers)
        }
    }, [requestFullscreen]);

    // Switched tab / minimized → lock (covers the case where they peek elsewhere).
    const handleVisibility = useCallback(() => {
        if (document.visibilityState === "hidden" && hasBeenFullscreenRef.current) {
            setLocked(true);
        }
    }, []);

    // Window lost focus (alt-tab to another app) → lock.
    const handleBlur = useCallback(() => {
        if (hasBeenFullscreenRef.current && mountedRef.current) setLocked(true);
    }, []);

    // Mount: auto-enter fullscreen + wire all detectors.
    useEffect(() => {
        mountedRef.current = true;

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
        document.addEventListener("visibilitychange", handleVisibility);
        window.addEventListener("blur", handleBlur);

        const tryFullscreen = async (attempts = 0) => {
            if (isFullscreen()) return;
            const ok = await requestFullscreen();
            if (!ok && attempts < 4) setTimeout(() => tryFullscreen(attempts + 1), 400);
        };
        const timer = setTimeout(() => tryFullscreen(), 150);

        return () => {
            mountedRef.current = false;
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
            document.removeEventListener("visibilitychange", handleVisibility);
            window.removeEventListener("blur", handleBlur);
            clearTimeout(timer);
        };
    }, [handleFullscreenChange, handleVisibility, handleBlur, requestFullscreen]);

    // While locked: the FIRST interaction of any kind (click / tap / key)
    // instantly re-enters fullscreen. pointerdown fires earlier than click,
    // so it snaps back the moment the student touches the screen.
    useEffect(() => {
        if (!locked) return;
        const reenter = (e) => {
            if (e.type === "keydown") e.preventDefault();
            requestFullscreen();
        };
        window.addEventListener("pointerdown", reenter, { capture: true });
        window.addEventListener("touchstart", reenter, { capture: true });
        window.addEventListener("keydown", reenter, { capture: true });
        return () => {
            window.removeEventListener("pointerdown", reenter, { capture: true });
            window.removeEventListener("touchstart", reenter, { capture: true });
            window.removeEventListener("keydown", reenter, { capture: true });
        };
    }, [locked, requestFullscreen]);

    // Warn before closing / refreshing the tab.
    useEffect(() => {
        const onBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = "Your exam is in progress. Are you sure you want to leave?";
            return e.returnValue;
        };
        window.addEventListener("beforeunload", onBeforeUnload);
        return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }, []);

    // Deter inspecting: block right-click and dev-tools shortcuts.
    useEffect(() => {
        const onContextMenu = (e) => e.preventDefault();
        const onKeyDown = (e) => {
            const k = (e.key || "").toUpperCase();
            if (
                e.key === "F12" ||
                (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(k)) ||
                (e.ctrlKey && k === "U")
            ) {
                e.preventDefault();
            }
        };
        document.addEventListener("contextmenu", onContextMenu);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("contextmenu", onContextMenu);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, []);

    if (!locked) return null;

    return (
        <div
            onClick={requestFullscreen}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 2147483647,
                backgroundColor: "rgba(244, 246, 251, 0.96)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                userSelect: "none",
            }}
        >
            <div style={{ textAlign: "center", color: "#1f2937", pointerEvents: "none", padding: "24px" }}>
                <div
                    style={{
                        fontSize: "56px",
                        marginBottom: "16px",
                        animation: "examLockPulse 1.5s ease-in-out infinite",
                    }}
                >
                    ⛶
                </div>
                <p style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "10px" }}>
                    Tap to return to fullscreen
                </p>
                <p style={{ fontSize: "15px", marginBottom: "6px", color: "#374151" }}>
                    The exam must stay in fullscreen.
                </p>
                <p style={{ fontSize: "13px", color: "#6b7280" }}>
                    Your timer is still running.
                </p>
                <style>{`
                    @keyframes examLockPulse {
                        0%, 100% { opacity: 1; transform: scale(1); }
                        50% { opacity: 0.65; transform: scale(1.12); }
                    }
                `}</style>
            </div>
        </div>
    );
}
