"use client";

import React from "react";
import { FaTimes, FaTrash, FaStickyNote } from "react-icons/fa";

/**
 * NotesSidebar
 *
 * Right-side drawer that holds the student's notes during Listening / Reading.
 * Each note is its own card: the selected text shown at the top (the thing the
 * note is about) + a free-text input below. Cards stack with a gap between them.
 *
 * Controlled by the parent module:
 *   open        — whether the drawer is visible (toggled by the header note icon)
 *   notes       — [{ id, text, note }]
 *   onUpdate    — (id, value) => void
 *   onDelete    — (id) => void
 *   onClose     — () => void  (minimize)
 */
export default function NotesSidebar({ open, notes = [], onUpdate, onDelete, onClose, contrastMode = "black-on-white" }) {
    if (!open) return null;
    const dark = contrastMode !== "black-on-white";

    const panelBg = dark ? "#1f2937" : "#ffffff";
    const cardBg = dark ? "#111827" : "#f9fafb";
    const borderCol = dark ? "#374151" : "#e5e7eb";
    const titleCol = dark ? "#ffffff" : "#1f2937";
    const inputBg = dark ? "#1f2937" : "#ffffff";
    const inputText = dark ? "#ffffff" : "#111827";

    return (
        <div style={{
            position: "fixed", top: "56px", right: 0, bottom: 0, width: "340px", maxWidth: "85vw",
            zIndex: 400, background: panelBg, borderLeft: `1px solid ${borderCol}`,
            boxShadow: "-8px 0 28px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column",
            fontFamily: "Arial, sans-serif",
        }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${borderCol}`, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "16px", color: titleCol }}>
                    <FaStickyNote color="#2563eb" /> My Notes
                </div>
                <button onClick={onClose} title="Minimize" style={{ background: "none", border: "none", cursor: "pointer", color: dark ? "#9ca3af" : "#6b7280", padding: "4px", display: "flex" }}>
                    <FaTimes size={18} />
                </button>
            </div>

            {/* Notes list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
                {notes.length === 0 ? (
                    <p style={{ color: "#9ca3af", fontSize: "13px", textAlign: "center", lineHeight: 1.6, marginTop: "24px" }}>
                        Select any word, sentence or letter in the test and press the note button to add a note here.
                    </p>
                ) : (
                    notes.map((n) => (
                        <div key={n.id} style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: "10px", padding: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "8px" }}>
                                <span style={{ fontSize: "13px", fontWeight: 600, color: "#2563eb", fontStyle: "italic", wordBreak: "break-word", flex: 1, lineHeight: 1.4 }}>
                                    “{n.text}”
                                </span>
                                <button onClick={() => onDelete(n.id)} title="Delete note" style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: "2px", flexShrink: 0, display: "flex" }}>
                                    <FaTrash size={12} />
                                </button>
                            </div>
                            <textarea
                                value={n.note}
                                onChange={(e) => onUpdate(n.id, e.target.value)}
                                placeholder="Write your note…"
                                rows={3}
                                autoFocus={!n.note}
                                style={{ width: "100%", resize: "vertical", boxSizing: "border-box", border: `1px solid ${borderCol}`, borderRadius: "6px", padding: "8px", fontSize: "13px", outline: "none", background: inputBg, color: inputText, fontFamily: "Arial, sans-serif", lineHeight: 1.5 }}
                            />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
