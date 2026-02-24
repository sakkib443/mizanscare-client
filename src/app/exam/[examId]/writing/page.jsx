"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    FaPen,
    FaClock,
    FaCheck,
    FaTimes,
    FaChevronLeft,
    FaChevronRight,
    FaSpinner,
    FaPlay,
    FaArrowRight,
    FaSearchPlus,
    FaSearchMinus,
    FaBars,
    FaEllipsisV,
    FaImage,
    FaLock,
    FaCheckCircle,
    FaExpand,
} from "react-icons/fa";
import { writingAPI, studentsAPI } from "@/lib/api";
import ExamSecurity from "@/components/ExamSecurity";
import TextHighlighter from "@/components/TextHighlighter";

// ==================== Resizable Divider ====================
const ResizableDivider = ({ onMouseDown }) => (
    <div
        onMouseDown={onMouseDown}
        className="cursor-col-resize flex-shrink-0 relative group flex items-center justify-center"
        style={{ touchAction: "none", width: '12px' }}
    >
        <div className="absolute inset-0 bg-gray-200 group-hover:bg-gray-300 transition-colors" />
        <div className="relative z-10 flex flex-col items-center gap-0.5 pointer-events-none">
            <span className="text-[8px] text-gray-400 group-hover:text-gray-600 transition-colors select-none" style={{ lineHeight: 1 }}>◀</span>
            <div className="w-[3px] h-6 rounded-full bg-gray-400 group-hover:bg-gray-600 transition-colors" />
            <span className="text-[8px] text-gray-400 group-hover:text-gray-600 transition-colors select-none" style={{ lineHeight: 1 }}>▶</span>
        </div>
    </div>
);

// ==================== Image Viewer ====================
const ImageZoomViewer = ({ imageUrl }) => {
    const [showFullscreen, setShowFullscreen] = useState(false);

    return (
        <>
            <div className="relative bg-white border border-gray-300 mt-3">
                <img
                    src={imageUrl}
                    alt="Reference"
                    draggable={false}
                    style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                    }}
                />
                <button
                    onClick={() => setShowFullscreen(true)}
                    className="absolute bottom-2 right-2 w-7 h-7 flex items-center justify-center bg-white/90 border border-gray-300 text-gray-600 hover:text-black hover:bg-white rounded cursor-pointer"
                    title="View fullscreen"
                >
                    <FaExpand className="text-xs" />
                </button>
            </div>

            {showFullscreen && (
                <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-8"
                    onClick={() => setShowFullscreen(false)}>
                    <img src={imageUrl} alt="Reference" className="max-w-full max-h-full object-contain" />
                    <button className="absolute top-4 right-4 text-white bg-black/50 w-8 h-8 flex items-center justify-center hover:bg-black/70 cursor-pointer">
                        <FaTimes />
                    </button>
                </div>
            )}
        </>
    );
};


