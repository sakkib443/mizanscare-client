"use client";

import React, { useEffect, useState, Suspense } from "react";
import {
    FaSearch,
    FaChevronLeft,
    FaChevronRight,
    FaSpinner,
    FaEye,
    FaCalendarAlt,
    FaCheckCircle,
    FaClock,
    FaFilePdf,
    FaLock,
} from "react-icons/fa";
import { studentsAPI } from "@/lib/api";
import Link from "next/link";

// ───────────────────────── helpers ─────────────────────────

const fmtBand = (v) => (v && Number(v) > 0 ? Number(v).toFixed(1) : "—");

const bandColorClass = (b) => {
    const n = Number(b);
    if (!n) return "text-slate-300";
    if (n >= 7) return "text-emerald-600";
    if (n >= 5.5) return "text-sky-600";
    return "text-amber-600";
};

const getModuleScores = (result) => ({
    listening: result.scores?.listening?.band,
    reading: result.scores?.reading?.band,
    writing: result.scores?.writing?.overallBand,
    speaking: result.scores?.speaking?.band,
    overall: result.scores?.overall,
});

// Load an image (same-origin public asset) into a PNG dataURL + dimensions
const loadImageData = (url) =>
    new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            try {
                const canvas = document.createElement("canvas");
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                canvas.getContext("2d").drawImage(img, 0, 0);
                resolve({ data: canvas.toDataURL("image/png"), w: img.naturalWidth, h: img.naturalHeight });
            } catch {
                resolve(null);
            }
        };
        img.onerror = () => resolve(null);
        img.src = url;
    });

// ───────────────────────── PDF generator ─────────────────────────

