"use client";

import React, { useRef, useState, useEffect, useCallback, useId } from "react";
import { FaHighlighter, FaEraser, FaStickyNote } from "react-icons/fa";

/**
 * RangeHighlighter
 *
 * Lets the user highlight ANY selected text inside `children`, regardless of how
 * that text is rendered (plain strings, custom components, dangerouslySetInnerHTML…).
 *
 * Uses the CSS Custom Highlight API (CSS.highlights + ::highlight()), so it
 * highlights live DOM ranges WITHOUT mutating the DOM — no letter shifting, no
 * React reconciliation issues, and it stays smooth.
 *
 * Highlights are remembered per `passageId` as character offsets, so they persist
 * when the student navigates away and back to a passage/part.
 */
const HL_COLOR = "#D8B4FE";   // official-IELTS-style light purple
const HL_TEXT = "#1a1a1a";    // keep highlighted text readable in every contrast mode

// Character offset (text length) from the container's start to a boundary point.
function offsetFromStart(container, node, nodeOffset) {
    try {
        const r = document.createRange();
        r.selectNodeContents(container);
        r.setEnd(node, nodeOffset);
        return r.toString().length;
    } catch {
        return 0;
    }
}

// Rebuild a DOM Range from stored character offsets by walking the text nodes.
function rangeFromOffsets(container, start, end) {
    if (start == null || end == null || start >= end) return null;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    let count = 0, startNode = null, startOff = 0, endNode = null, endOff = 0, n;
    while ((n = walker.nextNode())) {
        const len = n.textContent.length;
        if (startNode === null && start <= count + len) { startNode = n; startOff = start - count; }
        if (end <= count + len) { endNode = n; endOff = end - count; break; }
        count += len;
    }
    if (!startNode || !endNode) return null;
    try {
        const r = document.createRange();
        r.setStart(startNode, Math.max(0, Math.min(startOff, startNode.textContent.length)));
        r.setEnd(endNode, Math.max(0, Math.min(endOff, endNode.textContent.length)));
        return r.collapsed ? null : r;
    } catch {
        return null;
    }
}

// Character offset at a screen point — used to detect a click on a highlight.
function caretCharOffsetFromPoint(container, x, y) {
    let node = null, offset = 0;
    if (document.caretRangeFromPoint) {
        const r = document.caretRangeFromPoint(x, y);
        if (!r) return null;
        node = r.startContainer; offset = r.startOffset;
    } else if (document.caretPositionFromPoint) {
        const p = document.caretPositionFromPoint(x, y);
        if (!p) return null;
        node = p.offsetNode; offset = p.offset;
    } else {
        return null;
    }
    if (!node || !container.contains(node)) return null;
    return offsetFromStart(container, node, offset);
}

