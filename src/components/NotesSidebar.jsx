"use client";

import React, { useEffect, useRef, useState } from "react";
import { FaTimes, FaTrash, FaStickyNote } from "react-icons/fa";

/**
 * NotesSidebar
 *
 * Inline push panel for Listening / Reading notes. It animates its width
 * (0 ↔ 340px) so the surrounding content squeezes in/out smoothly instead of
 * snapping. The actual panel is a fixed-width absolute layer that gets revealed
 * from the right as the outer width grows.
 *
 *   open          — whether the drawer is expanded (toggled by the header note icon)
 *   notes         — [{ id, text, note }]
 *   onUpdate      — (id, value) => void
 *   onDelete      — (id) => void
 *   onClose       — () => void  (minimize)
 *   focusRequest  — { id, key } : when this changes, scroll to + focus that note card
 */
export default function NotesSidebar({ open, notes = [], onUpdate, onDelete, onClose, contrastMode = "black-on-white", focusRequest = null }) {
    const dark = contrastMode !== "black-on-white";
    const listRef = useRef(null);
    const [flashId, setFlashId] = useState(null);

    const panelBg = dark ? "#1f2937" : "#ffffff";
    const cardBg = dark ? "#111827" : "#f9fafb";
    const borderCol = dark ? "#374151" : "#e5e7eb";
    const titleCol = dark ? "#ffffff" : "#1f2937";
    const inputBg = dark ? "#1f2937" : "#ffffff";
    const inputText = dark ? "#ffffff" : "#111827";

    // When a note is added or its highlight is clicked, smoothly scroll to that
    // card and focus its input.
    useEffect(() => {
        if (!focusRequest || !open || !listRef.current) return;
        const id = String(focusRequest.id);
        const t = setTimeout(() => {
            if (!listRef.current) return;
            const sel = (typeof CSS !== "undefined" && CSS.escape) ? CSS.escape(id) : id;
            const card = listRef.current.querySelector(`[data-note-id="${sel}"]`);
            if (card) {
                card.scrollIntoView({ behavior: "smooth", block: "center" });
                const ta = card.querySelector("textarea");
                if (ta) ta.focus({ preventScroll: true });
                setFlashId(focusRequest.id);
            }
        }, 160);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusRequest]);

    // Fade the focus ring out after a moment.
    useEffect(() => {
        if (flashId == null) return;
        const t = setTimeout(() => setFlashId(null), 1400);
        return () => clearTimeout(t);
    }, [flashId]);

    return (
        <div style={{
            flexShrink: 0, width: open ? "340px" : "0px", maxWidth: "85vw",
            transition: "width 0.3s ease", overflow: "hidden", position: "relative", alignSelf: "stretch",
        }}>
            <div style={{
                position: "absolute", top: 0, right: 0, bottom: 0, width: "340px", maxWidth: "85vw",
                background: panelBg, borderLeft: `1px solid ${borderCol}`,
                display: "flex", flexDirection: "column", minHeight: 0,
                fontFamily: "Arial, sans-serif",
            }}>
                <style>{`
                    .notes-scroll { scrollbar-width: thin; scrollbar-color: #2563eb rgba(127,127,127,0.2); }
                    .notes-scroll::-webkit-scrollbar { width: 10px; }
                    .notes-scroll::-webkit-scrollbar-track { background: rgba(127,127,127,0.15); border-radius: 6px; }
                    .notes-scroll::-webkit-scrollbar-thumb { background: #2563eb; border-radius: 6px; border: 2px solid transparent; background-clip: padding-box; }
                    .notes-scroll::-webkit-scrollbar-thumb:hover { background: #1d4ed8; background-clip: padding-box; }
                `}</style>

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
                <div ref={listRef} className="notes-scroll" style={{ flex: 1, overflowY: "auto", padding: "12px", paddingBottom: "56px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    {notes.length === 0 ? (
                        <p style={{ color: "#9ca3af", fontSize: "13px", textAlign: "center", lineHeight: 1.6, marginTop: "24px" }}>
                            Select any word, sentence or letter in the test and press the note button to add a note here.
                        </p>
                    ) : (
                        notes.map((n) => (
                            <div key={n.id} data-note-id={n.id} style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: "10px", padding: "12px", boxShadow: flashId === n.id ? "0 0 0 2px #2563eb" : "0 1px 3px rgba(0,0,0,0.06)", transition: "box-shadow 0.25s ease" }}>
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
                                    style={{ width: "100%", resize: "vertical", boxSizing: "border-box", border: `1px solid ${borderCol}`, borderRadius: "6px", padding: "8px", fontSize: "13px", outline: "none", background: inputBg, color: inputText, fontFamily: "Arial, sans-serif", lineHeight: 1.5 }}
                                />
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
