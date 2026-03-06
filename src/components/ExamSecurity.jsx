"use client";

import { useState, useEffect, useCallback } from "react";
import { FaExclamationTriangle, FaTimes, FaShieldAlt, FaEyeSlash } from "react-icons/fa";
import { studentsAPI } from "@/lib/api";

/**
 * Exam Security Component - HIGHLY SECURE
 * - Detects and reports tab switching
 * - Detects fullscreen exit
 * - Blocks copy, cut, paste
 * - Blocks right-click
 * - Blocks keyboard shortcuts (Ctrl+C, Ctrl+V, F12, etc.)
 * - Blocks text selection (except TextHighlighter areas)
 * - Blocks print screen
 * - Shows warning overlay
 * - Reports violations to backend
 * 
 * ⚠️ DEV_MODE: Set to true to disable security during development.
 *    Set to false for production/deployment.
 */
const DEV_MODE = true; // 🔧 Toggle this: true = security OFF, false = security ON

export default function ExamSecurity({ examId, onViolationLimit = () => { } }) {
    const [violations, setViolations] = useState(0);
    const [showWarning, setShowWarning] = useState(false);
    const [warningType, setWarningType] = useState("");
    const [isFullscreen, setIsFullscreen] = useState(false);
    const MAX_VIOLATIONS = 3;

    // Report violation to backend
    const reportViolation = useCallback(async (type) => {
        try {
            if (examId) {
                await studentsAPI.reportViolation(examId, type);
            }
        } catch (err) {
            console.error("Failed to report violation:", err);
        }
    }, [examId]);

    // Handle visibility change (tab switch)
    const handleVisibilityChange = useCallback(() => {
        if (document.hidden) {
            setViolations(prev => {
                const newCount = prev + 1;
                if (newCount >= MAX_VIOLATIONS) {
                    onViolationLimit();
                }
                return newCount;
            });
            setWarningType("tab-switch");
            setShowWarning(true);
            reportViolation("tab-switch");
        }
    }, [reportViolation, onViolationLimit]);

    // Handle fullscreen change
    const handleFullscreenChange = useCallback(() => {
        const isNowFullscreen = !!document.fullscreenElement;
        setIsFullscreen(isNowFullscreen);

        if (!isNowFullscreen) {
            setViolations(prev => {
                const newCount = prev + 1;
                if (newCount >= MAX_VIOLATIONS) {
                    onViolationLimit();
                }
                return newCount;
            });
            setWarningType("fullscreen-exit");
            setShowWarning(true);
            reportViolation("fullscreen-exit");
        } else {
            // If they returned to fullscreen, we can hide the warning
            setShowWarning(false);
        }
    }, [violations, reportViolation, onViolationLimit]);

    // Detect right-click
    const handleContextMenu = useCallback((e) => {
        e.preventDefault();
        setWarningType("right-click");
        setShowWarning(true);
        // Automatically hide transient warnings like right-click after 3 seconds
        setTimeout(() => setShowWarning(prev => {
            if (["right-click", "copy-paste", "keyboard-shortcut", "screenshot", "print"].includes(warningType)) {
                return false;
            }
            return prev;
        }), 3000);
        return false;
    }, [warningType]);

    // Detect copy/cut/paste
    const handleCopyPaste = useCallback((e) => {
        e.preventDefault();
        setWarningType("copy-paste");
        setShowWarning(true);
        setTimeout(() => setShowWarning(prev => {
            if (["right-click", "copy-paste", "keyboard-shortcut", "screenshot", "print"].includes(warningType)) {
                return false;
            }
            return prev;
        }), 3000);
        return false;
    }, [warningType]);

    // Block text selection (except in TextHighlighter and inputs)
    const handleSelectStart = useCallback((e) => {
        // Allow selection in input/textarea
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return true;
        }
        // Allow selection in TextHighlighter container for highlight feature
        if (e.target.closest('.text-highlighter-container')) {
            return true;
        }
        e.preventDefault();
        return false;
    }, []);

    // Detect keyboard shortcuts
    const handleKeyDown = useCallback((e) => {
        // Block Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A
        if (e.ctrlKey && ['c', 'v', 'x', 'a', 'u', 's', 'p'].includes(e.key.toLowerCase())) {
            e.preventDefault();
            setWarningType("keyboard-shortcut");
            setShowWarning(true);
            return false;
        }
        // Block Ctrl+Shift+I (Dev Tools)
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i') {
            e.preventDefault();
            setViolations(prev => prev + 1);
            setWarningType("dev-tools");
            setShowWarning(true);
            reportViolation("dev-tools");
            return false;
        }
        // Block Ctrl+Shift+J (Console)
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'j') {
            e.preventDefault();
            setViolations(prev => prev + 1);
            setWarningType("dev-tools");
            setShowWarning(true);
            reportViolation("dev-tools");
            return false;
        }
        // Block Ctrl+Tab
        if (e.ctrlKey && e.key === 'Tab') {
            e.preventDefault();
            return false;
        }
        // Block Alt+Tab (limited browser support)
        if (e.altKey && e.key === 'Tab') {
            e.preventDefault();
            return false;
        }
        // Block F12 (Dev Tools)
        if (e.key === 'F12') {
            e.preventDefault();
            setViolations(prev => prev + 1);
            setWarningType("dev-tools");
            setShowWarning(true);
            reportViolation("dev-tools");
            return false;
        }
        // Block Print Screen
        if (e.key === 'PrintScreen') {
            e.preventDefault();
            setWarningType("screenshot");
            setShowWarning(true);
            return false;
        }
        // Block Ctrl+P (Print)
        if (e.ctrlKey && e.key.toLowerCase() === 'p') {
            e.preventDefault();
            setWarningType("print");
            setShowWarning(true);
            return false;
        }
    }, [reportViolation]);

    // Detect blur (window loses focus)
    const handleBlur = useCallback(() => {
        // Slight delay to distinguish from normal interactions
        setTimeout(() => {
            if (!document.hasFocus()) {
                setViolations(prev => {
                    const newCount = prev + 1;
                    if (newCount >= MAX_VIOLATIONS) {
                        onViolationLimit();
                    }
                    return newCount;
                });
                setWarningType("window-blur");
                setShowWarning(true);
                reportViolation("window-blur");
            }
        }, 100);
    }, [reportViolation, onViolationLimit]);

    // Request fullscreen on mount
    const requestFullscreen = useCallback(() => {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch((err) => {
                console.log("Fullscreen request failed:", err);
            });
        }
    }, []);

    // Disable text selection via CSS (except in TextHighlighter)
    useEffect(() => {
        if (DEV_MODE) return; // Skip in dev mode

        const style = document.createElement('style');
        style.id = 'exam-security-style';
        style.textContent = `
            .exam-secure-container {
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
                -webkit-touch-callout: none !important;
            }
            .exam-secure-container input,
            .exam-secure-container textarea,
            .exam-secure-container .text-highlighter-container,
            .exam-secure-container .text-highlighter-container * {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
            }
        `;
        document.head.appendChild(style);
        document.body.classList.add('exam-secure-container');

        return () => {
            const styleEl = document.getElementById('exam-security-style');
            if (styleEl) styleEl.remove();
            document.body.classList.remove('exam-secure-container');
        };
    }, []);

    // Setup event listeners
    useEffect(() => {
        if (DEV_MODE) return; // Skip in dev mode

        // Add event listeners
        document.addEventListener("visibilitychange", handleVisibilityChange);
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        document.addEventListener("contextmenu", handleContextMenu);
        document.addEventListener("copy", handleCopyPaste);
        document.addEventListener("cut", handleCopyPaste);
        document.addEventListener("paste", handleCopyPaste);
        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("selectstart", handleSelectStart);
        window.addEventListener("blur", handleBlur);

        // Request fullscreen after a short delay
        const timer = setTimeout(() => {
            requestFullscreen();
        }, 1000);

        // Cleanup
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            document.removeEventListener("contextmenu", handleContextMenu);
            document.removeEventListener("copy", handleCopyPaste);
            document.removeEventListener("cut", handleCopyPaste);
            document.removeEventListener("paste", handleCopyPaste);
            document.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("selectstart", handleSelectStart);
            window.removeEventListener("blur", handleBlur);
            clearTimeout(timer);
        };
    }, [handleVisibilityChange, handleFullscreenChange, handleContextMenu, handleCopyPaste, handleKeyDown, handleSelectStart, handleBlur, requestFullscreen]);

    // Force warning if not in fullscreen and not in dev mode
    useEffect(() => {
        if (!DEV_MODE && !isFullscreen) {
            setWarningType("fullscreen-exit");
            setShowWarning(true);
        }
    }, [isFullscreen]);

    // In DEV_MODE, skip rendering security UI
    if (DEV_MODE) return null;

    // Warning messages
    const getWarningMessage = () => {
        switch (warningType) {
            case "tab-switch":
                return {
                    title: "⚠️ Tab Switch Detected!",
                    message: "You left the exam window. This has been recorded as a violation.",
                    icon: <FaEyeSlash className="text-4xl" />
                };
            case "window-blur":
                return {
                    title: "⚠️ Window Focus Lost!",
                    message: "You switched to another window. This has been recorded.",
                    icon: <FaEyeSlash className="text-4xl" />
                };
            case "fullscreen-exit":
                return {
                    title: "⚠️ Fullscreen Exited!",
                    message: "You exited fullscreen mode. Please stay in fullscreen during the exam.",
                    icon: <FaExclamationTriangle className="text-4xl" />
                };
            case "right-click":
                return {
                    title: "🚫 Right-Click Disabled",
                    message: "Right-clicking is not allowed during the exam.",
                    icon: <FaShieldAlt className="text-4xl" />
                };
            case "copy-paste":
                return {
                    title: "🚫 Copy/Paste Disabled",
                    message: "Copy, cut, and paste are not allowed during the exam.",
                    icon: <FaShieldAlt className="text-4xl" />
                };
            case "keyboard-shortcut":
                return {
                    title: "🚫 Shortcuts Blocked",
                    message: "Keyboard shortcuts are disabled during the exam.",
                    icon: <FaShieldAlt className="text-4xl" />
                };
            case "dev-tools":
                return {
                    title: "⚠️ Developer Tools Detected!",
                    message: "Opening developer tools is a serious violation.",
                    icon: <FaExclamationTriangle className="text-4xl" />
                };
            case "screenshot":
                return {
                    title: "🚫 Screenshot Blocked",
                    message: "Taking screenshots is not allowed during the exam.",
                    icon: <FaShieldAlt className="text-4xl" />
                };
            case "print":
                return {
                    title: "🚫 Print Blocked",
                    message: "Printing is not allowed during the exam.",
                    icon: <FaShieldAlt className="text-4xl" />
                };
            default:
                return {
                    title: "⚠️ Warning",
                    message: "Please follow exam rules.",
                    icon: <FaExclamationTriangle className="text-4xl" />
                };
        }
    };

    const warning = getWarningMessage();

    return (
        <>
            {/* Violation Counter (Always Visible) */}
            {violations > 0 && (
                <div className="fixed top-4 right-4 z-[9999] bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                    <FaExclamationTriangle />
                    <span className="font-bold">Violations: {violations}/{MAX_VIOLATIONS}</span>
                </div>
            )}

            {/* Warning Overlay */}
            {showWarning && (
                <div className="fixed inset-0 z-[99999] bg-black/90 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl animate-pulse">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
                            {warning.icon}
                        </div>

                        <h2 className="text-2xl font-bold text-red-600 mb-3">
                            {warning.title}
                        </h2>

                        <p className="text-gray-600 mb-4">
                            {warning.message}
                        </p>

                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                            <p className="text-red-700 font-semibold text-lg">
                                {warningType === "fullscreen-exit" ? "Action Required" : `Violation Count: ${violations} of ${MAX_VIOLATIONS}`}
                            </p>
                            <p className="text-red-600 text-sm mt-1">
                                {warningType === "fullscreen-exit"
                                    ? "Full screen is mandatory during the exam. Content is hidden until you return to full screen."
                                    : (violations >= MAX_VIOLATIONS
                                        ? "Maximum violations reached. Your exam may be terminated."
                                        : `${MAX_VIOLATIONS - violations} more violation(s) will result in exam termination.`)
                                }
                            </p>
                        </div>

                        <button
                            onClick={() => {
                                requestFullscreen();
                                if (document.fullscreenElement) {
                                    setShowWarning(false);
                                }
                            }}
                            className="w-full bg-red-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-red-700 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                        >
                            <FaShieldAlt />
                            {warningType === "fullscreen-exit" ? "Re-enter Full Screen" : "Acknowledge & Continue"}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
