"use client";

import React, { useEffect, useState } from "react";
import { FaCheckCircle, FaTimesCircle, FaInfoCircle, FaExclamationTriangle, FaTimes } from "react-icons/fa";

/**
 * Global, app-wide toast system (no external dependency).
 *
 * Usage from anywhere:
 *   import { toast } from "@/components/toast/Toaster";
 *   toast.success("Student registered successfully.");
 *   toast.error("Could not save the score. Please try again.", { title: "Save failed" });
 *
 * Mount <Toaster /> once (already done in app/layout.js).
 */

let listeners = [];
let store = [];
let seq = 0;

function emit() {
    listeners.forEach((l) => l(store));
}

function dismiss(id) {
    store = store.filter((t) => t.id !== id);
    emit();
}

function push(type, message, opts = {}) {
    const id = ++seq;
    const duration = opts.duration ?? 4500;
    store = [...store, { id, type, message: message == null ? "" : String(message), title: opts.title, duration }];
    emit();
    if (duration > 0 && typeof window !== "undefined") {
        setTimeout(() => dismiss(id), duration);
    }
    return id;
}

export const toast = {
    success: (m, o) => push("success", m, o),
    error: (m, o) => push("error", m, o),
    info: (m, o) => push("info", m, o),
    warning: (m, o) => push("warning", m, o),
    dismiss,
};

const CONFIG = {
    success: { color: "#16a34a", bg: "#ecfdf3", Icon: FaCheckCircle, title: "Success" },
    error: { color: "#dc2626", bg: "#fef2f2", Icon: FaTimesCircle, title: "Something went wrong" },
    info: { color: "#2563eb", bg: "#eff6ff", Icon: FaInfoCircle, title: "Notice" },
    warning: { color: "#d97706", bg: "#fffbeb", Icon: FaExclamationTriangle, title: "Heads up" },
};

export default function Toaster() {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        listeners.push(setToasts);
        setToasts(store);
        return () => { listeners = listeners.filter((l) => l !== setToasts); };
    }, []);

    return (
        <div
            style={{
                position: "fixed", top: "20px", right: "20px", zIndex: 999999,
                display: "flex", flexDirection: "column", gap: "12px",
                width: "370px", maxWidth: "calc(100vw - 32px)", pointerEvents: "none",
            }}
        >
            <style>{`
                @keyframes toastIn { from { opacity: 0; transform: translateX(36px) scale(0.97); } to { opacity: 1; transform: none; } }
                @keyframes toastBar { from { transform: scaleX(1); } to { transform: scaleX(0); } }
            `}</style>

            {toasts.map((t) => {
                const c = CONFIG[t.type] || CONFIG.info;
                const Icon = c.Icon;
                return (
                    <div
                        key={t.id}
                        style={{
                            position: "relative", pointerEvents: "auto", overflow: "hidden",
                            background: "#ffffff", borderRadius: "12px", border: "1px solid #eef0f3",
                            boxShadow: "0 12px 32px rgba(15,23,42,0.14), 0 2px 6px rgba(15,23,42,0.08)",
                            display: "flex", animation: "toastIn 0.3s cubic-bezier(0.21,1.02,0.73,1)",
                            fontFamily: "Arial, Helvetica, sans-serif",
                        }}
                    >
                        <div style={{ width: "4px", background: c.color, flexShrink: 0 }} />
                        <div style={{ display: "flex", gap: "12px", padding: "13px 14px", flex: 1, alignItems: "flex-start" }}>
                            <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <Icon style={{ color: c.color, fontSize: "16px" }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0, paddingTop: "1px" }}>
                                <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#111827", marginBottom: t.message ? "2px" : 0 }}>
                                    {t.title || c.title}
                                </div>
                                {t.message && (
                                    <div style={{ fontSize: "12.5px", color: "#4b5563", lineHeight: 1.5, wordBreak: "break-word" }}>
                                        {t.message}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => dismiss(t.id)}
                                aria-label="Dismiss"
                                style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: "2px", flexShrink: 0, display: "flex", borderRadius: "4px", lineHeight: 0 }}
                            >
                                <FaTimes style={{ fontSize: "13px" }} />
                            </button>
                        </div>
                        {t.duration > 0 && (
                            <div
                                style={{
                                    position: "absolute", left: 0, bottom: 0, height: "3px", width: "100%",
                                    background: c.color, opacity: 0.35, transformOrigin: "left",
                                    animation: `toastBar ${t.duration}ms linear forwards`,
                                }}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
