"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import {
    FaCheck,
    FaVolumeUp,
    FaPause,
    FaPlay,
    FaTimes,
    FaSpinner,
    FaArrowRight,
    FaHeadphones
} from "react-icons/fa";
import { listeningAPI, studentsAPI } from "@/lib/api";
import ExamSecurity from "@/components/ExamSecurity";

const QUESTIONS_PER_PAGE = 10;

// ── Component: Renders Instruction with Embedded Question Inputs ──
// This ensures table structures (<table>, <tr>, <td>) are preserved from the database
// while allowing React to manage inputs inside them using Portals.
const InstructionWithPortals = ({ content, answers, handleAnswer }) => {
    const [targets, setTargets] = useState({});
    const containerRef = useRef(null);

    // CRITICAL: Memoize the processed HTML so it doesn't trigger 
    // dangerouslySetInnerHTML to overwrite the DOM on every state change/re-render.
    const processedHtml = React.useMemo(() => {
        return (content || "").replace(
            /(?:<strong>\s*)?\[(\d+)\](?:\s*<\/strong>)?/g,
            (match, qNum) => {
                return `<span id="portal-q-${qNum}" class="q-portal-target" style="display: inline-block; min-width: 140px; vertical-align: middle;"></span>`;
            }
        );
    }, [content]);

    useEffect(() => {
        let attempts = 0;
        const findTargets = () => {
            if (containerRef.current) {
                const found = {};
                const markers = containerRef.current.querySelectorAll('.q-portal-target');
                if (markers.length > 0) {
                    markers.forEach(el => {
                        const qNum = el.id.replace('portal-q-', '');
                        found[qNum] = el;
                    });
                    setTargets(found);
                    return true;
                }
            }
            return false;
        };

        // Poll for targets because dangerouslySetInnerHTML timing can be tricky with complex tables
        const interval = setInterval(() => {
            attempts++;
            if (findTargets() || attempts > 50) {
                clearInterval(interval);
            }
        }, 50);

        return () => clearInterval(interval);
    }, [processedHtml]); // Dependency on the memoized HTML

    return (
        <div style={{ marginBottom: '16px', lineHeight: '1.6', color: '#1f2937' }}>
            <div
                ref={containerRef}
                className="instruction-html-container"
                dangerouslySetInnerHTML={{ __html: processedHtml }}
                style={{ overflowX: 'auto' }}
            />

            {Object.entries(targets).map(([qNum, element]) => (
                createPortal(
                    <span key={qNum} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', margin: '0 4px' }}>
                        <span style={{
                            border: '1px solid #374151', fontWeight: 'bold', fontSize: '11px',
                            minWidth: '22px', height: '22px', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', color: '#111827', background: '#f3f4f6',
                            lineHeight: '1', borderRadius: '2px', flexShrink: 0
                        }}>{qNum}</span>
                        <input
                            type="text"
                            value={answers[qNum] || ''}
                            onChange={e => handleAnswer(qNum, e.target.value)}
                            style={{
                                border: '1px solid #d1d5db', borderBottom: '2px solid #6b7280',
                                width: '100px', fontSize: '14px',
                                outline: 'none', background: 'white', color: '#111827',
                                padding: '3px 6px', borderRadius: '2px'
                            }}
                        />
                    </span>,
                    element
                )
            ))}
            <style jsx global>{`
                .instruction-html-container table {
                    border-collapse: collapse;
                    width: 100%;
                    margin-bottom: 20px;
                    border: 1px solid #d1d5db !important;
                }
                .instruction-html-container th, 
                .instruction-html-container td {
                    border: 1px solid #d1d5db !important;
                    padding: 12px !important;
                    text-align: left;
                    vertical-align: middle;
                }
                .instruction-html-container th {
                    background-color: #f9fafb;
                }
            `}</style>
        </div>
    );
};