const generateResultPDF = async (result) => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    const pageW = 210;
    const margin = 15;
    const contentW = pageW - margin * 2; // 180

    // Brand palette
    const CYAN = [14, 116, 144];
    const DARK = [30, 41, 59];
    const GRAY = [100, 116, 139];
    const LINE = [203, 213, 225];
    const SOFT = [248, 250, 252];

    const s = getModuleScores(result);

    // ── Header: logo + report label ──
    const logo = await loadImageData("/images/IMG_5177.PNG");
    if (logo) {
        let dh = 15;
        let dw = (logo.w / logo.h) * dh;
        if (dw > 85) {
            dw = 85;
            dh = (logo.h / logo.w) * dw;
        }
        doc.addImage(logo.data, "PNG", margin, 11, dw, dh);
    } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(204, 0, 0);
        doc.text("Mizan's Care", margin, 20);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...CYAN);
    doc.text("IELTS MOCK TEST", pageW - margin, 16, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text("Official Result Report", pageW - margin, 21, { align: "right" });

    // Brand divider
    doc.setDrawColor(...CYAN);
    doc.setLineWidth(0.8);
    doc.line(margin, 30, pageW - margin, 30);

    // ── Title ──
    let y = 42;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...DARK);
    doc.text("Candidate Result Report", pageW / 2, y, { align: "center" });

    // ── Student info card ──
    y += 8;
    const cardTop = y;
    const cardH = 42;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.setFillColor(...SOFT);
    doc.roundedRect(margin, cardTop, contentW, cardH, 2.5, 2.5, "FD");

    const info = [
        ["Candidate Name", result.nameEnglish || "—"],
        ["Exam ID", result.examId || "—"],
        ["Test Type", result.testType === "general-training" ? "General Training" : "Academic"],
        ["Email", result.email || "—"],
        ["Test Date", result.examCompletedAt ? new Date(result.examCompletedAt).toLocaleDateString() : "—"],
        ["Result Status", result.resultsPublished ? "Published" : "Pending"],
    ];
    const colW = contentW / 2;
    const rowH = cardH / 3;
    info.forEach((pair, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = margin + 7 + col * colW;
        const ry = cardTop + 9 + row * rowH;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...GRAY);
        doc.text(pair[0].toUpperCase(), x, ry);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...DARK);
        doc.text(String(pair[1]), x, ry + 5.5);
    });

    // ── Band scores ──
    y = cardTop + cardH + 14;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...DARK);
    doc.text("Band Scores", margin, y);

    y += 5;
    const modules = [
        ["Listening", fmtBand(s.listening)],
        ["Reading", fmtBand(s.reading)],
        ["Writing", fmtBand(s.writing)],
        ["Speaking", fmtBand(s.speaking)],
    ];
    const gap = 5;
    const boxW = (contentW - gap * 3) / 4;
    const boxH = 32;
    modules.forEach((m, i) => {
        const x = margin + i * (boxW + gap);
        doc.setDrawColor(...LINE);
        doc.setLineWidth(0.3);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x, y, boxW, boxH, 2, 2, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(...CYAN);
        doc.text(m[0].toUpperCase(), x + boxW / 2, y + 9, { align: "center" });
        doc.setFont("helvetica", "bold");
        doc.setFontSize(23);
        doc.setTextColor(...DARK);
        doc.text(String(m[1]), x + boxW / 2, y + 24, { align: "center" });
    });

    // ── Overall band ──
    y += boxH + 9;
    const obH = 24;
    doc.setFillColor(...CYAN);
    doc.roundedRect(margin, y, contentW, obH, 2.5, 2.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text("OVERALL BAND SCORE", margin + 9, y + 14.5);
    doc.setFontSize(27);
    doc.text(fmtBand(s.overall), pageW - margin - 9, y + 16.5, { align: "right" });

    // ── Footer ──
    const fY = 280;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(margin, fY, pageW - margin, fY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text("This is a computer-generated IELTS mock test report issued by Mizan's Care.", margin, fY + 5);
    doc.text(`Generated on ${new Date().toLocaleString()}`, margin, fY + 9.5);
    doc.text("Mizan's Care — An English Language Training Centre", pageW - margin, fY + 5, { align: "right" });

    const safeName = (result.examId || result.nameEnglish || "result").toString().replace(/[^\w-]+/g, "_");
    doc.save(`IELTS_Result_${safeName}.pdf`);
};

// ───────────────────────── page ─────────────────────────

function ResultsContent() {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [downloadingId, setDownloadingId] = useState(null);

    useEffect(() => {
        const fetchResults = async () => {
            setLoading(true);
            try {
                const response = await studentsAPI.getAllResults({ page, limit: 12, searchTerm });
                if (response.success && response.data) {
                    setResults(Array.isArray(response.data.results) ? response.data.results : []);
                    setTotalPages(response.data.pagination?.totalPages || 1);
                }
            } catch (error) {
                console.error("Failed to fetch results:", error);
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(fetchResults, 500);
        return () => clearTimeout(timeoutId);
    }, [page, searchTerm]);

    const handleDownload = async (result) => {
        setDownloadingId(result._id);
        try {
            await generateResultPDF(result);
        } catch (err) {
            console.error("Failed to generate PDF:", err);
        } finally {
            setDownloadingId(null);
        }
    };

    const ScoreCell = ({ value }) => (
        <td className="px-2.5 py-4 text-center">
            <span className={`font-semibold tabular-nums ${bandColorClass(value)}`}>
                {fmtBand(value)}
            </span>
        </td>
    );

    return (
        <div className="min-h-screen bg-sky-50 p-4 lg:p-6">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Exam Results</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage and review student performance.</p>
                </div>

                <div className="relative">
                    <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                    <input
                        type="text"
                        placeholder="Search student..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2.5 border border-blue-100 rounded-lg w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-300 text-sm bg-white shadow-sm"
                    />
                </div>
            </div>

            {/* Content Table */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <FaSpinner className="animate-spin text-3xl text-blue-400" />
                </div>
            ) : results.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center border border-blue-100 shadow-sm">
                    <p className="text-slate-500">No results found.</p>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold whitespace-nowrap">
                                    <th className="px-4 py-4 text-left">Student</th>
                                    <th className="px-4 py-4 text-left">Exam ID</th>
                                    <th className="px-4 py-4 text-left">Status</th>
                                    <th className="px-2.5 py-4 text-center">L</th>
                                    <th className="px-2.5 py-4 text-center">R</th>
                                    <th className="px-2.5 py-4 text-center">W</th>
                                    <th className="px-2.5 py-4 text-center">S</th>
                                    <th className="px-2.5 py-4 text-center">Overall</th>
                                    <th className="px-2.5 py-4 text-center">Result Status</th>
                                    <th className="px-2.5 py-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {results.map((result) => {
                                    const s = getModuleScores(result);
                                    const published = !!result.resultsPublished;
                                    const isCompleted = result.examStatus === "completed";
                                    return (
                                        <tr key={result._id} className="hover:bg-sky-50/50 transition-colors">
                                            {/* Student */}
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center font-semibold text-sm shrink-0">
                                                        {(result.nameEnglish || "?").charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-medium text-slate-900 truncate">{result.nameEnglish}</div>
                                                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                                            <FaCalendarAlt className="text-[10px]" />
                                                            {result.examCompletedAt ? new Date(result.examCompletedAt).toLocaleDateString() : "Active"}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Exam ID */}
                                            <td className="px-4 py-4">
                                                <span className="font-mono text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded px-2 py-1">
                                                    {result.examId}
                                                </span>
                                            </td>

                                            {/* Exam Status */}
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${isCompleted ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                                    {isCompleted ? <FaCheckCircle className="text-[10px]" /> : <FaClock className="text-[10px]" />}
                                                    <span className="capitalize">{result.examStatus}</span>
                                                </span>
                                            </td>

                                            {/* Scores */}
                                            <ScoreCell value={s.listening} />
                                            <ScoreCell value={s.reading} />
                                            <ScoreCell value={s.writing} />
                                            <ScoreCell value={s.speaking} />

                                            {/* Overall */}
                                            <td className="px-2.5 py-4 text-center">
                                                <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-bold tabular-nums">
                                                    {fmtBand(s.overall)}
                                                </span>
                                            </td>

                                            {/* Result Status */}
                                            <td className="px-4 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    {published ? (
                                                        <>
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-emerald-100 text-emerald-700">
                                                                <FaCheckCircle className="text-[10px]" /> Published
                                                            </span>
                                                            <button
                                                                onClick={() => handleDownload(result)}
                                                                disabled={downloadingId === result._id}
                                                                title="Download PDF result"
                                                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 border border-red-200 text-red-500 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all shadow-sm disabled:opacity-60 disabled:cursor-wait"
                                                            >
                                                                {downloadingId === result._id ? (
                                                                    <FaSpinner className="animate-spin text-xs" />
                                                                ) : (
                                                                    <FaFilePdf className="text-sm" />
                                                                )}
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-slate-100 text-slate-500">
                                                            <FaLock className="text-[9px]" /> Not Published
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Action */}
                                            <td className="px-4 py-4">
                                                <div className="flex items-center justify-center">
                                                    <Link
                                                        href={`/dashboard/admin/students/${result._id}`}
                                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-blue-200 text-blue-500 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm"
                                                        title="View Details"
                                                    >
                                                        <FaEye className="text-sm" />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
                <div className="flex items-center justify-end gap-2 mt-6">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="w-9 h-9 flex items-center justify-center rounded-lg border border-blue-200 bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm transition-colors"
                    >
                        <FaChevronLeft />
                    </button>
                    <span className="text-sm text-slate-600 px-2 font-medium">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="w-9 h-9 flex items-center justify-center rounded-lg border border-blue-200 bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm transition-colors"
                    >
                        <FaChevronRight />
                    </button>
                </div>
            )}
        </div>
    );
}

export default function ResultsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-sky-50 flex items-center justify-center">
                <FaSpinner className="animate-spin text-2xl text-blue-400" />
            </div>
        }>
            <ResultsContent />
        </Suspense>
    );
}