export default function RangeHighlighter({ children, passageId = "default", contrastMode = "black-on-white", onAddNote = null }) {
    // Unique CSS-highlight name per instance so multiple highlighters on one page
    // (e.g. Reading's passage + questions) don't overwrite each other.
    const HL_NAME = `exam-hl-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
    const containerRef = useRef(null);
    const storeRef = useRef({});          // { [passageId]: [{start, end}] }
    const savedRangeRef = useRef(null);
    const [showToolbar, setShowToolbar] = useState(false);
    const [toolbarPos, setToolbarPos] = useState({ x: 0, y: 0 });
    const [removePopup, setRemovePopup] = useState(null); // { x, y, target:{start,end} }

    const supported = typeof window !== "undefined"
        && typeof window.Highlight !== "undefined"
        && !!(window.CSS && CSS.highlights);

    // Re-apply this passage's stored highlights onto the current DOM.
    const rebuild = useCallback(() => {
        if (!supported || !containerRef.current) return;
        const items = storeRef.current[passageId] || [];
        const ranges = [];
        for (const it of items) {
            const r = rangeFromOffsets(containerRef.current, it.start, it.end);
            if (r) ranges.push(r);
        }
        if (ranges.length === 0) CSS.highlights.delete(HL_NAME);
        else CSS.highlights.set(HL_NAME, new Highlight(...ranges));
    }, [supported, passageId]);

    // Re-apply this passage's highlights after EVERY render, so they survive
    // re-renders (timer tick, typing), contrast changes and page navigation.
    // It's cheap when there are no highlights (no DOM walk).
    useEffect(() => { rebuild(); });

    // Hide the toolbar / remove popup when the passage/part changes.
    useEffect(() => { setShowToolbar(false); setRemovePopup(null); }, [passageId]);

    // Close the remove popup when clicking anywhere outside it.
    useEffect(() => {
        if (!removePopup) return;
        const onDocDown = (e) => { if (!e.target?.closest?.(".rh-remove")) setRemovePopup(null); };
        document.addEventListener("mousedown", onDocDown);
        return () => document.removeEventListener("mousedown", onDocDown);
    }, [removePopup]);

    // Remove the CSS highlight when this highlighter unmounts.
    useEffect(() => {
        return () => { if (supported) CSS.highlights.delete(HL_NAME); };
    }, [supported]);

    const onMouseUp = useCallback((e) => {
        if (e.target?.closest?.(".rh-toolbar")) return;
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !sel.toString().trim()) {
            setShowToolbar(false);
            return;
        }
        const range = sel.getRangeAt(0);
        if (!containerRef.current?.contains(range.commonAncestorContainer)) {
            setShowToolbar(false);
            return;
        }
        savedRangeRef.current = range.cloneRange();
        const rect = range.getBoundingClientRect();
        setToolbarPos({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
        setRemovePopup(null);
        setShowToolbar(true);
    }, []);

    // Click on a highlighted spot → offer to remove that highlight.
    const onClick = useCallback((e) => {
        if (e.target?.closest?.(".rh-toolbar") || e.target?.closest?.(".rh-remove")) return;
        // Don't interfere with form controls (answer inputs etc.)
        if (e.target?.closest?.("input, select, textarea, button, a")) { setRemovePopup(null); return; }
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && sel.toString().trim()) return; // active selection → toolbar handles it
        const c = containerRef.current;
        if (!c) { setRemovePopup(null); return; }
        const pos = caretCharOffsetFromPoint(c, e.clientX, e.clientY);
        const list = storeRef.current[passageId] || [];
        const hit = pos == null ? null : list.find(it => pos >= it.start && pos < it.end);
        if (hit) setRemovePopup({ x: e.clientX, y: e.clientY, target: hit });
        else setRemovePopup(null);
    }, [passageId]);

    const confirmRemove = useCallback(() => {
        const target = removePopup?.target;
        if (target) {
            const list = storeRef.current[passageId] || [];
            storeRef.current[passageId] = list.filter(it => !(it.start === target.start && it.end === target.end));
            rebuild();
        }
        setRemovePopup(null);
    }, [removePopup, passageId, rebuild]);

    const addHighlight = useCallback(() => {
        const range = savedRangeRef.current;
        const c = containerRef.current;
        if (range && c && !range.collapsed) {
            const start = offsetFromStart(c, range.startContainer, range.startOffset);
            const end = offsetFromStart(c, range.endContainer, range.endOffset);
            if (end > start) {
                const list = storeRef.current[passageId] || [];
                // Merge the new highlight with any it overlaps, keep the rest.
                let s = start, e = end;
                const kept = [];
                for (const it of list) {
                    if (it.end < s || it.start > e) kept.push(it);
                    else { s = Math.min(s, it.start); e = Math.max(e, it.end); }
                }
                kept.push({ start: s, end: e });
                storeRef.current[passageId] = kept;
                rebuild();
            }
        }
        window.getSelection()?.removeAllRanges();
        setShowToolbar(false);
    }, [passageId, rebuild]);

    // Send the selected text up to the module to create a note card
    const addNote = useCallback(() => {
        const text = savedRangeRef.current ? savedRangeRef.current.toString().trim() : '';
        if (text && onAddNote) onAddNote(text);
        window.getSelection()?.removeAllRanges();
        setShowToolbar(false);
    }, [onAddNote]);

    return (
        <div ref={containerRef} onMouseUp={onMouseUp} onClick={onClick} style={{ userSelect: "text", WebkitUserSelect: "text", position: "relative" }}>
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
                        style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "4px", border: "none", background: HL_COLOR, color: "#1f2937", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}
                    >
                        <FaHighlighter color="#1f2937" size={13} /> Highlight
                    </button>
                    {onAddNote && (
                        <button
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={addNote}
                            title="Add note"
                            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "4px", border: "none", background: "#374151", color: "#ffffff", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}
                        >
                            <FaStickyNote size={13} /> Note
                        </button>
                    )}
                </div>
            )}

            {removePopup && supported && (
                <div
                    className="rh-remove"
                    style={{
                        position: "fixed", left: `${removePopup.x}px`, top: `${removePopup.y + 10}px`,
                        transform: "translateX(-50%)", zIndex: 9999,
                        background: "#1f2937", borderRadius: "8px", padding: "6px", boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
                    }}
                >
                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => { e.stopPropagation(); confirmRemove(); }}
                        title="Remove highlight"
                        style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", border: "none", borderRadius: "4px", background: "#ef4444", color: "#ffffff", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}
                    >
                        <FaEraser size={13} /> Remove highlight
                    </button>
                </div>
            )}

            <style>{`::highlight(${HL_NAME}){ background-color:${HL_COLOR}; color:${HL_TEXT}; }`}</style>
        </div>
    );
}