export default function WritingExamPage() {
    const params = useParams();
    const router = useRouter();

    const [answers, setAnswers] = useState({ task1: "", task2: "" });
    const [showInstructions, setShowInstructions] = useState(true);
    const [leftPanelWidth, setLeftPanelWidth] = useState(50);

    const [phase, setPhase] = useState("select");
    const [activePart, setActivePart] = useState(null);
    const [completedParts, setCompletedParts] = useState([]);

    const [part1Time, setPart1Time] = useState(20 * 60);
    const [part2Time, setPart2Time] = useState(40 * 60);

    const [showSubmitPartModal, setShowSubmitPartModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [questionSet, setQuestionSet] = useState(null);
    const [session, setSession] = useState(null);

    const isDraggingRef = useRef(false);

    const handleDividerMouseDown = useCallback((e) => {
        e.preventDefault();
        isDraggingRef.current = true;
        const startX = e.clientX;
        const startWidth = leftPanelWidth;
        const onMouseMove = (e) => {
            if (!isDraggingRef.current) return;
            const diff = e.clientX - startX;
            const containerWidth = window.innerWidth;
            const newWidth = startWidth + (diff / containerWidth) * 100;
            setLeftPanelWidth(Math.max(25, Math.min(75, newWidth)));
        };
        const onMouseUp = () => {
            isDraggingRef.current = false;
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    }, [leftPanelWidth]);

    // ===== LOAD DATA =====
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
                        const dbCompletedModules = verifyResponse.data.completedModules || [];
                        if (dbCompletedModules.includes("writing") || dbCompletedModules.length >= 3) {
                            parsed.completedModules = dbCompletedModules;
                            localStorage.setItem("examSession", JSON.stringify(parsed));
                            router.push(`/exam/${params.examId}`);
                            return;
                        }
                    }
                } catch (apiError) {
                    if (parsed.completedModules && (parsed.completedModules.includes("writing") || parsed.completedModules.length >= 3)) {
                        router.push(`/exam/${params.examId}`);
                        return;
                    }
                }

                const writingSetNumber = parsed.assignedSets?.writingSetNumber;
                if (!writingSetNumber) {
                    setLoadError("No writing test assigned for this exam.");
                    setIsLoading(false);
                    return;
                }
                const response = await writingAPI.getForExam(writingSetNumber);
                if (response.success && response.data) {
                    setQuestionSet(response.data);
                    const t = response.data.tasks || [];
                    if (t[0]?.recommendedTime) setPart1Time(t[0].recommendedTime * 60);
                    if (t[1]?.recommendedTime) setPart2Time(t[1].recommendedTime * 60);
                } else {
                    setLoadError("Failed to load writing test questions.");
                }
            } catch (err) {
                setLoadError(err.message || "Failed to load exam data.");
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [params.examId]);

    // ===== BUILD TASKS =====
    const tasks = (questionSet?.tasks || []).map((task, index) => {
        const isTask1 = task.taskNumber === 1 || task.taskType?.startsWith("task1");
        return {
            id: `task${index + 1}`,
            partNumber: task.taskNumber || index + 1,
            title: `Part ${task.taskNumber || index + 1}`,
            timeMinutes: task.recommendedTime || (isTask1 ? 20 : 40),
            instruction: task.instructions || "",
            prompt: task.prompt || "",
            imageUrl: task.images?.[0]?.url || null,
            minWords: task.minWords || (isTask1 ? 150 : 250)
        };
    });

    const displayTasks = tasks.length > 0 ? tasks : [
        { id: "task1", partNumber: 1, title: "Part 1", timeMinutes: 20, instruction: "", prompt: "", minWords: 150 },
        { id: "task2", partNumber: 2, title: "Part 2", timeMinutes: 40, instruction: "", prompt: "", minWords: 250 }
    ];

    const currentTaskData = activePart ? displayTasks.find(t => t.partNumber === activePart) : null;
    const currentAnswer = activePart === 1 ? answers.task1 : answers.task2;
    const wordCount = currentAnswer?.trim() ? currentAnswer.trim().split(/\s+/).length : 0;
    const meetsMinWords = wordCount >= (currentTaskData?.minWords || 150);
    const currentTime = activePart === 1 ? part1Time : part2Time;

    // ===== TIMER =====
    useEffect(() => {
        if (phase !== "writing" || !activePart) return;
        const timer = setInterval(() => {
            if (activePart === 1) {
                setPart1Time(prev => {
                    if (prev <= 1) { clearInterval(timer); handlePartTimeUp(1); return 0; }
                    return prev - 1;
                });
            } else {
                setPart2Time(prev => {
                    if (prev <= 1) { clearInterval(timer); handlePartTimeUp(2); return 0; }
                    return prev - 1;
                });
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [phase, activePart]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    // ===== HANDLERS =====
    const handleStartPart = (partNum) => { setActivePart(partNum); setPhase("writing"); };
    const handlePartTimeUp = (partNum) => { finishPart(partNum); };

    const finishPart = (partNum) => {
        const newCompleted = [...completedParts, partNum];
        setCompletedParts(newCompleted);
        if (newCompleted.includes(1) && newCompleted.includes(2)) {
            handleFinalSubmit();
        } else {
            setPhase("select");
            setActivePart(null);
        }
    };

    const handleTextChange = (value) => {
        if (activePart === 1) setAnswers(prev => ({ ...prev, task1: value }));
        else setAnswers(prev => ({ ...prev, task2: value }));
    };

    const getWritingBandScore = (task1Words, task2Words) => {
        let s1 = 0, s2 = 0;
        if (task1Words >= 150) s1 = 6.5; else if (task1Words >= 120) s1 = 5.5; else if (task1Words >= 80) s1 = 4.5; else if (task1Words >= 40) s1 = 3.5; else s1 = 2.5;
        if (task2Words >= 250) s2 = 6.5; else if (task2Words >= 200) s2 = 5.5; else if (task2Words >= 150) s2 = 4.5; else if (task2Words >= 80) s2 = 3.5; else s2 = 2.5;
        return Math.round(((s1 + s2 * 2) / 3) * 2) / 2;
    };

    const handleFinalSubmit = async () => {
        setIsSubmitting(true);
        setPhase("done");
        const task1Words = answers.task1?.trim().split(/\s+/).filter(Boolean).length || 0;
        const task2Words = answers.task2?.trim().split(/\s+/).filter(Boolean).length || 0;
        const bandScore = getWritingBandScore(task1Words, task2Words);
        const storedSession = localStorage.getItem("examSession");
        const sessionData = storedSession ? JSON.parse(storedSession) : null;
        const examId = sessionData?.examId;

        try {
            const response = await studentsAPI.saveModuleScore(examId, "writing", {
                band: bandScore, task1Words, task2Words,
                answers: { task1: answers.task1, task2: answers.task2 }
            });
            if (response.success && sessionData) {
                sessionData.completedModules = response.data?.completedModules || [...(sessionData.completedModules || []), "writing"];
                sessionData.scores = response.data?.scores || { ...(sessionData.scores || {}), writing: { overallBand: bandScore, task1Band: bandScore, task2Band: bandScore } };
                localStorage.setItem("examSession", JSON.stringify(sessionData));
            }
        } catch (error) {
            if (sessionData) {
                sessionData.completedModules = [...(sessionData.completedModules || []), "writing"];
                sessionData.scores = { ...(sessionData.scores || {}), writing: { overallBand: bandScore, task1Band: bandScore, task2Band: bandScore } };
                localStorage.setItem("examSession", JSON.stringify(sessionData));
            }
        }
        router.push(`/exam/${params.examId}`);
    };

    // ==================== LOADING ====================
    if (isLoading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <FaSpinner className="animate-spin text-3xl text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Loading writing test...</p>
                </div>
            </div>
        );
    }

    // ==================== ERROR ====================
    if (loadError) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="text-center max-w-sm">
                    <FaTimes className="text-2xl text-red-500 mx-auto mb-3" />
                    <h2 className="text-lg font-bold text-gray-800 mb-2">Cannot Load Test</h2>
                    <p className="text-gray-500 text-sm mb-4">{loadError}</p>
                    <button onClick={() => router.push("/")} className="bg-gray-800 text-white px-5 py-2 rounded-md text-sm hover:bg-gray-900 cursor-pointer">
                        Go to Home
                    </button>
                </div>
            </div>
        );
    }

    // ==================== INSTRUCTIONS ====================
    if (showInstructions) {
        return (
            <div className="min-h-screen bg-[#f8f8f8] flex items-center justify-center p-4">
                <div className="max-w-xl w-full bg-white rounded-md shadow border border-gray-200">
                    {/* Header */}
                    <div className="bg-[#333] text-white px-6 py-5">
                        <h1 className="text-xl font-bold">IELTS Writing Test</h1>
                        <p className="text-gray-300 text-sm mt-1">{questionSet?.title || `Writing Set #${questionSet?.setNumber}`}</p>
                    </div>

                    <div className="p-6">
                        {/* How it works */}
                        <div className="border border-gray-200 rounded-md p-4 mb-5">
                            <h3 className="font-semibold text-gray-800 text-sm mb-3">How This Test Works</h3>
                            <ul className="text-gray-600 text-sm space-y-1.5 leading-relaxed">
                                <li>• This test has <strong>2 separate parts</strong>, each with its own timer.</li>
                                <li>• <strong>Part 1:</strong> 20 minutes — Academic Report (min. 150 words)</li>
                                <li>• <strong>Part 2:</strong> 40 minutes — Essay (min. 250 words)</li>
                                <li>• You choose which part to start first.</li>
                                <li>• When a part's time ends, it <strong>auto-submits</strong>.</li>
                                <li>• After both parts are done, your test is complete.</li>
                            </ul>
                        </div>

                        {/* Parts */}
                        <div className="space-y-3 mb-5">
                            {displayTasks.map((task) => (
                                <div key={task.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center text-sm font-bold">
                                            {task.partNumber}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-800 text-sm">{task.title}</p>
                                            <p className="text-xs text-gray-400">Min. {task.minWords} words</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-gray-800">{task.timeMinutes} min</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Notes */}
                        <div className="bg-[#fffbeb] border border-[#fde68a] rounded-md p-3 mb-5">
                            <p className="text-xs font-semibold text-[#92400e] mb-1">Important:</p>
                            <ul className="text-xs text-[#92400e] space-y-0.5">
                                <li>• Task 2 contributes <strong>twice as much</strong> as Task 1 to your score.</li>
                                <li>• Writing below the minimum word count will lose marks.</li>
                                <li>• Once a part's timer runs out, you <strong>cannot go back</strong>.</li>
                            </ul>
                        </div>

                        <button
                            onClick={() => { setShowInstructions(false); setPhase("select"); }}
                            className="w-full bg-gray-800 text-white py-3 rounded-md font-medium text-sm hover:bg-gray-900 transition-colors cursor-pointer flex items-center justify-center gap-2"
                        >
                            Continue to Part Selection
                            <FaArrowRight className="text-xs" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ==================== PART SELECTION ====================
    if (phase === "select") {
        const part1Done = completedParts.includes(1);
        const part2Done = completedParts.includes(2);

        return (
            <div className="min-h-screen bg-[#f8f8f8] flex items-center justify-center p-4">
                <ExamSecurity examId={session?.examId} onViolationLimit={() => handleFinalSubmit()} />

                <div className="max-w-lg w-full">
                    {/* Top */}
                    <div className="mb-6">
                        <h1 className="text-lg font-bold text-gray-800">IELTS Writing Test</h1>
                        <p className="text-sm text-gray-500">Select a part to begin writing.</p>
                    </div>

                    {/* Progress */}
                    <div className="flex items-center gap-2 mb-5">
                        <div className={`h-1.5 flex-1 rounded-full ${part1Done ? "bg-gray-800" : "bg-gray-200"}`} />
                        <div className={`h-1.5 flex-1 rounded-full ${part2Done ? "bg-gray-800" : "bg-gray-200"}`} />
                        <span className="text-xs text-gray-500 ml-2">{completedParts.length}/2</span>
                    </div>

                    {/* Part Cards */}
                    <div className="space-y-3">
                        {displayTasks.map((task) => {
                            const isDone = completedParts.includes(task.partNumber);
                            const taskAnswer = task.partNumber === 1 ? answers.task1 : answers.task2;
                            const taskWords = taskAnswer?.trim().split(/\s+/).filter(Boolean).length || 0;
                            const remainingTime = task.partNumber === 1 ? part1Time : part2Time;

                            return (
                                <div
                                    key={task.id}
                                    className={`bg-white border rounded-md overflow-hidden ${isDone ? "border-gray-200 opacity-70" : "border-gray-200 hover:border-gray-400"} transition-colors`}
                                >
                                    <div className="p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isDone ? "bg-green-600 text-white" : "bg-gray-800 text-white"}`}>
                                                    {isDone ? <FaCheck className="text-xs" /> : task.partNumber}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800 text-sm">{task.title}</p>
                                                    <p className="text-xs text-gray-400">Min. {task.minWords} words</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {isDone ? (
                                                    <span className="text-xs font-medium text-green-600">Completed</span>
                                                ) : (
                                                    <span className="text-sm font-mono text-gray-600">{formatTime(remainingTime)}</span>
                                                )}
                                            </div>
                                        </div>

                                        {isDone ? (
                                            <div className="bg-gray-50 rounded-md p-2.5 text-center">
                                                <p className="text-sm text-gray-600">{taskWords} words written</p>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleStartPart(task.partNumber)}
                                                className="w-full bg-gray-800 text-white py-2.5 rounded-md text-sm font-medium hover:bg-gray-900 cursor-pointer flex items-center justify-center gap-2 transition-colors"
                                            >
                                                <FaPlay className="text-[10px]" />
                                                Start {task.title}
                                                <span className="text-gray-400 text-xs">({task.timeMinutes} min)</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // ==================== WRITING PHASE ====================
    if (phase === "writing" && currentTaskData) {
        return (
            <div className="h-screen flex flex-col bg-white overflow-hidden" style={{ userSelect: "text" }}>
                <ExamSecurity examId={session?.examId} onViolationLimit={() => { finishPart(activePart); }} />

                {/* ===== HEADER ===== */}
                <header className="bg-white border-b border-gray-300 flex items-center justify-between px-4 py-1.5 flex-shrink-0 z-50">
                    <div className="flex items-center gap-3">
                        <span className="text-gray-700 font-bold text-sm">IELTS Writing</span>
                    </div>

                    {/* Timer */}
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-mono text-sm font-bold ${currentTime < 120
                        ? "bg-red-50 text-red-700"
                        : currentTime < 300
                            ? "bg-amber-50 text-amber-700"
                            : "bg-gray-100 text-gray-700"
                        }`}>
                        <FaClock className="text-[10px]" />
                        <span>{formatTime(currentTime)}</span>
                    </div>
                </header>

                {/* ===== SPLIT PANE ===== */}
                <div className="flex-1 flex overflow-hidden">

                    {/* LEFT */}
                    <div className="overflow-y-auto bg-white" style={{ width: `${leftPanelWidth}%`, flexShrink: 0 }}>
                        <div className="p-5">
                            <TextHighlighter passageId={`writing_part_${activePart}`}>
                                {/* Part Title + Instructions in one block */}
                                <div className="border border-gray-200 rounded-md p-4 mb-4">
                                    <h2 className="text-[20px] font-bold text-gray-800 mb-3">{currentTaskData.title}</h2>
                                    {currentTaskData.instruction && (
                                        <p className="text-[18px] leading-relaxed whitespace-pre-line text-gray-600">
                                            {currentTaskData.instruction}
                                        </p>
                                    )}
                                </div>

                                {currentTaskData.prompt && (
                                    <div className="text-gray-800 text-[18px] leading-relaxed whitespace-pre-line mb-4">
                                        {currentTaskData.prompt}
                                    </div>
                                )}
                            </TextHighlighter>

                            {currentTaskData.imageUrl && (
                                <ImageZoomViewer imageUrl={currentTaskData.imageUrl} />
                            )}
                        </div>
                    </div>

                    <ResizableDivider onMouseDown={handleDividerMouseDown} />

                    {/* RIGHT */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-white">
                        {/* Answer Header */}
                        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                            <span className="text-gray-500 text-xs font-medium">
                                {currentTaskData.title} Answer
                            </span>
                            <span className={`text-xs ${meetsMinWords ? "text-green-600 font-medium" : "text-gray-400"}`}>
                                Word Count: {wordCount}
                            </span>
                        </div>

                        <textarea
                            value={currentAnswer}
                            onChange={(e) => handleTextChange(e.target.value)}
                            placeholder={`Enter your ${currentTaskData.title.toLowerCase()} answer...`}
                            className="flex-1 p-5 resize-none focus:outline-none text-gray-800 bg-white"
                            style={{
                                fontFamily: "'Times New Roman', Georgia, serif",
                                fontSize: "18px",
                                lineHeight: "1.8",
                            }}
                            autoFocus
                        />

                        {/* Progress */}
                        <div className="h-1 bg-gray-100 flex-shrink-0">
                            <div
                                className={`h-full transition-all duration-300 ${meetsMinWords ? "bg-green-500" : wordCount > 0 ? "bg-gray-400" : "bg-gray-200"}`}
                                style={{ width: `${Math.min((wordCount / (currentTaskData.minWords || 150)) * 100, 100)}%` }}
                            />
                        </div>

                        <div className="flex items-center justify-between px-4 py-1.5 border-t border-gray-100 bg-gray-50 flex-shrink-0">
                            <span className="text-[10px] text-gray-400">{formatTime(currentTime)} remaining</span>
                            <span className="text-[10px] text-gray-400">
                                {meetsMinWords ? `✓ Min. reached (${currentTaskData.minWords})` : `${currentTaskData.minWords - wordCount} more words needed`}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ===== BOTTOM ===== */}
                <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                        {displayTasks.map(t => {
                            const done = completedParts.includes(t.partNumber);
                            const active = t.partNumber === activePart;
                            return (
                                <span key={t.id} className={`px-3 py-1 rounded-md text-xs font-medium ${done
                                    ? "bg-green-100 text-green-700"
                                    : active
                                        ? "bg-gray-800 text-white"
                                        : "bg-gray-200 text-gray-500"
                                    }`}>
                                    {done ? "✓" : ""} {t.title}
                                </span>
                            );
                        })}
                    </div>

                    <button
                        onClick={() => setShowSubmitPartModal(true)}
                        className="bg-red-600 text-white px-4 py-1.5 rounded-md text-xs font-medium cursor-pointer hover:bg-red-700 flex items-center gap-1.5 transition-colors"
                    >
                        Submit {currentTaskData.title} <FaCheck className="text-[10px]" />
                    </button>
                </div>

                {/* ===== SUBMIT MODAL ===== */}
                {showSubmitPartModal && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4">
                        <div className="bg-white rounded-md p-5 max-w-sm w-full shadow-lg border border-gray-200">
                            <h3 className="text-base font-bold text-gray-800 mb-3">Submit {currentTaskData.title}?</h3>

                            <div className={`p-3 rounded-md border mb-3 ${meetsMinWords ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-700">{currentTaskData.title}</span>
                                    <span className={`text-sm font-bold ${meetsMinWords ? "text-green-700" : "text-amber-700"}`}>
                                        {wordCount} / {currentTaskData.minWords} words
                                    </span>
                                </div>
                            </div>

                            {!meetsMinWords && (
                                <p className="text-xs text-red-600 mb-3">
                                    ⚠ You haven't met the minimum word count. This may affect your score.
                                </p>
                            )}

                            <p className="text-xs text-gray-500 mb-4">
                                Time remaining: <strong>{formatTime(currentTime)}</strong>. You cannot return to this part after submitting.
                            </p>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowSubmitPartModal(false)}
                                    className="flex-1 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 cursor-pointer text-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => { setShowSubmitPartModal(false); finishPart(activePart); }}
                                    className="flex-1 py-2 bg-gray-800 text-white rounded-md text-sm hover:bg-gray-900 cursor-pointer font-medium"
                                >
                                    Submit
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Fallback
    return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <FaSpinner className="animate-spin text-2xl text-gray-400" />
        </div>
    );
}