export default function ListeningExamPage() {
    const params = useParams();
    const router = useRouter();

    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(40 * 60);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showInstructions, setShowInstructions] = useState(true);
    const [currentPage, setCurrentPage] = useState(0); // page index (10 qs/page)

    // Data states
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [questionSet, setQuestionSet] = useState(null);
    const [session, setSession] = useState(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(1);
    const audioRef = useRef(null);
    const hasStarted = useRef(false);

    // Speaker Check State
    const [speakerChecked, setSpeakerChecked] = useState(false);
    const [isPlayingTestSound, setIsPlayingTestSound] = useState(false);
    const [testSoundPlayed, setTestSoundPlayed] = useState(false);

    const playTestSound = useCallback(() => {
        setIsPlayingTestSound(true);
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioCtx();

            const beepDuration = 0.15;
            const gap = 0.12;
            const frequencies = [523.25, 659.25, 783.99];

            frequencies.forEach((freq, i) => {
                const oscillator = ctx.createOscillator();
                const gainNode = ctx.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(ctx.destination);

                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(freq, ctx.currentTime);

                const startTime = ctx.currentTime + i * (beepDuration + gap);
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
                gainNode.gain.linearRampToValueAtTime(0, startTime + beepDuration);

                oscillator.start(startTime);
                oscillator.stop(startTime + beepDuration);
            });

            const totalDuration = frequencies.length * (beepDuration + gap) * 1000;
            setTimeout(() => {
                setIsPlayingTestSound(false);
                setTestSoundPlayed(true);
                ctx.close();
            }, totalDuration + 200);
        } catch (err) {
            console.error('Audio test failed:', err);
            setIsPlayingTestSound(false);
            setTestSoundPlayed(true);
        }
    }, []);

    // ── Load exam data ───────────────────────────────────────────────────
    useEffect(() => {
        const loadData = async () => {
            try {
                const storedSession = localStorage.getItem("examSession");
                if (!storedSession) {
                    setLoadError("No exam session found. Please start from the home page.");
                    setIsLoading(false);
                    return;
                }
                const parsed = JSON.parse(storedSession);
                setSession(parsed);

                try {
                    const verifyResponse = await studentsAPI.verifyExamId(parsed.examId);
                    if (verifyResponse.success && verifyResponse.data) {
                        const dbMods = verifyResponse.data.completedModules || [];
                        if (dbMods.includes("listening") || dbMods.length >= 3) {
                            parsed.completedModules = dbMods;
                            localStorage.setItem("examSession", JSON.stringify(parsed));
                            router.push(`/exam/${params.examId}`);
                            return;
                        }
                    }
                } catch {
                    if (parsed.completedModules && (parsed.completedModules.includes("listening") || parsed.completedModules.length >= 3)) {
                        router.push(`/exam/${params.examId}`);
                        return;
                    }
                }

                const listeningSetNumber = parsed.assignedSets?.listeningSetNumber;
                if (!listeningSetNumber) {
                    setLoadError("No listening test assigned for this exam.");
                    setIsLoading(false);
                    return;
                }

                const response = await listeningAPI.getForExam(listeningSetNumber);
                if (response.success && response.data) {
                    setQuestionSet(response.data);
                } else {
                    setLoadError("Failed to load listening test questions.");
                }
            } catch (err) {
                setLoadError(err.message || "Failed to load exam data.");
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [params.examId]);

    // ── Build flat question list ──────────────────────────────────────────
    const sections = questionSet?.sections || [];
    const audioUrl = questionSet?.mainAudioUrl || "/audio/Listening-1.mpeg";

    // Flatten all non-instruction blocks across sections, assign global displayNumber
    const allBlocks = []; // each item: { ...block, _sectionIndex, _isInstruction, displayNumber? }
    let qCounter = 0;
    sections.forEach((sec, sIdx) => {
        (sec.questions || []).forEach(b => {
            if (b.blockType === 'instruction') {
                allBlocks.push({ ...b, _sectionIndex: sIdx, _isInstruction: true });
            } else {
                qCounter++;
                allBlocks.push({ ...b, _sectionIndex: sIdx, _isInstruction: false, displayNumber: qCounter });
            }
        });
    });

    const allRealQuestions = allBlocks.filter(b => !b._isInstruction);
    const totalQuestions = allRealQuestions.length;
    const totalMarks = allRealQuestions.reduce((s, q) => s + (q.marks || 1), 0);

    // ── Pagination: 10 questions per page ─────────────────────────────────
    const totalPages = Math.ceil(totalQuestions / QUESTIONS_PER_PAGE);

    // which displayNumbers are on currentPage?
    const pageStartQNum = currentPage * QUESTIONS_PER_PAGE + 1;  // e.g. 1, 11, 21
    const pageEndQNum = Math.min(pageStartQNum + QUESTIONS_PER_PAGE - 1, totalQuestions); // e.g. 10, 20

    // blocks to render on this page: keep instruction blocks that precede qs on this page,
    // and all non-instruction blocks with displayNumber in [pageStartQNum, pageEndQNum]
    function getBlocksForPage(startQ, endQ) {
        const result = [];
        let lastInstructionIdx = -1;
        for (let i = 0; i < allBlocks.length; i++) {
            const b = allBlocks[i];
            if (b._isInstruction) {
                // include if the next non-instruction block is in this page range
                // check forward to see if any following q is in range
                let hasRelatedQ = false;
                for (let j = i + 1; j < allBlocks.length; j++) {
                    if (!allBlocks[j]._isInstruction) {
                        if (allBlocks[j].displayNumber >= startQ && allBlocks[j].displayNumber <= endQ) {
                            hasRelatedQ = true;
                        }
                        break;
                    }
                }
                if (hasRelatedQ) result.push(b);
            } else {
                if (b.displayNumber >= startQ && b.displayNumber <= endQ) {
                    result.push(b);
                }
            }
        }
        return result;
    }

    const pageBlocks = getBlocksForPage(pageStartQNum, pageEndQNum);

    // Section info for current page (first block's section)
    const firstPageBlock = pageBlocks.find(b => !b._isInstruction);
    const currentSectionIndex = firstPageBlock?._sectionIndex ?? 0;
    const currentSec = sections[currentSectionIndex] || {};

    // ── Timer ─────────────────────────────────────────────────────────────
    const formatTime = (s) => {
        if (!s || isNaN(s)) return "00:00";
        return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
    };

    useEffect(() => {
        if (showInstructions || isLoading) return;
        const t = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) { clearInterval(t); handleSubmit(); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(t);
    }, [showInstructions, isLoading]);

    // ── Audio ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const onEnded = () => setIsPlaying(false);
        audio.addEventListener('ended', onEnded);
        return () => audio.removeEventListener('ended', onEnded);
    }, []);

    useEffect(() => {
        if (audioRef.current && !showInstructions && audioUrl && !hasStarted.current) {
            audioRef.current.src = audioUrl;
            audioRef.current.load();
            audioRef.current.play().catch(err => console.log("Auto-play blocked:", err));
            setIsPlaying(true);
            hasStarted.current = true;
        }
    }, [showInstructions, audioUrl]);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) { audioRef.current.pause(); } else { audioRef.current.play(); }
        setIsPlaying(p => !p);
    };

    const handleVolumeChange = (e) => {
        const v = parseFloat(e.target.value);
        setVolume(v);
        if (audioRef.current) audioRef.current.volume = v;
    };

    // ── Answer ────────────────────────────────────────────────────────────
    const handleAnswer = (qId, value) => setAnswers(prev => ({ ...prev, [qId]: value }));

    // ── Navigation ────────────────────────────────────────────────────────
    const goToPage = (pg) => {
        setCurrentPage(pg);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const goNext = () => {
        if (currentPage < totalPages - 1) { goToPage(currentPage + 1); }
        else { setShowSubmitModal(true); }
    };
    const goPrev = () => { if (currentPage > 0) goToPage(currentPage - 1); };

    // ── Score & Submit ────────────────────────────────────────────────────
    const getBandScore = (raw) => {
        if (raw >= 39) return 9.0; if (raw >= 37) return 8.5; if (raw >= 35) return 8.0;
        if (raw >= 32) return 7.5; if (raw >= 30) return 7.0; if (raw >= 26) return 6.5;
        if (raw >= 23) return 6.0; if (raw >= 18) return 5.5; if (raw >= 16) return 5.0;
        if (raw >= 13) return 4.5; if (raw >= 11) return 4.0; if (raw >= 8) return 3.5;
        if (raw >= 6) return 3.0; if (raw >= 4) return 2.5; return 2.0;
    };

    const calculateScore = () => {
        let score = 0;
        allRealQuestions.forEach(q => {
            const ua = answers[q.displayNumber];
            if (ua && ua.toString().trim().toLowerCase() === q.correctAnswer?.toString().trim().toLowerCase()) {
                score += q.marks || 1;
            }
        });
        return score;
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        await new Promise(r => setTimeout(r, 1200));
        const score = calculateScore();
        const band = getBandScore(score);

        const detailedAnswers = allRealQuestions.map(q => {
            const ua = answers[q.displayNumber] || "";
            let cmp = ua.toString().trim();
            if ((q.questionType === "multiple-choice" || q.questionType === "matching") && ua) {
                const m = ua.toString().match(/^([A-Za-z])\./);
                if (m) cmp = m[1].toUpperCase();
            }
            return { questionNumber: q.displayNumber, questionText: q.questionText || "", questionType: q.questionType || "fill-in-blank", studentAnswer: cmp, studentAnswerFull: ua, correctAnswer: q.correctAnswer, isCorrect: false };
        });

        const storedSession = localStorage.getItem("examSession");
        let sd = storedSession ? JSON.parse(storedSession) : session;
        const examId = sd?.examId || session?.examId;

        try {
            const res = await studentsAPI.saveModuleScore(examId, "listening", { score, total: totalMarks, band, answers: detailedAnswers });
            if (res.success && sd) {
                sd.completedModules = res.data?.completedModules || [...(sd.completedModules || []), "listening"];
                sd.scores = res.data?.scores || { ...(sd.scores || {}), listening: { band, raw: score, correctAnswers: score, totalQuestions: totalMarks } };
                localStorage.setItem("examSession", JSON.stringify(sd));
            }
        } catch {
            if (sd) {
                sd.completedModules = [...(sd.completedModules || []), "listening"];
                sd.scores = { ...(sd.scores || {}), listening: { band, raw: score, correctAnswers: score, totalQuestions: totalMarks } };
                localStorage.setItem("examSession", JSON.stringify(sd));
            }
        }
        router.push(`/exam/${params.examId}`);
    };

    const answeredCount = Object.keys(answers).filter(k => answers[k] !== "").length;

    // ─────────────────────────────────────────────────────────────────────
    // RENDER: Loading
    // ─────────────────────────────────────────────────────────────────────
    if (isLoading) return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="text-center">
                <FaSpinner className="animate-spin text-4xl text-gray-500 mx-auto mb-3" />
                <p className="text-gray-600 text-sm">Loading listening test...</p>
            </div>
        </div>
    );

    if (loadError) return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
            <div className="text-center max-w-sm">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FaTimes className="text-xl text-red-500" />
                </div>
                <h2 className="text-lg font-bold text-gray-800 mb-2">Cannot Load Test</h2>
                <p className="text-gray-600 text-sm mb-4">{loadError}</p>
                <button onClick={() => router.push("/")} className="bg-gray-800 text-white px-5 py-2 text-sm hover:bg-gray-900 cursor-pointer">Go Home</button>
            </div>
        </div>
    );


    // ─────────────────────────────────────────────────────────────────────
    // RENDER: Instructions
    // ─────────────────────────────────────────────────────────────────────
    if (showInstructions) return (
        <div className="min-h-screen" style={{ backgroundColor: '#4b4b4b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ textAlign: 'center', maxWidth: '800px', padding: '0 20px', color: 'white' }}>
                {/* Headphones Icon */}
                <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'center' }}>
                    <FaHeadphones size={100} style={{ color: 'white', opacity: 0.9 }} />
                </div>

                {/* Warning Text */}
                <p style={{ fontSize: '15px', lineHeight: '1.6', marginBottom: '25px', fontWeight: '400' }}>
                    You will be listening to an audio clip during this test. You will not be permitted to pause or rewind the audio while answering the questions.
                </p>

                {/* Speaker Check Section */}
                <div style={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    padding: '24px',
                    marginBottom: '30px',
                    maxWidth: '500px',
                    marginLeft: 'auto',
                    marginRight: 'auto'
                }}>
                    <p style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#fbbf24' }}>
                        🔊 Speaker Check
                    </p>
                    <p style={{ fontSize: '13px', marginBottom: '16px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.5' }}>
                        Before starting, please check that your speaker/headphones are working properly.
                    </p>

                    {!testSoundPlayed ? (
                        <>
                            {/* Play Test Sound Button */}
                            <button
                                onClick={playTestSound}
                                disabled={isPlayingTestSound}
                                style={{
                                    backgroundColor: isPlayingTestSound ? '#6b7280' : '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    padding: '10px 24px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    cursor: isPlayingTestSound ? 'not-allowed' : 'pointer',
                                    borderRadius: '6px',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <FaVolumeUp size={14} style={isPlayingTestSound ? { animation: 'pulse 0.5s infinite alternate' } : {}} />
                                {isPlayingTestSound ? 'Playing...' : 'Play Test Sound'}
                            </button>
                            {isPlayingTestSound && (
                                <p style={{ fontSize: '12px', marginTop: '10px', color: 'rgba(255,255,255,0.6)' }}>
                                    Listening for beeps...
                                </p>
                            )}
                        </>
                    ) : !speakerChecked ? (
                        <>
                            <p style={{ fontSize: '13px', marginBottom: '14px', color: 'rgba(255,255,255,0.9)' }}>
                                Did you hear the test sound?
                            </p>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                <button
                                    onClick={() => setSpeakerChecked(true)}
                                    style={{
                                        backgroundColor: '#16a34a',
                                        color: 'white',
                                        border: 'none',
                                        padding: '8px 20px',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        cursor: 'pointer',
                                        borderRadius: '6px',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <FaCheck size={11} />
                                    Yes, I can hear it
                                </button>
                                <button
                                    onClick={() => { setTestSoundPlayed(false); }}
                                    style={{
                                        backgroundColor: 'transparent',
                                        color: 'rgba(255,255,255,0.8)',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        padding: '8px 20px',
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        borderRadius: '6px',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    No, try again
                                </button>
                            </div>
                        </>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#4ade80' }}>
                            <FaCheck size={14} />
                            <span style={{ fontSize: '14px', fontWeight: '600' }}>Speaker verified ✓</span>
                        </div>
                    )}
                </div>

                {/* Start Test Button - only enabled after speaker check */}
                <button
                    onClick={() => speakerChecked && setShowInstructions(false)}
                    disabled={!speakerChecked}
                    style={{
                        backgroundColor: speakerChecked ? 'black' : '#6b7280',
                        color: 'white',
                        border: 'none',
                        padding: '10px 25px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: speakerChecked ? 'pointer' : 'not-allowed',
                        borderRadius: '4px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                        opacity: speakerChecked ? 1 : 0.6,
                        transition: 'all 0.3s ease'
                    }}
                >
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingLeft: '2px'
                    }}>
                        <FaPlay size={10} style={{ color: speakerChecked ? 'black' : '#6b7280' }} />
                    </div>
                    Start Listening Test
                </button>
                {!speakerChecked && (
                    <p style={{ fontSize: '12px', marginTop: '12px', color: 'rgba(255,255,255,0.5)' }}>
                        Please complete the speaker check above to continue
                    </p>
                )}

                {/* Pulse animation for speaker icon */}
                <style>{`
                    @keyframes pulse {
                        0% { opacity: 0.5; transform: scale(0.95); }
                        100% { opacity: 1; transform: scale(1.05); }
                    }
                `}</style>
            </div>
        </div>
    );

    // ─────────────────────────────────────────────────────────────────────
    // RENDER: Main Exam — Official IELTS Interface
    // ─────────────────────────────────────────────────────────────────────

    // Group consecutive non-instruction blocks for smarter rendering
    function buildRenderGroups(blocks) {
        const groups = [];
        let i = 0;
        while (i < blocks.length) {
            const b = blocks[i];
            if (b._isInstruction) {
                groups.push({ type: 'instruction', block: b }); i++; continue;
            }
            const qType = b.questionType || 'fill-in-blank';
            const group = [b];
            let j = i + 1;
            // Group matching (they share options) or multi-select MC (they share question text)
            if (qType === 'matching' || qType === 'multiple-choice-multi' || qType === 'matching-features' || qType === 'matching-headings' || qType === 'map-labeling' || qType === 'diagram-labeling') {
                while (j < blocks.length && !blocks[j]._isInstruction && blocks[j].questionType === qType) {
                    group.push(blocks[j]); j++;
                }
            }
            // regular Multiple Choice or Note Completion are rendered as individual/adjacent blocks but not "grouped" under one header
            groups.push({ type: qType, blocks: group });
            i = j;
        }
        return groups;
    }

    const renderGroups = buildRenderGroups(pageBlocks);

    // Pre-scan: find question numbers embedded as [N] placeholders in instruction blocks
    const embeddedQNums = new Set();
    renderGroups.forEach(grp => {
        if (grp.type === 'instruction' && grp.block.content) {
            const matches = grp.block.content.match(/\[(\d+)\]/g);
            if (matches) {
                matches.forEach(m => {
                    const num = parseInt(m.replace(/[\[\]]/g, ''));
                    if (num >= 1 && num <= 40) embeddedQNums.add(num);
                });
            }
        }
    });

    // Which part does this page belong to? (for part banner)
    // Determine which parts are covered by this page
    const partCovered = new Set(pageBlocks.filter(b => !b._isInstruction).map(b => b._sectionIndex));

    return (
        <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: "'Arial', sans-serif", fontSize: '14px' }}>

            <ExamSecurity examId={session?.examId} onViolationLimit={() => handleSubmit()} />
            <audio ref={audioRef} preload="auto" />

            {/* ══════════════════════════════════════
                TOP HEADER — Official IELTS style
            ══════════════════════════════════════ */}
            <header style={{ backgroundColor: '#fff', borderBottom: '1px solid #ccc', height: '44px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%', padding: '0 16px' }}>
                    {/* Left: IELTS logo + audio status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <span style={{ fontWeight: 'bold', color: '#d40000', fontSize: '20px', fontStyle: 'italic', letterSpacing: '-0.5px' }}>IELTS</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: isPlaying ? '#1a56db' : '#6b7280' }}>
                            <FaVolumeUp size={11} />
                            <span>{isPlaying ? 'Audio is playing' : 'Audio paused'}</span>
                        </div>
                    </div>
                    {/* Right: timer + controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '14px', color: timeLeft < 300 ? '#dc2626' : '#374151', fontVariantNumeric: 'tabular-nums' }}>
                            {formatTime(timeLeft)}
                        </span>

                        <button onClick={() => setShowSubmitModal(true)} style={{ fontSize: '12px', color: '#4b5563', border: '1px solid #d1d5db', padding: '2px 10px', cursor: 'pointer', background: 'white' }}>
                            Submit
                        </button>
                    </div>
                </div>
            </header>

            {/* ══════════════════════════════════════
                PART BANNER — gray bar
            ══════════════════════════════════════ */}
            <div style={{ backgroundColor: '#e5e7eb', borderBottom: '1px solid #d1d5db', padding: '5px 16px', flexShrink: 0 }}>
                <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#1f2937' }}>
                    {partCovered.size === 1
                        ? `Part ${currentSectionIndex + 1}`
                        : `Parts ${Math.min(...partCovered) + 1}–${Math.max(...partCovered) + 1}`
                    }
                </div>
                <div style={{ fontSize: '12px', color: '#4b5563' }}>
                    {(() => {
                        const partQs = pageBlocks.filter(b => !b._isInstruction);
                        const first = partQs[0]?.displayNumber;
                        const last = partQs[partQs.length - 1]?.displayNumber;
                        return currentSec.instructions || (first && last ? `Listen and answer questions ${first}–${last}` : '');
                    })()}
                </div>
            </div>

            {/* ══════════════════════════════════════
                SCROLLABLE CONTENT
            ══════════════════════════════════════ */}
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '56px' }}>
                <div style={{ maxWidth: '1000px', padding: '30px 60px' }}>

                    {/* Section image if any */}
                    {currentSec.imageUrl && (
                        <div style={{ marginBottom: '16px' }}>
                            <img src={currentSec.imageUrl} alt="Section diagram" style={{ maxWidth: '100%', maxHeight: '400px' }} />
                        </div>
                    )}

                    {/* ── Render groups ── */}
                    {renderGroups.map((grp, gIdx) => {

                        // ── Instruction block ──
                        if (grp.type === 'instruction') {
                            return (
                                <InstructionWithPortals
                                    key={gIdx}
                                    content={grp.block.content}
                                    answers={answers}
                                    handleAnswer={handleAnswer}
                                    qNumsSet={embeddedQNums}
                                />
                            );
                        }

                        const blocks = grp.blocks;
                        const firstB = blocks[0];

                        // Skip question groups whose questions are already embedded as [N] inputs in instruction blocks
                        if (grp.type !== 'instruction') {
                            const allEmbedded = blocks.every(b => embeddedQNums.has(b.displayNumber));
                            if (allEmbedded) return null;
                        }
                        if (grp.type === 'fill-in-blank' || grp.type === 'note-completion' || grp.type === 'sentence-completion' || grp.type === 'form-completion' || grp.type === 'flow-chart-completion' || grp.type === 'summary-completion' || grp.type === 'short-answer') {
                            const firstQNum = blocks[0].displayNumber;
                            const lastQNum = blocks[blocks.length - 1].displayNumber;
                            return (
                                <div key={gIdx} style={{ marginBottom: '20px' }}>
                                    {/* Instruction from block */}
                                    {firstB.instruction && (
                                        <p style={{ marginBottom: '8px', color: '#1f2937', fontSize: '15px', fontWeight: 'bold' }}>{firstB.instruction}</p>
                                    )}
                                    {/* Question rows - left aligned bullet list */}
                                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {blocks.map(q => (
                                            <NoteCompletionRow key={q.displayNumber} q={q} answers={answers} handleAnswer={handleAnswer} />
                                        ))}
                                    </ul>
                                </div>
                            );
                        }

                        // ── Multiple Choice ──
                        if (grp.type === 'multiple-choice' || grp.type === 'multiple-choice-multi') {
                            const isMultiSelect = grp.type === 'multiple-choice-multi';
                            const firstB = blocks[0];
                            const qNumbers = blocks.map(b => b.displayNumber);

                            const handleSel = (qNum, label) => {
                                if (isMultiSelect) {
                                    const cur = qNumbers.map(n => answers[n]).filter(Boolean);
                                    if (cur.includes(label)) {
                                        const toClear = qNumbers.find(n => answers[n] === label);
                                        if (toClear) handleAnswer(toClear, '');
                                    } else if (cur.length < qNumbers.length) {
                                        const emp = qNumbers.find(n => !answers[n]);
                                        if (emp) handleAnswer(emp, label);
                                    }
                                } else {
                                    handleAnswer(qNum, label);
                                }
                            };

                            // ── Multi-Select: ONE block with multiple number boxes ──
                            if (isMultiSelect) {
                                return (
                                    <div key={gIdx} style={{ marginBottom: '24px' }} id={`q-${qNumbers[0]}`}>
                                        {firstB.mainInstruction && <p style={{ marginBottom: '8px', fontWeight: 'bold', fontSize: '15px' }}>{firstB.mainInstruction}</p>}

                                        {/* Number boxes [21] [22] + question text */}
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                            {qNumbers.map(n => (
                                                <span key={n} style={{
                                                    border: '1px solid #374151', fontWeight: 'bold', fontSize: '12px',
                                                    padding: '0 6px', color: '#111827', background: 'white',
                                                    lineHeight: '1.8', flexShrink: 0, borderRadius: '2px', marginTop: '2px'
                                                }}>{n}</span>
                                            ))}
                                            <span style={{ color: '#1f2937', fontSize: '15px', lineHeight: '1.5' }}>{firstB.questionText}</span>
                                        </div>

                                        {/* Shared options */}
                                        <div style={{ marginLeft: '34px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {(firstB.options || []).map((opt, oIdx) => {
                                                const letter = String.fromCharCode(65 + oIdx);
                                                const text = (opt || '').replace(/^[A-Z]\.\s*/, '');
                                                const isSel = qNumbers.some(n => answers[n] === letter);
                                                return (
                                                    <div key={oIdx} onClick={() => handleSel(qNumbers[0], letter)}
                                                        style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                                                        <span style={{ fontWeight: 'bold', width: '16px', flexShrink: 0, fontSize: '14px' }}>{letter}</span>
                                                        <div style={{
                                                            width: '18px', height: '18px', border: `1px solid ${isSel ? '#1f2937' : '#d1d5db'}`,
                                                            background: isSel ? '#1f2937' : 'white', flexShrink: 0, marginTop: '1px',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            borderRadius: isMultiSelect ? '3px' : '50%'
                                                        }}>
                                                            {isSel && <div style={{ width: '10px', height: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <svg width="10" height="10" viewBox="0 0 12 12"><path d="M2 6l3 3 5-6" stroke="white" strokeWidth="2" fill="none" /></svg>
                                                            </div>}
                                                        </div>
                                                        <span style={{ color: isSel ? '#111827' : '#374151', fontWeight: isSel ? '600' : '400', fontSize: '14px' }}>{text}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            }

                            // ── Single-Select: each question separately ──
                            return (
                                <div key={gIdx} style={{ marginBottom: '24px' }}>
                                    {firstB.mainInstruction && <p style={{ marginBottom: '8px', fontWeight: 'bold', fontSize: '15px' }}>{firstB.mainInstruction}</p>}

                                    {blocks.map((q, qidx) => (
                                        <div key={qidx} style={{ marginBottom: '16px' }} id={`q-${q.displayNumber}`}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                                                {/* [N] box */}
                                                <span style={{
                                                    border: '1px solid #374151', fontWeight: 'bold', fontSize: '12px',
                                                    padding: '0 6px', color: '#111827', background: 'white',
                                                    lineHeight: '1.8', flexShrink: 0, borderRadius: '2px', marginTop: '2px'
                                                }}>{q.displayNumber}</span>
                                                <span style={{ color: '#1f2937', fontSize: '15px', lineHeight: '1.5' }}>{q.questionText}</span>
                                            </div>

                                            <div style={{ marginLeft: '34px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {(q.options || []).map((opt, oIdx) => {
                                                    const letter = String.fromCharCode(65 + oIdx);
                                                    const text = (opt || '').replace(/^[A-Z]\.\s*/, '');
                                                    const isSel = answers[q.displayNumber] === letter;
                                                    return (
                                                        <div key={oIdx} onClick={() => handleSel(q.displayNumber, letter)}
                                                            style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                                                            <span style={{ fontWeight: 'bold', width: '16px', flexShrink: 0, fontSize: '14px' }}>{letter}</span>
                                                            <div style={{
                                                                width: '18px', height: '18px', border: `1px solid ${isSel ? '#1f2937' : '#d1d5db'}`,
                                                                background: isSel ? '#1f2937' : 'white', flexShrink: 0, marginTop: '1px',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%'
                                                            }}>
                                                                {isSel && <div style={{ width: '6px', height: '6px', background: 'white', borderRadius: '50%' }} />}
                                                            </div>
                                                            <span style={{ color: isSel ? '#111827' : '#374151', fontWeight: isSel ? '600' : '400', fontSize: '14px' }}>{text}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        }

                        // ── Matching ──
                        if (grp.type === 'matching' || grp.type === 'matching-features' || grp.type === 'matching-headings') {
                            const firstQNum = blocks[0].displayNumber;
                            const lastQNum = blocks[blocks.length - 1].displayNumber;
                            const hasLongOpts = (firstB.options || []).some(o => (o || '').length > 4);
                            return (
                                <div key={gIdx} style={{ marginBottom: '20px' }}>
                                    {/* Instruction text */}
                                    {firstB.instruction && <p style={{ marginBottom: '4px', fontWeight: 'bold' }}>{firstB.instruction}</p>}
                                    {firstB.subInstruction && <p style={{ marginBottom: '8px', fontStyle: 'italic', color: '#4b5563', fontSize: '13px' }}>{firstB.subInstruction}</p>}
                                    {hasLongOpts && (
                                        <div style={{ border: '1px solid #d1d5db', marginBottom: '12px', maxWidth: '480px' }}>
                                            {(firstB.options || []).map((opt, oIdx) => {
                                                const letter = (opt || '').match(/^([A-Z])\./)?.[1] || String.fromCharCode(65 + oIdx);
                                                const text = (opt || '').replace(/^[A-Z]\.\s*/, '');
                                                return (
                                                    <div key={oIdx} style={{ display: 'flex', gap: '12px', padding: '5px 10px', borderBottom: oIdx < (firstB.options.length - 1) ? '1px solid #e5e7eb' : 'none', fontSize: '13px' }}>
                                                        <span style={{ fontWeight: 'bold', width: '16px', flexShrink: 0 }}>{letter}</span>
                                                        <span style={{ color: '#374151' }}>{text}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '600px' }}>
                                        {blocks.map(q => (
                                            <div key={q.displayNumber} id={`q-${q.displayNumber}`}
                                                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                {/* [N] box */}
                                                <span style={{
                                                    border: '1px solid #374151', fontWeight: 'bold', fontSize: '12px',
                                                    padding: '0 6px', color: '#111827', background: 'white',
                                                    lineHeight: '1.8', flexShrink: 0, borderRadius: '2px'
                                                }}>{q.displayNumber}</span>
                                                <span style={{ flex: 1, color: '#1f2937', fontSize: '15px' }}>{q.questionText}</span>
                                                <select value={answers[q.displayNumber] || ""} onChange={e => handleAnswer(q.displayNumber, e.target.value)}
                                                    style={{ border: '1px solid #d1d5db', padding: '4px 8px', fontSize: '14px', background: 'white', cursor: 'pointer', width: '70px', textAlign: 'center', borderRadius: '2px' }}>
                                                    <option value=""></option>
                                                    {(firstB.options || []).map((_, oIdx) => (
                                                        <option key={oIdx} value={String.fromCharCode(65 + oIdx)}>{String.fromCharCode(65 + oIdx)}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        }

                        // ── Map / Diagram Labeling ──
                        if (grp.type === 'map-labeling' || grp.type === 'diagram-labeling') {
                            return (
                                <div key={gIdx} style={{ marginBottom: '20px' }}>
                                    {/* Section image for map/diagram */}
                                    {firstB.imageUrl && (
                                        <div style={{ marginBottom: '16px' }}>
                                            <img src={firstB.imageUrl} alt="Map/Diagram" style={{ maxWidth: '100%', maxHeight: '400px', border: '1px solid #d1d5db' }} />
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '500px' }}>
                                        {blocks.map(q => (
                                            <div key={q.displayNumber} id={`q-${q.displayNumber}`}
                                                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                {/* [N] box */}
                                                <span style={{
                                                    border: '1px solid #374151', fontWeight: 'bold', fontSize: '12px',
                                                    padding: '0 6px', color: '#111827', background: 'white',
                                                    lineHeight: '1.8', flexShrink: 0, borderRadius: '2px'
                                                }}>{q.displayNumber}</span>
                                                <span style={{ flex: 1, color: '#1f2937', fontSize: '15px' }}>{q.questionText}</span>
                                                <select value={answers[q.displayNumber] || ""}
                                                    onChange={e => handleAnswer(q.displayNumber, e.target.value)}
                                                    style={{
                                                        border: '1px solid #d1d5db', padding: '4px 8px', fontSize: '14px',
                                                        background: 'white', cursor: 'pointer', width: '80px',
                                                        textAlign: 'center', borderRadius: '2px'
                                                    }}>
                                                    <option value=""></option>
                                                    {(q.options || []).map((opt, oIdx) => (
                                                        <option key={oIdx} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        }

                        // ── Fallback: any other type ──
                        return (
                            <div key={gIdx} style={{ marginBottom: '16px' }}>
                                {blocks.map(q => (
                                    <div key={q.displayNumber} id={`q-${q.displayNumber}`}
                                        style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                                        <span style={{ border: '1px solid #6b7280', fontWeight: 'bold', fontSize: '11px', padding: '0 3px', color: '#374151', flexShrink: 0 }}>{q.displayNumber}</span>
                                        <span style={{ flex: 1, color: '#111827' }}>{q.questionText}</span>
                                        <input type="text" value={answers[q.displayNumber] || ''}
                                            onChange={e => handleAnswer(q.displayNumber, e.target.value)}
                                            style={{ borderBottom: '1px solid #6b7280', width: '130px', fontSize: '14px', outline: 'none', background: 'transparent', color: '#111827', flexShrink: 0 }} />
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ══════════════════════════════════════
                FIXED BOTTOM NAV — Question numbers + ◄ ►
            ══════════════════════════════════════ */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                background: 'white', borderTop: '1px solid #d1d5db',
                display: 'flex', alignItems: 'center',
                height: '46px', padding: '0 8px', zIndex: 100
            }}>
                {/* Part label */}
                <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#111827', marginRight: '16px', flexShrink: 0 }}>
                    Part {currentSectionIndex + 1}
                </span>

                {/* Question number buttons — filtered to show only current part */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, overflowX: 'auto', paddingBottom: '2px' }}>
                    {allRealQuestions
                        .filter(q => Math.floor((q.displayNumber - 1) / QUESTIONS_PER_PAGE) === currentPage)
                        .map(q => {
                            const isAnswered = answers[q.displayNumber] && answers[q.displayNumber] !== '';
                            return (
                                <div key={q.displayNumber} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                    {/* Indicator Line Above */}
                                    <div style={{ width: '28px', height: '2px', background: isAnswered ? '#2563eb' : '#e5e7eb', borderRadius: '1px' }}></div>

                                    <button
                                        onClick={() => {
                                            const el = document.getElementById(`q-${q.displayNumber}`);
                                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }}
                                        style={{
                                            width: '28px', height: '28px', fontSize: '14px', fontWeight: '500',
                                            border: isAnswered ? '2px solid #2563eb' : '2px solid transparent',
                                            background: 'transparent',
                                            color: '#374151',
                                            cursor: 'pointer', flexShrink: 0,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            borderRadius: '2px'
                                        }}>
                                        {q.displayNumber}
                                    </button>
                                </div>
                            );
                        })}
                </div>

                {/* ◄ ► arrows */}
                <div style={{ display: 'flex', gap: '2px', marginLeft: '8px', flexShrink: 0 }}>
                    <button onClick={goPrev} disabled={currentPage === 0}
                        style={{
                            width: '36px', height: '32px', fontWeight: 'bold', fontSize: '14px', cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
                            background: currentPage === 0 ? '#f3f4f6' : '#374151', color: currentPage === 0 ? '#9ca3af' : 'white',
                            border: '1px solid #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>◄</button>
                    <button onClick={goNext}
                        style={{
                            width: '36px', height: '32px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer',
                            background: '#374151', color: 'white',
                            border: '1px solid #374151', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                        {currentPage === totalPages - 1 ? <FaCheck size={11} /> : '►'}
                    </button>
                </div>
            </div>

            {/* ══════════════════════════════════════
                SUBMIT MODAL
            ══════════════════════════════════════ */}
            {showSubmitModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '16px' }}>
                    <div style={{ background: 'white', padding: '24px', maxWidth: '360px', width: '100%', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontWeight: 'bold', fontSize: '16px', color: '#1f2937' }}>Submit Listening Test?</h3>
                            <button onClick={() => setShowSubmitModal(false)} style={{ color: '#9ca3af', cursor: 'pointer', background: 'none', border: 'none', fontSize: '16px' }}>
                                <FaTimes />
                            </button>
                        </div>
                        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', padding: '16px', marginBottom: '16px', textAlign: 'center' }}>
                            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937' }}>{answeredCount}<span style={{ fontSize: '18px', color: '#9ca3af' }}>/{totalQuestions}</span></p>
                            <p style={{ color: '#6b7280', fontSize: '13px', marginTop: '4px' }}>questions answered</p>
                        </div>
                        {totalQuestions - answeredCount > 0 && (
                            <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', padding: '10px', marginBottom: '16px', textAlign: 'center' }}>
                                <p style={{ color: '#92400e', fontSize: '13px', fontWeight: '600' }}>
                                    {totalQuestions - answeredCount} question{totalQuestions - answeredCount > 1 ? 's' : ''} unanswered
                                </p>
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setShowSubmitModal(false)}
                                style={{ flex: 1, padding: '10px', border: '1px solid #d1d5db', color: '#374151', fontWeight: '600', fontSize: '13px', cursor: 'pointer', background: 'white' }}>
                                Review
                            </button>
                            <button onClick={handleSubmit} disabled={isSubmitting}
                                style={{ flex: 1, padding: '10px', background: '#1f2937', color: 'white', fontWeight: '600', fontSize: '13px', cursor: 'pointer', border: 'none', opacity: isSubmitting ? 0.7 : 1 }}>
                                {isSubmitting ? 'Submitting...' : 'Submit Test'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// NoteCompletionRow — Professional DASH-FREE Style
// Removes redundant [N] from text and strips all underscores
// ─────────────────────────────────────────────────────────────────────────────
function NoteCompletionRow({ q, answers, handleAnswer }) {
    // 1. Aggressive Clean: Remove underscores, {blank}, and redundant [number] from text
    const rawText = q.questionText || '';
    const cleanText = rawText
        .replace(/_{1,}/g, '')            // Remove all underscores
        .replace(/\{blank\}/g, '')        // Remove {blank} markers
        .replace(/\[\d+\]/g, '')          // Remove [15], [16] patterns from text
        .trim();

    // The [N] number box + Input field component
    const InputWithNumber = (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', verticalAlign: 'middle', marginLeft: '6px' }}>
            <span style={{
                border: '1px solid #374151', fontWeight: 'bold', fontSize: '12px',
                padding: '0 6px', color: '#111827', background: 'white',
                lineHeight: '1.8', flexShrink: 0, borderRadius: '2px'
            }}>{q.displayNumber}</span>
            <input
                type="text"
                value={answers[q.displayNumber] || ''}
                onChange={e => handleAnswer(q.displayNumber, e.target.value)}
                style={{
                    border: '1px solid #d1d5db', width: '170px',
                    fontSize: '14px', outline: 'none', background: '#fff',
                    color: '#111827', padding: '4px 10px', borderRadius: '2px'
                }}
            />
        </span>
    );

    return (
        <li id={`q-${q.displayNumber}`}
            style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px', fontSize: '15px', color: '#111827', lineHeight: '1.6' }}>
            {/* Bullet Point */}
            <span style={{ flexShrink: 0, marginTop: '3px' }}>•</span>

            <div style={{ flex: 1 }}>
                <span style={{ verticalAlign: 'middle' }}>{cleanText}</span>
                {InputWithNumber}
            </div>
        </li>
    );
}
