"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { FaHighlighter, FaEraser } from "react-icons/fa";

/**
 * RangeHighlighter
 *
 * Lets the user highlight ANY selected text inside `children`, regardless of how
 * that text is rendered (plain strings, custom components, dangerouslySetInnerHTML…).
 *
 * It uses the CSS Custom Highlight API (CSS.highlights + ::highlight()), so it
 * highlights live DOM ranges WITHOUT modifying the DOM — React reconciliation is
 * never disturbed. Highlights are cleared when `passageId` changes (page switch).
 */
const HL_NAME = "exam-user-highlight";

export default function RangeHighlighter({ children, passageId = "default", contrastMode = "black-on-white" }) {
    const containerRef = useRef(null);
    const rangesRef = useRef([]);            // active Range objects
    const savedRangeRef = useRef(null);      // last selection (for the toolbar action)
    const [showToolbar, setShowToolbar] = useState(false);
    const [toolbarPos, setToolbarPos] = useState({ x: 0, y: 0 });

    const supported = typeof window !== "undefined" && typeof window.Highlight !== "undefined" && !!(window.CSS && CSS.highlights);

    const refresh = useCallback(() => {
        if (!supported) return;
        const valid = rangesRef.current.filter((r) => {
            try { return r && !r.collapsed && containerRef.current?.contains(r.commonAncestorContainer); }
            catch { return false; }
        });
        rangesRef.current = valid;
        if (valid.length === 0) { CSS.highlights.delete(HL_NAME); return; }
        CSS.highlights.set(HL_NAME, new Highlight(...valid));
    }, [supported]);

    // Clear highlights when the visible page/passage changes
    useEffect(() => {
        rangesRef.current = [];
        if (supported) CSS.highlights.delete(HL_NAME);
        setShowToolbar(false);
        return () => { if (supported) CSS.highlights.delete(HL_NAME); };
    }, [passageId, supported]);

    const onMouseUp = useCallback((e) => {
        if (e.target?.closest?.(".rh-toolbar")) return;
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || sel.isCollapsed) { setShowToolbar(false); return; }
        if (!sel.toString().trim()) { setShowToolbar(false); return; }
        const range = sel.getRangeAt(0);
        if (!containerRef.current?.contains(range.commonAncestorContainer)) { setShowToolbar(false); return; }
        savedRangeRef.current = range.cloneRange();
        const rect = range.getBoundingClientRect();
        setToolbarPos({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
        setShowToolbar(true);
    }, []);

    const addHighlight = useCallback(() => {
        const range = savedRangeRef.current;
        if (range && !range.collapsed) {
            rangesRef.current.push(range.cloneRange());
            refresh();
        }
        window.getSelection()?.removeAllRanges();
        setShowToolbar(false);
    }, [refresh]);

    const removeHighlight = useCallback(() => {
        const A = savedRangeRef.current;
        if (A) {
            rangesRef.current = rangesRef.current.filter((B) => {
                try {
                    const overlap =
                        A.compareBoundaryPoints(Range.END_TO_START, B) < 0 &&
                        A.compareBoundaryPoints(Range.START_TO_END, B) > 0;
                    return !overlap;
                } catch { return true; }
            });
            refresh();
        }
        window.getSelection()?.removeAllRanges();
        setShowToolbar(false);
    }, [refresh]);

    return (
        <div ref={containerRef} onMouseUp={onMouseUp} style={{ userSelect: "text", WebkitUserSelect: "text", position: "relative" }}>
            {children}

            {showToolbar && supported && (
                <div
                    className="rh-toolbar"
                    style={{
                        position: "fixed", left: `${toolbarPos.x}px`, top: `${toolbarPos.y}px`,
                        transform: "translateX(-50%)", zIndex: 9999,
                        display: "flex", gap: "4px", background: "#1f2937",
                        borderRadius: "8px", padding: "6px", boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
                    }}
                >
                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={addHighlight}
                        title="Highlight"
                        style={{ width: "32px", height: "32px", borderRadius: "4px", border: "none", background: "#FF9800", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                        <FaHighlighter color="#1f2937" size={14} />
                    </button>
                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={removeHighlight}
                        title="Remove highlight"
                        style={{ width: "32px", height: "32px", borderRadius: "4px", border: "none", background: "#374151", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                        <FaEraser color="#ffffff" size={14} />
                    </button>
                </div>
            )}

            <style>{`::highlight(${HL_NAME}){ background-color:#FF9800; color:#000000; }`}</style>
        </div>
    );
}
