"use client";

import { useEffect } from "react";

/**
 * Exam Security
 *
 * The exam opens in fullscreen and copying / inspecting is deterred — but leaving fullscreen is
 * deliberately NOT punished: there is no lock overlay.
 *
 * There used to be one, covering the whole paper the instant the window lost focus. It fired on
 * things the candidate never did — opening a native <select> hands focus to an OS-level popup,
 * an OS notification steals focus — so it blanked the exam mid-question, repeatedly, while the
 * timer kept running. And it never bought much: no website can trap anyone in fullscreen (the
 * browser guarantees Esc / F11), so the lock cost honest candidates time without stopping a
 * determined one. For a true no-exit exam you need a locked-down browser such as Safe Exam
 * Browser, not a web page.
 */
export default function ExamSecurity({ examId, onViolationLimit = () => { } }) {
    // Open the exam in fullscreen. Some browsers need a user gesture, so retry a few times and
    // then let it go — failing to enter fullscreen must never block the exam.
    useEffect(() => {
        let cancelled = false;

        const isFullscreen = () =>
            !!(
                document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.msFullscreenElement
            );

        const requestFullscreen = async () => {
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
        };

        const tryFullscreen = async (attempts = 0) => {
            if (cancelled || isFullscreen()) return;
            const ok = await requestFullscreen();
            if (!ok && attempts < 4) setTimeout(() => tryFullscreen(attempts + 1), 400);
        };

        const timer = setTimeout(() => tryFullscreen(), 150);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, []);

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

    // Deter inspecting & copying: block right-click, dev-tools shortcuts, and copy / cut / paste.
    // Blocking the native copy/cut/paste events covers every trigger — keyboard, the
    // (already-blocked) right-click menu, the browser's Edit menu, and programmatic calls — so
    // pre-written essays can't be pasted and questions/passages can't be copied out.
    useEffect(() => {
        const onContextMenu = (e) => e.preventDefault();
        const onCopyCutPaste = (e) => e.preventDefault();
        const onKeyDown = (e) => {
            const k = (e.key || "").toUpperCase();
            // Dev-tools / view-source shortcuts.
            if (
                e.key === "F12" ||
                (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(k)) ||
                (e.ctrlKey && k === "U")
            ) {
                e.preventDefault();
                return;
            }
            // Copy / cut / paste shortcuts (Ctrl on Windows/Linux, Cmd on Mac).
            if ((e.ctrlKey || e.metaKey) && ["C", "V", "X"].includes(k)) {
                e.preventDefault();
            }
        };
        document.addEventListener("contextmenu", onContextMenu);
        document.addEventListener("copy", onCopyCutPaste);
        document.addEventListener("cut", onCopyCutPaste);
        document.addEventListener("paste", onCopyCutPaste);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("contextmenu", onContextMenu);
            document.removeEventListener("copy", onCopyCutPaste);
            document.removeEventListener("cut", onCopyCutPaste);
            document.removeEventListener("paste", onCopyCutPaste);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, []);

    return null;
}
