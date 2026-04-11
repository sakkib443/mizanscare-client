"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
    FaBook,
    FaChevronLeft,
    FaChevronRight,
    FaClock,
    FaCheck,
    FaTimes,
    FaSpinner,
    FaPlay,
    FaArrowRight,
    FaArrowLeft,
    FaVolumeUp
} from "react-icons/fa";
import { readingAPI, studentsAPI } from "@/lib/api";
import ExamSecurity from "@/components/ExamSecurity";
import TextHighlighter from "@/components/TextHighlighter";

// ═══════════════════════════════════════════
// Helper: Convert passage text to proper HTML
// Handles \n newlines, double-newline paragraphs, and bold paragraph labels (A., B., etc.)
// ═══════════════════════════════════════════
function formatPassageHtml(text) {
    if (!text) return '';
    // Normalize: convert literal \n to actual newlines
    let html = text.replace(/\\n/g, '\n');
    // Split by double newline = paragraphs
    const paragraphs = html.split(/\n\n+/);
    return paragraphs.map(p => {
        // Convert remaining single newlines to <br>
        let content = p.trim().replace(/\n/g, '<br>');
        // Bold paragraph labels like "A.<br>" or "A. "
        content = content.replace(/^([A-Z])\.(<br>|\s)/, '<strong>$1.</strong>$2');
        return `<p style="margin-bottom:14px;text-align:justify">${content}</p>`;
    }).join('');
}

function ReadingExamPageContent() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const adminPreviewTestNumber = searchParams.get('adminPreview');
    const isAdminPreview = !!adminPreviewTestNumber;

    const [currentPassage, setCurrentPassage] = useState(0);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(60 * 60);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showInstructions, setShowInstructions] = useState(!isAdminPreview);
    const [adminScoreResult, setAdminScoreResult] = useState(null);
    const [fontSize, setFontSize] = useState(16);
    const [focusedQuestion, setFocusedQuestion] = useState(1);
    const [splitPercent, setSplitPercent] = useState(50); // left panel width %
    const isDragging = useRef(false);
    const containerRef = useRef(null);

    // Splitter drag handlers
    const onSplitterMouseDown = useCallback((e) => {
        e.preventDefault();
        isDragging.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, []);

    useEffect(() => {
        const onMouseMove = (e) => {
            if (!isDragging.current || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const pct = Math.min(Math.max((x / rect.width) * 100, 20), 80);
            setSplitPercent(pct);
        };
        const onMouseUp = () => {
            if (isDragging.current) {
                isDragging.current = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, []);

    // Options menu states
    const [showOptionsMenu, setShowOptionsMenu] = useState(false);
    const [optionsView, setOptionsView] = useState('main');
    const [contrastMode, setContrastMode] = useState('black-on-white');
    const [textSizeMode, setTextSizeMode] = useState('regular');

    const contrastStyles = {
        'black-on-white': { bg: '#fff', text: '#000', partBg: '#f0ece4', partBorder: '#d6d0c4' },
        'white-on-black': { bg: '#000', text: '#fff', partBg: '#000', partBorder: '#555' },
        'yellow-on-black': { bg: '#000', text: '#ffff00', partBg: '#000', partBorder: '#555' }
    };
    const textSizeScale = { 'regular': 1, 'large': 1.2, 'extra-large': 1.45 };
    const cs = contrastStyles[contrastMode];
    const tScale = textSizeScale[textSizeMode];


    // Data loading states
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [questionSet, setQuestionSet] = useState(null);
    const [session, setSession] = useState(null);

    // Load session and question set
    useEffect(() => {
        const loadData = async () => {
            try {
                // ═══ ADMIN PREVIEW MODE ═══
                if (isAdminPreview) {
                    const response = await readingAPI.getForExam(adminPreviewTestNumber);
                    if (response.success && response.data) {
                        const data = response.data;
                        const sectionsData = data.sections || data.passages || (Array.isArray(data) ? data : []);
                        data.sections = sectionsData;
                        setQuestionSet(data);
                    } else {
                        setLoadError("Failed to load reading test.");
                    }
                    setIsLoading(false);
                    return;
                }

                // ═══ NORMAL STUDENT MODE ═══
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
                        const setNum = parsed.currentSetNumber;
                        const isThisSetDone = setNum
                            ? (dbCompletedModules.includes(`reading:${setNum}`) || dbCompletedModules.includes("reading"))
                            : dbCompletedModules.includes("reading");

                        if (isThisSetDone) {
                            parsed.completedModules = dbCompletedModules;
                            localStorage.setItem("examSession", JSON.stringify(parsed));
                            router.push(`/exam/${params.examId}`);
                            return;
                        }
                    }
                } catch (apiError) {
                    console.error("Failed to verify completion from DB, using localStorage:", apiError);
                    const setNum = parsed.currentSetNumber;
                    const isThisSetDone = setNum
                        ? (parsed.completedModules?.includes(`reading:${setNum}`) || parsed.completedModules?.includes("reading"))
                        : parsed.completedModules?.includes("reading");
                    if (isThisSetDone) {
                        router.push(`/exam/${params.examId}`);
                        return;
                    }
                }

                const readingSetNumber = parsed.currentSetNumber || parsed.assignedSets?.readingSetNumber;
                if (!readingSetNumber) {
                    setLoadError("No reading test assigned for this exam.");
                    setIsLoading(false);
                    return;
                }

                const response = await readingAPI.getForExam(readingSetNumber);
                if (response.success && response.data) {
                    const data = response.data;
                    const sectionsData = data.sections || data.passages || (Array.isArray(data) ? data : []);
                    data.sections = sectionsData;
                    setQuestionSet(data);
                } else {
                    setLoadError("Failed to load reading test questions.");
                }
            } catch (err) {
                console.error("Load error:", err);
                setLoadError(err.message || "Failed to load exam data.");
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [params.examId, isAdminPreview, adminPreviewTestNumber]);

    // Build passages from question set sections
    const passages = (questionSet?.sections || questionSet?.passages || []).map((section, index) => {
        // Create a map to store unique questions by their number
        const questionMap = new Map();

        // Calculate the question range for this section based on its groups to avoid duplicates from other sections
        const sectionRange = (section.questionGroups || []).reduce((acc, g) => ({
            min: Math.min(acc.min, g.startQuestion || Infinity),
            max: Math.max(acc.max, g.endQuestion || -Infinity)
        }), { min: Infinity, max: -Infinity });

        // 1. Collect direct questions (these usually have correct answers and metadata)
        if (section.questions) {
            section.questions.forEach(q => {
                const isInRange = sectionRange.min <= sectionRange.max ?
                    (q.questionNumber >= sectionRange.min && q.questionNumber <= sectionRange.max) :
                    true;

                if (isInRange) {
                    questionMap.set(q.questionNumber, {
                        id: q.questionNumber,
                        questionNumber: q.questionNumber,
                        type: q.questionType,
                        text: q.questionText,
                        options: q.options || [],
                        marks: q.marks || 1,
                        correctAnswer: q.correctAnswer
                    });
                }
            });
        }

        // 2. Questions inside questionGroups (these are used for display)
        if (section.questionGroups) {
            section.questionGroups.forEach(group => {
                const qType = group.questionType || group.groupType;

                const processItem = (item) => {
                    if (item && item.questionNumber) {
                        const existing = questionMap.get(item.questionNumber) || {};
                        questionMap.set(item.questionNumber, {
                            ...existing,
                            id: item.questionNumber,
                            questionNumber: item.questionNumber,
                            type: existing.type || qType,
                            text: existing.text || item.text || item.questionText || "",
                            options: existing.options?.length ? existing.options : (item.options || []),
                            marks: existing.marks || item.marks || 1
                        });
                    }
                };

                group.questions?.forEach(processItem);
                group.markers?.forEach(processItem);
                group.mcQuestions?.forEach(processItem);
                group.statements?.forEach(processItem);
                group.matchingItems?.forEach(processItem);

                group.notesSections?.forEach(s => {
                    s.bullets?.forEach(b => {
                        if (b.questionNumber) processItem(b);
                    });
                });

                group.summarySegments?.forEach(s => {
                    if (s.questionNumber) {
                        const existing = questionMap.get(s.questionNumber) || {};
                        questionMap.set(s.questionNumber, {
                            ...existing,
                            id: s.questionNumber,
                            questionNumber: s.questionNumber,
                            type: existing.type || qType,
                            text: existing.text || `Blank ${s.questionNumber}`,
                            marks: existing.marks || 1
                        });
                    }
                });

                if (group.questionSets) {
                    group.questionSets.forEach(qs => {
                        qs.questionNumbers?.forEach((num, index) => {
                            const existing = questionMap.get(num) || {};
                            questionMap.set(num, {
                                ...existing,
                                id: num,
                                questionNumber: num,
                                type: existing.type || qType,
                                text: existing.text || `Multiple Question ${num}`,
                                correctAnswer: qs.correctAnswers ? qs.correctAnswers[index] : existing.correctAnswer,
                                marks: 1
                            });
                        });
                    });
                }
            });
        }

        // Convert Map back to array and sort
        const allSectionQuestions = Array.from(questionMap.values()).sort((a, b) => a.questionNumber - b.questionNumber);

        return {
            id: section.sectionNumber || index + 1,
            title: section.title || `Passage ${index + 1}`,
            source: section.source || "",
            content: section.content || section.passage || "",
            questionGroups: section.questionGroups || [],
            questions: allSectionQuestions
        };
    });

    const currentPass = passages[currentPassage] || { questions: [], content: "" };
    const allQuestions = passages.flatMap(p => p.questions);

    // Show all questions for the current passage (usually 13-14)
    const currentQuestions = currentPass.questions || [];

    const totalQuestions = allQuestions.length;
    const answeredCount = allQuestions.filter(q => answers[q.questionNumber] && answers[q.questionNumber] !== '').length;
    const totalMarks = allQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);

    // Official IELTS Academic Reading Band Score Conversion
    const getBandScore = (rawScore) => {
        if (rawScore >= 39) return 9.0;
        if (rawScore >= 37) return 8.5;
        if (rawScore >= 35) return 8.0;
        if (rawScore >= 33) return 7.5;
        if (rawScore >= 30) return 7.0;
        if (rawScore >= 27) return 6.5;
        if (rawScore >= 23) return 6.0;
        if (rawScore >= 19) return 5.5;
        if (rawScore >= 15) return 5.0;
        if (rawScore >= 13) return 4.5;
        if (rawScore >= 10) return 4.0;
        if (rawScore >= 8) return 3.5;
        if (rawScore >= 6) return 3.0;
        if (rawScore >= 4) return 2.5;
        return 2.0;
    };

    // Timer
    useEffect(() => {
        if (showInstructions || isLoading) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [showInstructions, isLoading]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };




    const handleAnswer = (qId, value) => {
        setAnswers((prev) => ({ ...prev, [qId]: value }));
    };

    const goNext = () => {
        if (currentPassage < passages.length - 1) {
            setCurrentPassage((prev) => prev + 1);
            setCurrentQuestion(0);
        } else {
            setShowSubmitModal(true);
        }
    };

    const goPrev = () => {
        if (currentPassage > 0) {
            setCurrentPassage((prev) => prev - 1);
            setCurrentQuestion(0);
        }
    };

    // Focus a question — scroll to it & focus input only
    const focusQuestionElement = (qNum) => {
        setFocusedQuestion(qNum);
        const tpi = passages.findIndex(p => p.questions.some(q => q.questionNumber === qNum));
        if (tpi >= 0 && tpi !== currentPassage) setCurrentPassage(tpi);
        setTimeout(() => {
            const el = document.getElementById(`q-${qNum}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const inp = el.querySelector('input') || el.querySelector('select');
                if (inp) { inp.focus(); if (inp.select) inp.select(); }
            }
        }, 200);
    };

    // Per-question navigation (arrow buttons) — matches listening page
    const goNextQuestion = () => {
        if (focusedQuestion < totalQuestions) {
            focusQuestionElement(focusedQuestion + 1);
        }
    };
    const goPrevQuestion = () => {
        if (focusedQuestion > 1) {
            focusQuestionElement(focusedQuestion - 1);
        }
    };

    const calculateScore = () => {
        let score = 0;
        allQuestions.forEach(q => {
            const userAnswer = answers[q.questionNumber];
            if (userAnswer) {
                const normalizedUser = userAnswer.toString().trim().toLowerCase();
                const normalizedCorrect = q.correctAnswer?.toString().trim().toLowerCase();
                if (normalizedUser === normalizedCorrect) {
                    score += q.marks || 1;
                }
            }
        });
        return score;
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const score = calculateScore();
        const bandScore = getBandScore(score);

        // ═══ ADMIN PREVIEW: Show score popup, don't save to DB ═══
        if (isAdminPreview) {
            setIsSubmitting(false);
            setShowSubmitModal(false);
            setAdminScoreResult({ score, total: totalMarks, band: bandScore, answered: answeredCount });
            return;
        }

        // ═══ NORMAL STUDENT: Save to DB ═══
        const detailedAnswers = allQuestions.map(q => {
            const userAnswer = answers[q.questionNumber] || "";
            let studentAnswerForComparison = userAnswer.toString().trim();
            const qType = q.type || q.questionType || "";
            if ((qType === "multiple-choice" || qType === "mcq" || qType === "matching") && userAnswer) {
                const letterMatch = userAnswer.toString().match(/^([A-Za-z])\./);
                if (letterMatch) studentAnswerForComparison = letterMatch[1].toUpperCase();
            }
            return {
                questionNumber: q.questionNumber, questionText: q.text || q.questionText || "",
                questionType: qType || "fill-in-blank", studentAnswer: studentAnswerForComparison,
                studentAnswerFull: userAnswer, correctAnswer: q.correctAnswer, isCorrect: false
            };
        });

        const storedSession = localStorage.getItem("examSession");
        let sessionData = storedSession ? JSON.parse(storedSession) : session;
        const examId = sessionData?.examId || session?.examId;

        try {
            const currentSetNumber = sessionData?.currentSetNumber;
            const response = await studentsAPI.saveModuleScore(examId, "reading", {
                score, total: totalMarks, band: bandScore, answers: detailedAnswers, setNumber: currentSetNumber
            });
            if (response.success && sessionData) {
                sessionData.completedModules = response.data?.completedModules || [...(sessionData.completedModules || []), currentSetNumber ? `reading:${currentSetNumber}` : "reading"];
                sessionData.scores = response.data?.scores || { ...(sessionData.scores || {}), reading: { band: bandScore, raw: score, correctAnswers: score, totalQuestions: totalMarks } };
                localStorage.setItem("examSession", JSON.stringify(sessionData));
            }
        } catch (error) {
            console.error("Failed to save reading score:", error);
            if (sessionData) {
                const currentSetNumber = sessionData?.currentSetNumber;
                sessionData.completedModules = [...(sessionData.completedModules || []), currentSetNumber ? `reading:${currentSetNumber}` : "reading"];
                sessionData.scores = { ...(sessionData.scores || {}), reading: { band: bandScore, raw: score, correctAnswers: score, totalQuestions: totalMarks } };
                localStorage.setItem("examSession", JSON.stringify(sessionData));
            }
        }
        router.push(`/exam/${params.examId}`);
    };

    // answeredCount already defined above

    // Get question type label
    const getQuestionTypeLabel = (type) => {
        switch (type) {
            case "true-false-not-given":
            case "tfng":
                return "True/False/Not Given";
            case "yes-no-not-given":
                return "Yes/No/Not Given";
            case "multiple-choice":
            case "mcq":
                return "Multiple Choice";
            case "fill-in-blank":
            case "fill":
            case "sentence-completion":
            case "summary-completion":
                return "Sentence Completion";
            case "matching":
            case "matching-headings":
                return "Matching";
            default:
                return type;
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading reading test...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (loadError) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaTimes className="text-2xl text-red-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Cannot Load Test</h2>
                    <p className="text-gray-600 mb-4">{loadError}</p>
                    <button
                        onClick={() => router.push("/")}
                        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
                    >
                        Go to Home
                    </button>
                </div>
            </div>
        );
    }

    // Instructions Screen
    if (showInstructions) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', fontFamily: 'Arial, sans-serif' }}>
                <div style={{ maxWidth: '640px', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid #2563eb' }}>
                        <span style={{ color: '#dc2626', fontWeight: '900', fontSize: '28px' }}>IELTS</span>
                        <span style={{ color: '#6b7280', fontSize: '16px' }}>| Reading Test</span>
                    </div>

                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '16px' }}>Reading Test Instructions</h1>

                    <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                        <p style={{ color: '#374151', marginBottom: '12px' }}>
                            <strong>Set:</strong> {questionSet?.title || `Reading Set #${questionSet?.setNumber}`}
                        </p>
                        <p style={{ color: '#374151', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FaClock style={{ color: '#2563eb' }} />
                            <strong>Time:</strong> {questionSet?.duration || 60} minutes
                        </p>
                        <p style={{ color: '#374151', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FaBook style={{ color: '#2563eb' }} />
                            <strong>Questions:</strong> {totalQuestions} questions in {passages.length} passages
                        </p>
                        <p style={{ color: '#374151' }}>
                            <strong>Instructions:</strong> Read the passages and answer the questions.
                            You can move between questions and passages freely.
                        </p>
                    </div>

                    <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
                        <h3 style={{ fontWeight: '600', color: '#1e40af', marginBottom: '8px' }}>Question Types:</h3>
                        <ul style={{ color: '#1d4ed8', fontSize: '14px', listStyle: 'none', padding: 0, margin: 0 }}>
                            <li style={{ marginBottom: '4px' }}>• True/False/Not Given</li>
                            <li style={{ marginBottom: '4px' }}>• Multiple Choice</li>
                            <li style={{ marginBottom: '4px' }}>• Sentence Completion</li>
                            <li>• Matching</li>
                        </ul>
                    </div>

                    <button
                        onClick={() => setShowInstructions(false)}
                        style={{
                            width: '100%', backgroundColor: '#2563eb', color: 'white', padding: '16px',
                            borderRadius: '12px', fontWeight: 'bold', fontSize: '18px', border: 'none',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#2563eb'}
                    >
                        <FaPlay style={{ fontSize: '14px' }} />
                        <span>Start Reading Test</span>
                        <FaArrowRight style={{ fontSize: '14px' }} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'Arial, sans-serif', backgroundColor: cs.bg, color: cs.text }}>

            {/* Exam Security */}
            {!showInstructions && (
                <ExamSecurity
                    examId={session?.examId}
                    onViolationLimit={() => { handleSubmit(); }}
                />
            )}

            {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                TOP HEADER â€” Inspera IELTS Clone
            â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
            <header style={{ backgroundColor: cs.bg, borderBottom: `1px solid ${contrastMode === 'black-on-white' ? '#ccc' : '#555'}`, height: '56px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%', padding: '0 16px' }}>
                    {/* Left */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                        <span style={{ fontWeight: '900', color: '#cc0000', fontSize: '32px', letterSpacing: '-0.5px', fontFamily: 'Arial, sans-serif' }}>IELTS</span>
                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                            <span style={{ fontSize: '16px', fontWeight: '600', color: cs.text }}>Test taker ID</span>
                        </div>
                    </div>
                    {/* Right */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                        {/* WiFi */}
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={contrastMode === 'black-on-white' ? '#374151' : cs.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" />
                        </svg>
                        {/* Bell icon */}
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={contrastMode === 'black-on-white' ? '#374151' : cs.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        {/* Hamburger â†’ Options */}
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={contrastMode === 'black-on-white' ? '#374151' : cs.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: 'pointer' }} onClick={() => { setShowOptionsMenu(true); setOptionsView('main'); }}>
                            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </div>
                </div >
            </header >

            {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                PASSAGE BANNER â€” Inspera Style
            â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
            < div style={{ backgroundColor: cs.partBg, borderBottom: `1px solid ${cs.partBorder}`, padding: '8px 40px', flexShrink: 0, fontFamily: 'Arial, sans-serif' }
            }>
                <div style={{ fontWeight: 'bold', fontSize: `${15 * tScale}px`, color: cs.text, marginBottom: '2px' }}>
                    Part {currentPassage + 1}
                </div>
                <div style={{ fontSize: `${13 * tScale}px`, color: contrastMode === 'black-on-white' ? '#6b7280' : cs.text }}>
                    Read the text and answer questions {currentQuestions.length > 0 ? `${currentQuestions[0].questionNumber}–${currentQuestions[currentQuestions.length - 1].questionNumber}` : ''}.
                </div>
            </div >

            {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                MAIN CONTENT â€” Two Column Layout
            â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
            < div ref={containerRef} style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
                {/* LEFT: Passage Text */}
                < div style={{ width: `${splitPercent}%`, overflowY: 'auto', padding: '20px 30px', backgroundColor: cs.bg, color: cs.text, fontSize: `${16 * tScale}px`, fontFamily: 'Arial, sans-serif', flexShrink: 0 }}>
                    <h3 style={{ fontWeight: 'bold', fontSize: `${18 * tScale}px`, color: cs.text, marginBottom: '16px' }}>{currentPass.title}</h3>
                    {currentPass.source && <p style={{ fontSize: `${12 * tScale}px`, color: contrastMode === 'black-on-white' ? '#6b7280' : cs.text, marginBottom: '12px', fontStyle: 'italic' }}>{currentPass.source}</p>}
                    <TextHighlighter passageId={`reading_passage_${currentPassage}`} contrastMode={contrastMode}>
                        <div 
                            className="reading-passage-content"
                            style={{ color: cs.text, lineHeight: '1.8', fontSize: `${16 * tScale}px` }}
                            dangerouslySetInnerHTML={{ __html: formatPassageHtml(currentPass.content) }} 
                        />
                    </TextHighlighter>
                </div >

                {/* SPLITTER — draggable resize handle */}
                <div
                    onMouseDown={onSplitterMouseDown}
                    style={{
                        width: '18px', cursor: 'col-resize', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: contrastMode === 'black-on-white' ? '#e5e7eb' : '#444', flexShrink: 0, zIndex: 10,
                        borderLeft: `1px solid ${contrastMode === 'black-on-white' ? '#d1d5db' : '#555'}`,
                        borderRight: `1px solid ${contrastMode === 'black-on-white' ? '#d1d5db' : '#555'}`
                    }}
                >
                    <span style={{ fontSize: '22px', color: contrastMode === 'black-on-white' ? '#6b7280' : '#ccc', userSelect: 'none', fontWeight: 'bold', border: `1.5px solid ${contrastMode === 'black-on-white' ? '#9ca3af' : '#888'}`, borderRadius: '4px', padding: '2px 4px', lineHeight: '1', background: contrastMode === 'black-on-white' ? '#fff' : '#333' }}>↔</span>
                </div>

                {/* RIGHT: Questions */}
                < div style={{ flex: 1, overflowY: 'auto', padding: '20px 30px 250px 30px', backgroundColor: cs.bg, color: cs.text, fontSize: `${16 * tScale}px`, fontFamily: 'Arial, sans-serif' }}>
                    <TextHighlighter passageId={`reading_questions_${currentPassage}`} contrastMode={contrastMode}>
                        {currentPass.questionGroups && currentPass.questionGroups.length > 0 ? (
                            currentPass.questionGroups.map((group, gIdx) => (
                                <div key={gIdx} style={{ marginBottom: '24px' }}>

                                    {/* â”€â”€ NOTE COMPLETION â”€â”€ */}
                                    {(group.questionType === "note-completion" || group.groupType === "note-completion") && (
                                        <div style={{ marginBottom: '20px' }}>
                                            <div style={{ marginBottom: '12px' }}>
                                                <p style={{ color: cs.text, fontWeight: '500', marginBottom: '4px', fontSize: `${16 * tScale}px` }}>{group.instructions || group.mainInstruction}</p>
                                                <p style={{ color: cs.text, fontSize: `${13 * tScale}px`, fontStyle: 'italic' }}>
                                                    Choose <b>ONE WORD ONLY</b> from the passage for each answer.
                                                </p>
                                            </div>

                                            {group.mainHeading && <h3 style={{ fontWeight: 'bold', fontSize: `${17 * tScale}px`, color: cs.text, marginBottom: '12px', borderBottom: `2px solid ${contrastMode === 'black-on-white' ? '#dbeafe' : cs.text}`, paddingBottom: '6px' }}>{group.mainHeading}</h3>}

                                            {(group.passage || "").split('\n').map((line, lineIdx) => {
                                                const rawLine = line;
                                                const trimmedLine = line.trim();
                                                if (!trimmedLine) return <div key={lineIdx} style={{ height: '8px' }} />;
                                                const isBullet = trimmedLine.startsWith('•') || trimmedLine.startsWith('-');
                                                const hasBlank = trimmedLine.includes('__________');
                                                const isHeading = !isBullet && !hasBlank && trimmedLine.length < 100;

                                                const renderLine = (text) => {
                                                    const parts = text.split(/(\d+\s*__________)/g);
                                                    return parts.map((part, pIdx) => {
                                                        const match = part.match(/(\d+)\s*__________/);
                                                        if (match) {
                                                            const qNum = parseInt(match[1]);
                                                            const val = answers[qNum] || '';
                                                            return (
                                                                <span key={pIdx} id={`q-${qNum}`} style={{ display: 'inline-flex', alignItems: 'center', margin: '0 6px', verticalAlign: 'middle', position: 'relative', border: focusedQuestion === qNum ? '2.5px solid #2563eb' : `1.5px solid ${cs.text}`, background: 'transparent', width: '190px', height: '32px', justifyContent: 'center' }}>
                                                                    {!val && <span style={{ position: 'absolute', fontWeight: 'bold', fontSize: '15px', color: cs.text, pointerEvents: 'none', userSelect: 'none' }}>{qNum}</span>}
                                                                    <input type="text" value={val} onChange={e => handleAnswer(qNum, e.target.value)} autoComplete="off" style={{ border: 'none', width: '100%', height: '100%', fontSize: '15px', outline: 'none', background: 'transparent', color: cs.text, padding: '0 8px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }} />
                                                                </span>
                                                            );
                                                        }
                                                        return <span key={pIdx}>{part}</span>;
                                                    });
                                                };

                                                if (isHeading) return <h4 key={lineIdx} style={{ fontWeight: 'bold', color: cs.text, fontSize: `${15 * tScale}px`, marginTop: '16px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{trimmedLine}</h4>;
                                                if (isBullet) {
                                                    const bulletText = rawLine.replace(/^\s*[•\-]\s*/, '');
                                                    return <div key={lineIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginLeft: '20px', marginBottom: '4px' }}><span style={{ color: cs.text, marginTop: '4px', fontSize: '10px' }}>•</span><span style={{ flex: 1, color: cs.text, lineHeight: '1.6', fontWeight: '500', whiteSpace: 'pre-wrap' }}>{renderLine(bulletText)}</span></div>;
                                                }
                                                return <p key={lineIdx} style={{ color: cs.text, lineHeight: '1.6', marginBottom: '4px', marginLeft: '8px', whiteSpace: 'pre-wrap', fontFamily: rawLine.startsWith(' ') ? 'monospace' : 'inherit' }}>{renderLine(rawLine)}</p>;
                                            })}

                                            {!group.passage && group.notesSections?.map((section, sIdx) => (
                                                <div key={sIdx} style={{ marginTop: '12px' }}>
                                                    <h4 style={{ fontWeight: 'bold', color: cs.text, marginBottom: '8px' }}>{section.subHeading}</h4>
                                                    <div style={{ paddingLeft: '16px' }}>
                                                        {section.bullets?.map((bullet, bIdx) => (
                                                            <div key={bIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px', color: cs.text }}>
                                                                <span style={{ marginTop: '4px' }}>â€¢</span>
                                                                {bullet.type === "context" ? (
                                                                    <span>{bullet.text}</span>
                                                                ) : (
                                                                    <div id={`q-${bullet.questionNumber}`} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                                                                        <span>{bullet.textBefore}</span>
                                                                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative', border: focusedQuestion === bullet.questionNumber ? '2.5px solid #2563eb' : `1.5px solid ${cs.text}`, background: 'transparent', width: '190px', height: '32px' }}>
                                                                            {!(answers[bullet.questionNumber]) && <span style={{ position: 'absolute', fontWeight: 'bold', fontSize: '15px', color: cs.text, pointerEvents: 'none' }}>{bullet.questionNumber}</span>}
                                                                            <input type="text" value={answers[bullet.questionNumber] || ""} onChange={e => handleAnswer(bullet.questionNumber, e.target.value)} autoComplete="off" style={{ border: 'none', width: '100%', height: '100%', fontSize: '15px', outline: 'none', background: 'transparent', color: cs.text, padding: '0 8px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }} />
                                                                        </span>
                                                                        {bullet.textAfter && <span>{bullet.textAfter}</span>}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* â”€â”€ TRUE/FALSE/NOT GIVEN â”€â”€ */}
                                    {(group.questionType === "true-false-not-given" || group.groupType === "true-false-not-given" || group.questionType === "true-false-ng") && (
                                        <div style={{ marginBottom: '20px' }}>
                                            <div style={{ marginBottom: '12px' }}>
                                                <p style={{ color: cs.text, fontWeight: '500', marginBottom: '4px' }}>{group.instructions || group.mainInstruction}</p>
                                                {group.subInstruction && <p style={{ color: cs.text, fontSize: `${15 * tScale}px`, marginBottom: '8px', color: '#4b5563' }}>{group.subInstruction}</p>}
                                                <div style={{ padding: '12px', borderLeft: `4px solid ${contrastMode === 'black-on-white' ? '#d1d5db' : cs.text}`, fontSize: `${13 * tScale}px` }}>
                                                    <p><b>TRUE</b> if the statement agrees with the information</p>
                                                    <p><b>FALSE</b> if the statement contradicts the information</p>
                                                    <p><b>NOT GIVEN</b> if there is no information on this</p>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                {(group.statements || group.questions)?.map(stmt => (
                                                    <div key={stmt.questionNumber} id={`q-${stmt.questionNumber}`} style={{ paddingBottom: '12px', borderBottom: `1px solid ${contrastMode === 'black-on-white' ? '#f3f4f6' : '#333'}` }}>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                                                            <span style={{ border: focusedQuestion === stmt.questionNumber ? '2px solid #2563eb' : `1px solid ${cs.text}`, fontWeight: 'bold', fontSize: '12px', padding: '0 6px', color: focusedQuestion === stmt.questionNumber ? '#2563eb' : cs.text, background: cs.bg, lineHeight: '1.8', flexShrink: 0, borderRadius: '2px' }}>{stmt.questionNumber}</span>
                                                            <p style={{ color: cs.text, fontWeight: '500', lineHeight: '1.5' }}>{stmt.text || stmt.questionText}</p>
                                                        </div>
                                                        <div style={{ paddingLeft: '34px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                            {["TRUE", "FALSE", "NOT GIVEN"].map((opt, oIdx) => {
                                                                const letter = String.fromCharCode(65 + oIdx);
                                                                const isSel = answers[stmt.questionNumber] === opt;
                                                                return (
                                                                    <div key={opt} onClick={() => handleAnswer(stmt.questionNumber, opt)} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                                                        <span style={{ fontWeight: 'bold', width: '16px', flexShrink: 0, fontSize: '14px', color: cs.text }}>{letter}</span>
                                                                        <div style={{ width: '18px', height: '18px', border: `1px solid ${isSel ? '#1f2937' : '#d1d5db'}`, background: isSel ? '#1f2937' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
                                                                            {isSel && <div style={{ width: '6px', height: '6px', background: 'white', borderRadius: '50%' }} />}
                                                                        </div>
                                                                        <span style={{ color: cs.text, fontWeight: isSel ? '600' : '400', fontSize: '14px', textTransform: 'uppercase' }}>{opt}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* ── YES/NO/NOT GIVEN ── */}
                                    {(group.groupType === "yes-no-not-given") && (
                                        <div style={{ marginBottom: '20px' }}>
                                            <div style={{ marginBottom: '12px' }}>
                                                <p style={{ color: cs.text, fontWeight: '500', marginBottom: '4px' }}>{group.instructions || group.mainInstruction}</p>
                                                {group.subInstruction && <p style={{ color: cs.text, fontSize: `${15 * tScale}px`, marginBottom: '8px', color: '#4b5563' }}>{group.subInstruction}</p>}
                                                <div style={{ padding: '12px', borderLeft: `4px solid ${contrastMode === 'black-on-white' ? '#d1d5db' : cs.text}`, fontSize: `${13 * tScale}px` }}>
                                                    <p><b>YES</b> if the statement agrees with the views of the writer</p>
                                                    <p><b>NO</b> if the statement contradicts the views of the writer</p>
                                                    <p><b>NOT GIVEN</b> if it is impossible to say what the writer thinks about this</p>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                {(group.statements || group.questions)?.map(stmt => (
                                                    <div key={stmt.questionNumber} id={`q-${stmt.questionNumber}`} style={{ paddingBottom: '12px', borderBottom: `1px solid ${contrastMode === 'black-on-white' ? '#f3f4f6' : '#333'}` }}>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                                                            <span style={{ border: focusedQuestion === stmt.questionNumber ? '2px solid #2563eb' : `1px solid ${cs.text}`, fontWeight: 'bold', fontSize: '12px', padding: '0 6px', color: focusedQuestion === stmt.questionNumber ? '#2563eb' : cs.text, background: cs.bg, lineHeight: '1.8', flexShrink: 0, borderRadius: '2px' }}>{stmt.questionNumber}</span>
                                                            <p style={{ color: cs.text, fontWeight: '500', lineHeight: '1.5' }}>{stmt.text || stmt.questionText}</p>
                                                        </div>
                                                        <div style={{ paddingLeft: '34px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                            {["YES", "NO", "NOT GIVEN"].map((opt, oIdx) => {
                                                                const letter = String.fromCharCode(65 + oIdx);
                                                                const isSel = answers[stmt.questionNumber] === opt;
                                                                return (
                                                                    <div key={opt} onClick={() => handleAnswer(stmt.questionNumber, opt)} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                                                        <span style={{ fontWeight: 'bold', width: '16px', flexShrink: 0, fontSize: '14px', color: cs.text }}>{letter}</span>
                                                                        <div style={{ width: '18px', height: '18px', border: `1px solid ${isSel ? '#1f2937' : '#d1d5db'}`, background: isSel ? '#1f2937' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
                                                                            {isSel && <div style={{ width: '6px', height: '6px', background: 'white', borderRadius: '50%' }} />}
                                                                        </div>
                                                                        <span style={{ color: cs.text, fontWeight: isSel ? '600' : '400', fontSize: '14px', textTransform: 'uppercase' }}>{opt}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* â”€â”€ MATCHING â”€â”€ */}
                                    {(group.groupType === "matching-information" || group.groupType === "matching-features" || group.groupType === "matching-headings") && (
                                        <div style={{ marginBottom: '20px' }}>
                                            <p style={{ color: cs.text, marginBottom: '4px' }}>{group.mainInstruction}</p>
                                            <p style={{ color: cs.text, marginBottom: '8px' }}>{group.subInstruction}</p>
                                            {group.note && <p style={{ color: cs.text, fontSize: `${13 * tScale}px` }}><b>NB</b> <em>{group.note.replace('NB ', '')}</em></p>}

                                            {group.featureOptions?.length > 0 && (
                                                <div style={{ marginTop: '12px', marginBottom: '12px' }}>
                                                    <p style={{ fontWeight: 'bold', color: cs.text }}>{group.featureListTitle || "List of options"}</p>
                                                    {group.featureOptions.map(opt => (
                                                        <div key={opt.letter} style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '8px', color: cs.text }}>
                                                            <span style={{ fontWeight: 'bold', minWidth: '20px' }}>{opt.letter}</span>
                                                            <span>{opt.text}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Headings List for matching-headings */}
                                            {group.headingsList?.length > 0 && (
                                                <div style={{ marginTop: '12px', marginBottom: '16px', background: contrastMode === 'black-on-white' ? '#f8fafc' : '#1e293b', border: `1px solid ${contrastMode === 'black-on-white' ? '#e2e8f0' : '#334155'}`, borderRadius: '8px', padding: '16px' }}>
                                                    <p style={{ fontWeight: 'bold', color: cs.text, marginBottom: '8px', fontSize: `${15 * tScale}px` }}>List of Headings</p>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        {group.headingsList.map(h => (
                                                            <div key={h.numeral} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', paddingLeft: '8px' }}>
                                                                <span style={{ fontWeight: 'bold', color: cs.text, minWidth: '28px', fontSize: `${14 * tScale}px` }}>{h.numeral}.</span>
                                                                <span style={{ color: cs.text, fontSize: `${14 * tScale}px` }}>{h.text}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                                                {group.matchingItems?.map(item => (
                                                    <div key={item.questionNumber} id={`q-${item.questionNumber}`} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <span style={{ border: focusedQuestion === item.questionNumber ? '2px solid #2563eb' : `1px solid ${cs.text}`, fontWeight: 'bold', fontSize: '12px', padding: '0 6px', color: focusedQuestion === item.questionNumber ? '#2563eb' : cs.text, background: cs.bg, lineHeight: '1.8', flexShrink: 0, borderRadius: '2px' }}>{item.questionNumber}</span>
                                                        <span style={{ flex: 1, color: cs.text, fontSize: '15px' }}>{item.text}</span>
                                                        <select value={answers[item.questionNumber] || ""} onChange={e => handleAnswer(item.questionNumber, e.target.value)} style={{ border: `1px solid ${cs.text}`, padding: '4px 8px', fontSize: '14px', background: cs.bg, color: cs.text, cursor: 'pointer', width: '70px', textAlign: 'center', borderRadius: '2px' }}>
                                                            <option value="">--</option>
                                                            {group.paragraphOptions?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                        </select>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* ── SHORT ANSWER ── */}
                                    {group.groupType === "short-answer" && (
                                        <div style={{ marginBottom: '20px' }}>
                                            <p style={{ color: cs.text, marginBottom: '4px' }}>{group.mainInstruction}</p>
                                            <p style={{ color: cs.text, marginBottom: '12px' }}>{group.subInstruction}</p>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                {(group.questions || []).map(q => (
                                                    <div key={q.questionNumber} id={`q-${q.questionNumber}`} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                                            <span style={{ border: focusedQuestion === q.questionNumber ? '2px solid #2563eb' : `1px solid ${cs.text}`, fontWeight: 'bold', fontSize: '12px', padding: '0 6px', color: focusedQuestion === q.questionNumber ? '#2563eb' : cs.text, background: cs.bg, lineHeight: '1.8', flexShrink: 0, borderRadius: '2px', marginTop: '2px' }}>{q.questionNumber}</span>
                                                            <span style={{ color: cs.text, fontSize: '15px', lineHeight: '1.5' }}>{q.questionText}</span>
                                                        </div>
                                                        <div style={{ paddingLeft: '32px' }}>
                                                            <input type="text" value={answers[q.questionNumber] || ""} onChange={e => handleAnswer(q.questionNumber, e.target.value)} autoComplete="off" style={{ border: 'none', borderBottom: `2px solid ${focusedQuestion === q.questionNumber ? '#2563eb' : cs.text}`, width: '250px', background: 'transparent', outline: 'none', color: cs.text, fontSize: '15px', padding: '4px 8px' }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* â”€â”€ SUMMARY COMPLETION â”€â”€ */}
                                    {group.groupType === "summary-completion" && (
                                        <div style={{ marginBottom: '20px' }}>
                                            <p style={{ color: cs.text, fontStyle: 'italic', marginBottom: '4px' }}>{group.mainInstruction}</p>
                                            <p style={{ color: cs.text, marginBottom: '8px' }}>Choose <b>ONE WORD ONLY</b> from the passage for each answer.</p>
                                            <h3 style={{ fontWeight: 'bold', fontSize: `${17 * tScale}px`, color: cs.text, marginTop: '12px' }}>{group.mainHeading}</h3>
                                            <div style={{ color: cs.text, lineHeight: '1.8', marginTop: '8px' }}>
                                                {group.summarySegments?.map((segment, sIdx) => (
                                                    segment.type === "text" ? <span key={sIdx}>{segment.content} </span> : (
                                                        <span key={sIdx} id={`q-${segment.questionNumber}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '0 6px', verticalAlign: 'middle', position: 'relative', border: focusedQuestion === segment.questionNumber ? '2.5px solid #2563eb' : `1.5px solid ${cs.text}`, background: 'transparent', width: '190px', height: '32px' }}>
                                                            {!(answers[segment.questionNumber]) && <span style={{ position: 'absolute', fontWeight: 'bold', fontSize: '15px', color: cs.text, pointerEvents: 'none' }}>{segment.questionNumber}</span>}
                                                            <input type="text" value={answers[segment.questionNumber] || ""} onChange={e => handleAnswer(segment.questionNumber, e.target.value)} autoComplete="off" style={{ border: 'none', width: '100%', height: '100%', fontSize: '15px', outline: 'none', background: 'transparent', color: cs.text, padding: '0 8px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }} />
                                                        </span>
                                                    )
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* â”€â”€ CHOOSE TWO LETTERS â”€â”€ */}
                                    {group.groupType === "choose-two-letters" && (
                                        <div style={{ marginBottom: '20px' }}>
                                            <p style={{ color: cs.text, fontStyle: 'italic', marginBottom: '12px' }}>{group.mainInstruction}</p>
                                            {group.questionSets?.map((qSet, qsIdx) => (
                                                <div key={qsIdx} style={{ marginTop: '12px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                                                        {qSet.questionNumbers?.map(qNum => (
                                                            <span key={qNum} id={`q-${qNum}`} style={{ border: focusedQuestion === qNum ? '2px solid #2563eb' : `1px solid ${cs.text}`, fontWeight: 'bold', fontSize: '12px', padding: '0 6px', color: focusedQuestion === qNum ? '#2563eb' : cs.text, background: cs.bg, lineHeight: '1.8', borderRadius: '2px' }}>{qNum}</span>
                                                        ))}
                                                        <span style={{ color: cs.text, fontSize: '15px' }}>{qSet.questionText}</span>
                                                    </div>
                                                    <div style={{ marginLeft: '24px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        {qSet.options?.map(opt => {
                                                            const isSel = qSet.questionNumbers?.some(qNum => answers[qNum] === opt.letter);
                                                            return (
                                                                <div key={opt.letter} onClick={() => { const emp = qSet.questionNumbers?.find(qNum => !answers[qNum] || answers[qNum] === opt.letter); if (emp) { answers[emp] === opt.letter ? handleAnswer(emp, "") : handleAnswer(emp, opt.letter); } }} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                                                    <span style={{ fontWeight: 'bold', color: cs.text, width: '16px' }}>{opt.letter}</span>
                                                                    <div style={{ width: '18px', height: '18px', border: `1px solid ${isSel ? '#1f2937' : '#d1d5db'}`, background: isSel ? '#1f2937' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '3px' }}>
                                                                        {isSel && <svg width="10" height="10" viewBox="0 0 12 12"><path d="M2 6l3 3 5-6" stroke="white" strokeWidth="2" fill="none" /></svg>}
                                                                    </div>
                                                                    <span style={{ color: cs.text, fontWeight: isSel ? '600' : '400', fontSize: '14px' }}>{opt.text}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* ── CUSTOM PURE CSS FLOWCHART FOR MOCK 01 ── */}
                                    {(group.groupType === "custom-flowchart-1" || group.groupType === "diagram-labeling") && (
                                        <div style={{ marginBottom: '20px' }}>
                                            <div style={{ marginBottom: '16px' }}>
                                                <p style={{ color: cs.text, fontWeight: '500', marginBottom: '4px', fontSize: `${16 * tScale}px` }}>{group.instructions || group.mainInstruction}</p>
                                                {group.subInstruction && <p style={{ color: cs.text, fontSize: `${14 * tScale}px`, marginBottom: '16px', opacity: 0.9 }}>{group.subInstruction}</p>}
                                            </div>

                                            {/* CSS Flowchart Container */}
                                            <div style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: '20px', background: contrastMode === 'black-on-white' ? '#f8fafc' : '#1e293b', borderRadius: '8px', border: `1px solid ${contrastMode === 'black-on-white' ? '#e2e8f0' : '#334155'}` }}>
                                                <div style={{ position: 'relative', width: '600px', fontFamily: '"Arial", sans-serif' }}>
                                                    
                                                    {/* ROW 1 */}
                                                    <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                                                        <div style={{ border: `2px solid ${cs.text}`, padding: '8px 40px', fontWeight: 'bold', fontSize: '15px', color: cs.text, background: cs.bg }}>
                                                            productive land
                                                        </div>
                                                        {/* Arrow connecting multiple causes */}
                                                        <svg style={{ position: 'absolute', right: '40px', top: '10px', width: '50px', height: '40px' }} viewBox="0 0 50 40">
                                                            <path d="M 50 40 Q 20 40 5 15" fill="none" stroke={cs.text} strokeWidth="2" />
                                                            <polygon points="5,15 12,20 0,25" fill={cs.text} transform="rotate(25 5 15) translate(-2, -8)" />
                                                        </svg>
                                                        <div style={{ position: 'absolute', right: '-10px', top: '40px', border: `2px solid ${cs.text}`, padding: '4px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold', color: cs.text }}>
                                                            multiple<br/>causes
                                                        </div>
                                                    </div>

                                                    {/* ROW 1 TO 2 ARROW */}
                                                    <div style={{ display: 'flex', justifyContent: 'center', height: '30px' }}>
                                                        <div style={{ width: '4px', background: cs.text, height: '100%', position: 'relative' }}>
                                                            <div style={{ position: 'absolute', bottom: '-2px', left: '-5px', width: '0', height: '0', borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: `10px solid ${cs.text}` }}></div>
                                                        </div>
                                                    </div>

                                                    {/* ROW 2 */}
                                                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '5px' }}>
                                                        <div style={{ border: `2px dashed ${cs.text}`, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '8px', background: contrastMode === 'black-on-white' ? '#ffffff' : '#0f172a' }}>
                                                            <span style={{ fontWeight: 'bold', fontSize: '14px', color: cs.text }}>degradation proceeds at</span>
                                                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                                                <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontWeight: 'bold', fontSize: '12px', color: '#6b7280', pointerEvents: 'none' }}>{!answers[27] ? '27' : ''}</span>
                                                                <input id="q-27" type="text" value={answers[27] || ''} onChange={e => handleAnswer(27, e.target.value)} onFocus={() => { setFocusedQuestion(27); setFocusedGroup(gIdx); }} autoComplete="off" style={{ width: '120px', height: '24px', borderBottom: `1px dotted ${cs.text}`, borderTop: 'none', borderLeft: 'none', borderRight: 'none', background: 'transparent', textAlign: 'center', fontSize: '14px', color: cs.text, outline: 'none' }} />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* ROW 2 TO 3 ARROW */}
                                                    <div style={{ display: 'flex', justifyContent: 'center', height: '30px' }}>
                                                        <div style={{ width: '4px', background: cs.text, height: '100%', position: 'relative' }}>
                                                            <div style={{ position: 'absolute', bottom: '-2px', left: '-5px', width: '0', height: '0', borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: `10px solid ${cs.text}` }}></div>
                                                        </div>
                                                    </div>

                                                    {/* ROW 3 */}
                                                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '5px' }}>
                                                        <div style={{ border: `2px solid ${cs.text}`, padding: '15px 120px', fontWeight: 'bold', fontSize: '20px', color: cs.text, background: cs.bg }}>
                                                            DESERTIFICATION
                                                        </div>
                                                    </div>

                                                    {/* ROW 3 TO 4 ARROWS (SPLIT) */}
                                                    <div style={{ position: 'relative', height: '50px', width: '100%', marginTop: '5px' }}>
                                                        <div style={{ position: 'absolute', left: '20%', top: '0', width: '4px', background: cs.text, height: '100%' }}>
                                                            <div style={{ position: 'absolute', bottom: '-2px', left: '-5px', width: '0', height: '0', borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: `10px solid ${cs.text}` }}></div>
                                                        </div>
                                                        <div style={{ position: 'absolute', right: '20%', top: '0', width: '4px', background: cs.text, height: '100%' }}>
                                                            <div style={{ position: 'absolute', bottom: '-2px', left: '-5px', width: '0', height: '0', borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: `10px solid ${cs.text}` }}></div>
                                                        </div>
                                                    </div>

                                                    {/* ROW 4 */}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 40px', marginTop: '5px' }}>
                                                        <div style={{ border: `2px dashed ${cs.text}`, padding: '12px', width: '220px', background: contrastMode === 'black-on-white' ? '#ffffff' : '#0f172a' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                                <div style={{ position: 'relative', width: '100%' }}>
                                                                    <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontWeight: 'bold', fontSize: '12px', color: '#6b7280', pointerEvents: 'none' }}>{!answers[28] ? '28' : ''}</span>
                                                                    <input id="q-28" type="text" value={answers[28] || ''} onChange={e => handleAnswer(28, e.target.value)} onFocus={() => { setFocusedQuestion(28); setFocusedGroup(gIdx); }} autoComplete="off" style={{ width: '100%', height: '24px', borderBottom: `1px dotted ${cs.text}`, borderTop: 'none', borderLeft: 'none', borderRight: 'none', background: 'transparent', textAlign: 'center', fontSize: '14px', color: cs.text, outline: 'none' }} />
                                                                </div>
                                                            </div>
                                                            <div style={{ fontWeight: 'bold', fontSize: '14px', textAlign: 'center', color: cs.text }}>a climate trend</div>
                                                        </div>
                                                        <div style={{ border: `2px dashed ${cs.text}`, padding: '12px', width: '220px', background: contrastMode === 'black-on-white' ? '#ffffff' : '#0f172a' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                                <div style={{ position: 'relative', width: '100%' }}>
                                                                    <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontWeight: 'bold', fontSize: '12px', color: '#6b7280', pointerEvents: 'none' }}>{!answers[29] ? '29' : ''}</span>
                                                                    <input id="q-29" type="text" value={answers[29] || ''} onChange={e => handleAnswer(29, e.target.value)} onFocus={() => { setFocusedQuestion(29); setFocusedGroup(gIdx); }} autoComplete="off" style={{ width: '100%', height: '24px', borderBottom: `1px dotted ${cs.text}`, borderTop: 'none', borderLeft: 'none', borderRight: 'none', background: 'transparent', textAlign: 'center', fontSize: '14px', color: cs.text, outline: 'none' }} />
                                                                </div>
                                                            </div>
                                                            <div style={{ fontWeight: 'bold', fontSize: '14px', textAlign: 'center', color: cs.text }}>a change in climate</div>
                                                        </div>
                                                    </div>

                                                    {/* ROW 4 TO 5 ARROWS */}
                                                    <div style={{ position: 'relative', height: '40px', width: '100%', marginTop: '5px' }}>
                                                        <div style={{ position: 'absolute', left: '20%', top: '0', width: '4px', background: cs.text, height: '100%' }}>
                                                            <div style={{ position: 'absolute', bottom: '-2px', left: '-5px', width: '0', height: '0', borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: `10px solid ${cs.text}` }}></div>
                                                        </div>
                                                        <div style={{ position: 'absolute', right: '20%', top: '0', width: '4px', background: cs.text, height: '100%' }}>
                                                            <div style={{ position: 'absolute', bottom: '-2px', left: '-5px', width: '0', height: '0', borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: `10px solid ${cs.text}` }}></div>
                                                        </div>
                                                    </div>

                                                    {/* ROW 5 */}
                                                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '5px' }}>
                                                        <div style={{ border: `2px solid ${cs.text}`, padding: '12px 20px', width: '480px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', background: cs.bg }}>
                                                            <span style={{ fontWeight: 'bold', fontSize: '14px', color: cs.text, paddingLeft: '10px' }}>resulting in greater</span>
                                                            <div style={{ position: 'relative', display: 'inline-block', flex: 1 }}>
                                                                <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontWeight: 'bold', fontSize: '12px', color: '#6b7280', pointerEvents: 'none' }}>{!answers[30] ? '30' : ''}</span>
                                                                <input id="q-30" type="text" value={answers[30] || ''} onChange={e => handleAnswer(30, e.target.value)} onFocus={() => { setFocusedQuestion(30); setFocusedGroup(gIdx); }} autoComplete="off" style={{ width: '80%', height: '24px', borderBottom: `1px dotted ${cs.text}`, borderTop: 'none', borderLeft: 'none', borderRight: 'none', background: 'transparent', textAlign: 'center', fontSize: '14px', color: cs.text, outline: 'none' }} />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* ROW 5 TO 6 ARROWS */}
                                                    <div style={{ position: 'relative', height: '30px', width: '100%', marginTop: '5px' }}>
                                                        <div style={{ position: 'absolute', left: '30%', top: '0', width: '4px', background: cs.text, height: '100%' }}>
                                                            <div style={{ position: 'absolute', bottom: '-2px', left: '-5px', width: '0', height: '0', borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: `10px solid ${cs.text}` }}></div>
                                                        </div>
                                                        <div style={{ position: 'absolute', right: '30%', top: '0', width: '4px', background: cs.text, height: '100%' }}>
                                                            <div style={{ position: 'absolute', bottom: '-2px', left: '-5px', width: '0', height: '0', borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: `10px solid ${cs.text}` }}></div>
                                                        </div>
                                                    </div>

                                                    {/* ROW 6 */}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 80px', marginTop: '5px' }}>
                                                        <div style={{ border: `2px solid ${cs.text}`, padding: '10px', width: '200px', background: cs.bg }}>
                                                            <div style={{ fontWeight: 'bold', fontSize: '13px', textAlign: 'center', color: cs.text, marginBottom: '6px' }}>depletion of</div>
                                                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                                <div style={{ position: 'relative', width: '80%' }}>
                                                                    <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontWeight: 'bold', fontSize: '12px', color: '#6b7280', pointerEvents: 'none' }}>{!answers[31] ? '31' : ''}</span>
                                                                    <input id="q-31" type="text" value={answers[31] || ''} onChange={e => handleAnswer(31, e.target.value)} onFocus={() => { setFocusedQuestion(31); setFocusedGroup(gIdx); }} autoComplete="off" style={{ width: '100%', height: '24px', borderBottom: `1px dotted ${cs.text}`, borderTop: 'none', borderLeft: 'none', borderRight: 'none', background: 'transparent', textAlign: 'center', fontSize: '14px', color: cs.text, outline: 'none' }} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div style={{ border: `2px solid ${cs.text}`, padding: '10px', width: '200px', background: cs.bg }}>
                                                            <div style={{ fontWeight: 'bold', fontSize: '13px', textAlign: 'center', color: cs.text, marginBottom: '6px' }}>depletion of</div>
                                                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                                <div style={{ position: 'relative', width: '80%' }}>
                                                                    <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontWeight: 'bold', fontSize: '12px', color: '#6b7280', pointerEvents: 'none' }}>{!answers[32] ? '32' : ''}</span>
                                                                    <input id="q-32" type="text" value={answers[32] || ''} onChange={e => handleAnswer(32, e.target.value)} onFocus={() => { setFocusedQuestion(32); setFocusedGroup(gIdx); }} autoComplete="off" style={{ width: '100%', height: '24px', borderBottom: `1px dotted ${cs.text}`, borderTop: 'none', borderLeft: 'none', borderRight: 'none', background: 'transparent', textAlign: 'center', fontSize: '14px', color: cs.text, outline: 'none' }} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* â”€â”€ SUMMARY WITH OPTIONS â”€â”€ */}
                                    {group.groupType === "summary-with-options" && (
                                        <div style={{ marginBottom: '20px' }}>
                                            <p style={{ color: cs.text, marginBottom: '4px' }}>{group.mainInstruction}</p>
                                            <p style={{ color: cs.text, marginBottom: '8px' }}>{group.subInstruction}</p>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 32px', marginTop: '8px' }}>
                                                {group.phraseList?.map(phrase => (
                                                    <div key={phrase.letter} style={{ color: cs.text }}><b>{phrase.letter}</b> {phrase.text}</div>
                                                ))}
                                            </div>
                                            <h3 style={{ fontWeight: 'bold', fontSize: `${17 * tScale}px`, color: cs.text, marginTop: '16px' }}>{group.mainHeading}</h3>
                                            <div style={{ color: cs.text, lineHeight: '1.8', marginTop: '8px' }}>
                                                {group.summarySegments?.map((segment, sIdx) => (
                                                    segment.type === "text" ? <span key={sIdx}>{segment.content} </span> : (
                                                        <span key={sIdx} id={`q-${segment.questionNumber}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', margin: '0 4px' }}>
                                                            <select value={answers[segment.questionNumber] || ""} onChange={e => handleAnswer(segment.questionNumber, e.target.value)} style={{ border: `1px solid ${cs.text}`, padding: '4px 8px', fontSize: '14px', background: cs.bg, color: cs.text, cursor: 'pointer', width: '70px', textAlign: 'center', borderRadius: '2px' }}>
                                                                <option value="">--</option>
                                                                {group.phraseList?.map(phrase => <option key={phrase.letter} value={phrase.letter}>{phrase.letter}</option>)}
                                                            </select>
                                                        </span>
                                                    )
                                                ))}
                                            </div>

                                            {/* Fallback: render statements with dropdowns for summary-with-options */}
                                            {!group.summarySegments?.length && group.statements?.length > 0 && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                                                    {group.statements.map(stmt => (
                                                        <div key={stmt.questionNumber} id={`q-${stmt.questionNumber}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                                            <span style={{ border: focusedQuestion === stmt.questionNumber ? '2px solid #2563eb' : `1px solid ${cs.text}`, fontWeight: 'bold', fontSize: '12px', padding: '0 6px', color: focusedQuestion === stmt.questionNumber ? '#2563eb' : cs.text, background: cs.bg, lineHeight: '1.8', flexShrink: 0, borderRadius: '2px', marginTop: '2px' }}>{stmt.questionNumber}</span>
                                                            <span style={{ flex: 1, color: cs.text, fontSize: '15px', lineHeight: '1.6' }}>
                                                                {(stmt.text || '').split(/_{3,}/).map((part, pIdx, arr) => (
                                                                    <span key={pIdx}>
                                                                        {part}
                                                                        {pIdx < arr.length - 1 && (
                                                                            <select value={answers[stmt.questionNumber] || ""} onChange={e => handleAnswer(stmt.questionNumber, e.target.value)} style={{ border: `1px solid ${cs.text}`, padding: '4px 8px', fontSize: '14px', background: cs.bg, color: cs.text, cursor: 'pointer', width: '70px', textAlign: 'center', borderRadius: '2px', margin: '0 4px' }}>
                                                                                <option value="">--</option>
                                                                                {group.phraseList?.map(phrase => <option key={phrase.letter} value={phrase.letter}>{phrase.letter}</option>)}
                                                                            </select>
                                                                        )}
                                                                    </span>
                                                                ))}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* â”€â”€ YES/NO/NOT GIVEN â”€â”€ */}



                                    {/* â”€â”€ MULTIPLE CHOICE FULL â”€â”€ */}
                                    {group.groupType === "multiple-choice-full" && (
                                        <div style={{ marginBottom: '20px' }}>
                                            <p style={{ color: cs.text, fontStyle: 'italic', marginBottom: '4px' }}>{group.mainInstruction}</p>
                                            <p style={{ color: cs.text, marginBottom: '12px' }}>{group.subInstruction}</p>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                {group.mcQuestions?.map(mcQ => (
                                                    <div key={mcQ.questionNumber} id={`q-${mcQ.questionNumber}`}>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                                                            <span style={{ border: focusedQuestion === mcQ.questionNumber ? '2px solid #2563eb' : `1px solid ${cs.text}`, fontWeight: 'bold', fontSize: '12px', padding: '0 6px', color: focusedQuestion === mcQ.questionNumber ? '#2563eb' : cs.text, background: cs.bg, lineHeight: '1.8', borderRadius: '2px' }}>{mcQ.questionNumber}</span>
                                                            <span style={{ color: cs.text, fontWeight: '500' }}>{mcQ.questionText}</span>
                                                        </div>
                                                        <div style={{ marginLeft: '32px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                            {mcQ.options?.map(opt => {
                                                                const isSel = answers[mcQ.questionNumber] === opt.letter;
                                                                return (
                                                                    <div key={opt.letter} onClick={() => handleAnswer(mcQ.questionNumber, opt.letter)} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                                                                        <span style={{ fontWeight: 'bold', width: '16px', color: cs.text, marginTop: '1px' }}>{opt.letter}</span>
                                                                        <div style={{ width: '18px', height: '18px', border: `2px solid ${isSel ? '#1f2937' : '#d1d5db'}`, background: isSel ? '#1f2937' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', flexShrink: 0, marginTop: '1px' }}>
                                                                            {isSel && <div style={{ width: '6px', height: '6px', background: 'white', borderRadius: '50%' }} />}
                                                                        </div>
                                                                        <span style={{ color: cs.text, fontWeight: isSel ? '600' : '400', fontSize: '14px' }}>{opt.text}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* â”€â”€ SHORT ANSWER â”€â”€ */}
                                    {(group.questionType === "short-answer" || group.groupType === "short-answer") && (
                                        <div style={{ marginBottom: '20px' }}>
                                            <p style={{ color: cs.text, fontWeight: '500', marginBottom: '4px' }}>{group.mainInstruction}</p>
                                            {group.subInstruction && <p style={{ color: cs.text, fontSize: `${13 * tScale}px`, fontStyle: 'italic', marginBottom: '8px' }}>{group.subInstruction}</p>}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {group.statements?.map(stmt => (
                                                    <div key={stmt.questionNumber} id={`q-${stmt.questionNumber}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                                        <span style={{ color: cs.text, fontWeight: '500', flex: 1 }}>{stmt.text}</span>
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative', border: `1.5px solid ${cs.text}`, background: 'transparent', width: '190px', height: '32px', flexShrink: 0 }}>
                                                            {!(answers[stmt.questionNumber]) && <span style={{ position: 'absolute', fontWeight: 'bold', fontSize: '15px', color: cs.text, pointerEvents: 'none' }}>{stmt.questionNumber}</span>}
                                                            <input type="text" value={answers[stmt.questionNumber] || ""} onChange={e => handleAnswer(stmt.questionNumber, e.target.value)} autoComplete="off" style={{ border: 'none', width: '100%', height: '100%', fontSize: '15px', outline: 'none', background: 'transparent', color: cs.text, padding: '0 8px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }} />
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* â”€â”€ SENTENCE COMPLETION â”€â”€ */}
                                    {(group.questionType === "sentence-completion" || group.groupType === "sentence-completion") && (
                                        <div style={{ marginBottom: '20px' }}>
                                            <p style={{ color: cs.text, fontWeight: '500', marginBottom: '4px' }}>{group.mainInstruction}</p>
                                            {group.subInstruction && <p style={{ color: cs.text, fontSize: `${13 * tScale}px`, fontStyle: 'italic', marginBottom: '8px' }}>{group.subInstruction}</p>}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {group.statements?.map(stmt => (
                                                    <div key={stmt.questionNumber} id={`q-${stmt.questionNumber}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                        {stmt.text?.includes('_________') ? (
                                                            stmt.text.split('_________').map((part, pIdx, arr) => (
                                                                <React.Fragment key={pIdx}>
                                                                    <span style={{ color: cs.text }}>{part}</span>
                                                                    {pIdx < arr.length - 1 && (
                                                                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative', border: `1.5px solid ${cs.text}`, background: 'transparent', width: '190px', height: '32px' }}>
                                                                            {!(answers[stmt.questionNumber]) && <span style={{ position: 'absolute', fontWeight: 'bold', fontSize: '15px', color: cs.text, pointerEvents: 'none' }}>{stmt.questionNumber}</span>}
                                                                            <input type="text" value={answers[stmt.questionNumber] || ""} onChange={e => handleAnswer(stmt.questionNumber, e.target.value)} autoComplete="off" style={{ border: 'none', width: '100%', height: '100%', fontSize: '15px', outline: 'none', background: 'transparent', color: cs.text, padding: '0 8px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }} />
                                                                        </span>
                                                                    )}
                                                                </React.Fragment>
                                                            ))
                                                        ) : (
                                                            <>
                                                                <span style={{ color: cs.text, flex: 1 }}>{stmt.text}</span>
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative', border: `1.5px solid ${cs.text}`, background: 'transparent', width: '190px', height: '32px', flexShrink: 0 }}>
                                                                    {!(answers[stmt.questionNumber]) && <span style={{ position: 'absolute', fontWeight: 'bold', fontSize: '15px', color: cs.text, pointerEvents: 'none' }}>{stmt.questionNumber}</span>}
                                                                    <input type="text" value={answers[stmt.questionNumber] || ""} onChange={e => handleAnswer(stmt.questionNumber, e.target.value)} autoComplete="off" style={{ border: 'none', width: '100%', height: '100%', fontSize: '15px', outline: 'none', background: 'transparent', color: cs.text, padding: '0 8px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }} />
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                </div>
                            ))
                        ) : null}
                    </TextHighlighter>
                </div >
            </div >

            {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                FLOATING NAV ARROWS
            â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
            < div style={{ position: 'fixed', bottom: '140px', right: '16px', display: 'flex', gap: '4px', zIndex: 99 }}>
                <button onClick={goPrevQuestion} disabled={focusedQuestion <= 1} style={{ width: '56px', height: '56px', cursor: focusedQuestion <= 1 ? 'not-allowed' : 'pointer', background: focusedQuestion <= 1 ? '#c8c8c8' : '#4a4a4a', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '3px' }}>
                    <FaArrowLeft size={24} />
                </button>
                <button onClick={goNextQuestion} disabled={focusedQuestion >= totalQuestions} style={{ width: '56px', height: '56px', cursor: focusedQuestion >= totalQuestions ? 'not-allowed' : 'pointer', background: focusedQuestion >= totalQuestions ? '#c8c8c8' : '#1a1a1a', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '3px' }}>
                    <FaArrowRight size={24} />
                </button>
            </div >

            {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                BOTTOM NAV â€” Inspera Clone
            â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                background: cs.bg,
                display: 'flex', alignItems: 'center',
                height: '44px', padding: '0', zIndex: 100
            }}>
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, height: '100%' }}>
                    {passages.map((pass, pIdx) => {
                        const isActivePassage = pIdx === currentPassage;
                        const passageQuestions = pass.questions || [];
                        const passageAnswered = passageQuestions.filter(q => answers[q.questionNumber] && answers[q.questionNumber] !== '').length;

                        return (
                            <div key={pIdx} style={{
                                flex: 1, display: 'flex', alignItems: 'center',
                                gap: '6px', height: '100%', padding: '0 12px',
                                cursor: 'pointer', borderRadius: '4px', overflow: 'hidden'
                            }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f0f0f0'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                onClick={() => {
                                    setCurrentPassage(pIdx);
                                    const fq = passageQuestions[0]?.questionNumber || 1;
                                    setFocusedQuestion(fq);
                                }}
                            >
                                {/* Part label */}
                                <span style={{
                                    fontSize: '14px', fontWeight: 'bold', color: isActivePassage ? cs.text : '#888',
                                    fontFamily: 'Arial, sans-serif', whiteSpace: 'nowrap', flexShrink: 0
                                }}>
                                    Part {pIdx + 1}
                                </span>

                                {/* Active: question numbers | Inactive: answered count */}
                                {isActivePassage ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexWrap: 'nowrap' }}>
                                        {passageQuestions.map(q => {
                                            const isAnswered = answers[q.questionNumber] && answers[q.questionNumber] !== '';
                                            const isFocused = focusedQuestion === q.questionNumber;
                                            return (
                                                <div key={q.questionNumber}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        focusQuestionElement(q.questionNumber);
                                                    }}
                                                    style={{
                                                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <div style={{ width: '18px', height: '3px', background: isAnswered ? '#2563eb' : '#c0c0c0', marginBottom: '3px', borderRadius: '1px' }}></div>
                                                    <span style={{
                                                        fontSize: '14px', fontWeight: '400',
                                                        color: cs.text,
                                                        fontFamily: 'Arial, sans-serif',
                                                        padding: '2px 3px',
                                                        border: isFocused ? '1.5px solid #2563eb' : '1.5px solid transparent',
                                                        borderRadius: '3px',
                                                        lineHeight: '1'
                                                    }}>
                                                        {q.questionNumber}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <span style={{
                                        fontSize: '13px', fontWeight: '400', color: '#aaa',
                                        fontFamily: 'Arial, sans-serif', whiteSpace: 'nowrap'
                                    }}>
                                        {passageAnswered} of {passageQuestions.length}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Submit checkmark button — fixed bottom-right */}
                <button
                    onClick={() => setShowSubmitModal(true)}
                    onMouseEnter={e => e.currentTarget.style.background = '#c8c8c8'}
                    onMouseLeave={e => e.currentTarget.style.background = '#e5e7eb'}
                    style={{
                        width: '48px', height: '44px', cursor: 'pointer',
                        background: '#e5e7eb', border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, borderRadius: 0
                    }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                </button>
            </div>
            {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                SUBMIT MODAL
            â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
            {
                showSubmitModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '16px' }}>
                        <div style={{ background: 'white', padding: '24px', maxWidth: '360px', width: '100%', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ fontWeight: 'bold', fontSize: '16px', color: '#1f2937' }}>Submit Reading Test?</h3>
                                <button onClick={() => setShowSubmitModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#6b7280' }}><FaTimes /></button>
                            </div>
                            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', padding: '16px', marginBottom: '16px', textAlign: 'center' }}>
                                <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937' }}>{answeredCount}<span style={{ fontSize: '18px', color: '#9ca3af' }}>/{totalQuestions}</span></p>
                                <p style={{ color: '#6b7280', fontSize: '13px', marginTop: '4px' }}>questions answered</p>
                            </div>
                            {totalQuestions - answeredCount > 0 && (
                                <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', padding: '10px', marginBottom: '16px', textAlign: 'center' }}>
                                    <p style={{ color: '#92400e', fontSize: '13px', fontWeight: '600' }}>{totalQuestions - answeredCount} question{totalQuestions - answeredCount > 1 ? 's' : ''} unanswered</p>
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => setShowSubmitModal(false)} style={{ flex: 1, padding: '10px', border: '1px solid #d1d5db', color: '#374151', fontWeight: '600', fontSize: '13px', cursor: 'pointer', background: 'white' }}>Review</button>
                                <button onClick={handleSubmit} disabled={isSubmitting} style={{ flex: 1, padding: '10px', background: '#2563eb', color: 'white', border: 'none', fontWeight: '600', fontSize: '13px', cursor: 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>{isSubmitting ? 'Submitting...' : 'Submit'}</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                OPTIONS MENU â€” Inspera Style
            â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
            {
                adminScoreResult && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '16px' }}>
                        <div style={{ background: 'white', padding: '32px', maxWidth: '400px', width: '100%', borderRadius: '12px', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', textAlign: 'center' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <FaCheck style={{ fontSize: '28px', color: '#10b981' }} />
                            </div>
                            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', marginBottom: '4px' }}>Admin Preview Result</h2>
                            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>This is a preview — no data was saved.</p>
                            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px', marginBottom: '16px' }}>
                                <p style={{ fontSize: '42px', fontWeight: 'bold', color: '#1f2937' }}>{adminScoreResult.score}<span style={{ fontSize: '20px', color: '#9ca3af' }}>/{adminScoreResult.total}</span></p>
                                <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>Correct Answers</p>
                                <div style={{ marginTop: '12px', padding: '8px 16px', background: '#eef2ff', borderRadius: '6px', display: 'inline-block' }}>
                                    <span style={{ fontSize: '14px', color: '#4338ca', fontWeight: '600' }}>Band Score: {adminScoreResult.band}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => setAdminScoreResult(null)} style={{ flex: 1, padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', color: '#374151', fontWeight: '600', fontSize: '13px', cursor: 'pointer', background: 'white' }}>Continue Reviewing</button>
                                <button onClick={() => window.close()} style={{ flex: 1, padding: '10px', background: '#4f46e5', color: 'white', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', border: 'none' }}>Close Preview</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                showOptionsMenu && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 200, paddingTop: '60px' }}>
                        <div style={{ background: 'white', maxWidth: '520px', width: '100%', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', borderRadius: '4px', overflow: 'hidden' }}>

                            {optionsView === 'main' && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 16px' }}>
                                        <div></div>
                                        <h2 style={{ fontSize: '22px', fontWeight: '400', color: '#000', fontFamily: 'Arial, sans-serif', margin: 0 }}>Options</h2>
                                        <button onClick={() => setShowOptionsMenu(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><FaTimes size={18} color="#000" /></button>
                                    </div>
                                    <div style={{ padding: '0 24px 20px' }}>
                                        <button onClick={() => { setShowOptionsMenu(false); setShowSubmitModal(true); }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: '#e41e2b', color: 'white', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: '500', cursor: 'pointer', fontFamily: 'Arial, sans-serif' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                                                <span>Go to submission page</span>
                                            </div>
                                            <span style={{ fontSize: '20px' }}>{'>'}</span>
                                        </button>
                                    </div>
                                    <div style={{ borderTop: '1px solid #e5e7eb', margin: '0 24px' }}></div>
                                    <button onClick={() => setOptionsView('contrast')} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', background: 'none', border: 'none', cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="#666"><circle cx="12" cy="12" r="10" fill="none" stroke="#666" strokeWidth="2" /><path d="M12 2a10 10 0 0 1 0 20z" fill="#666" /></svg>
                                            <span style={{ fontSize: '16px', color: '#000' }}>Contrast</span>
                                        </div>
                                        <span style={{ fontSize: '20px', color: '#666' }}>{'>'}</span>
                                    </button>
                                    <div style={{ borderTop: '1px solid #e5e7eb', margin: '0 24px' }}></div>
                                    <button onClick={() => setOptionsView('textsize')} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', background: 'none', border: 'none', cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="#666"><circle cx="11" cy="11" r="7" fill="none" stroke="#666" strokeWidth="2" /><line x1="16" y1="16" x2="21" y2="21" stroke="#666" strokeWidth="2" /><text x="8" y="14" fontSize="10" fill="#666" fontWeight="bold">A</text></svg>
                                            <span style={{ fontSize: '16px', color: '#000' }}>Text size</span>
                                        </div>
                                        <span style={{ fontSize: '20px', color: '#666' }}>{'>'}</span>
                                    </button>
                                    <div style={{ height: '16px' }}></div>
                                </div>
                            )}

                            {optionsView === 'contrast' && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 16px' }}>
                                        <button onClick={() => setOptionsView('main')} style={{ background: 'none', border: 'none', fontSize: '15px', cursor: 'pointer', color: '#000' }}>Options</button>
                                        <h2 style={{ fontSize: '22px', fontWeight: '400', color: '#000', margin: 0 }}>Contrast</h2>
                                        <button onClick={() => setShowOptionsMenu(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#000', padding: '4px' }}><FaTimes size={18} /></button>
                                    </div>
                                    <div style={{ margin: '8px 24px 24px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                                        {[{ key: 'black-on-white', label: 'Black on white' }, { key: 'white-on-black', label: 'White on black' }, { key: 'yellow-on-black', label: 'Yellow on black' }].map((opt, idx) => (
                                            <button key={opt.key} onClick={() => setContrastMode(opt.key)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', background: 'none', border: 'none', borderBottom: idx < 2 ? '1px solid #e5e7eb' : 'none', cursor: 'pointer' }}>
                                                {contrastMode === opt.key ? <svg width="20" height="20" viewBox="0 0 24 24" fill="#333"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" /></svg> : <span style={{ width: '20px' }}></span>}
                                                <span style={{ fontSize: '16px', color: '#000' }}>{opt.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {optionsView === 'textsize' && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 16px' }}>
                                        <button onClick={() => setOptionsView('main')} style={{ background: 'none', border: 'none', fontSize: '15px', cursor: 'pointer', color: '#000' }}>Options</button>
                                        <h2 style={{ fontSize: '22px', fontWeight: '400', color: '#000', margin: 0 }}>Text size</h2>
                                        <button onClick={() => setShowOptionsMenu(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#000', padding: '4px' }}><FaTimes size={18} /></button>
                                    </div>
                                    <div style={{ margin: '8px 24px 24px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                                        {[{ key: 'regular', label: 'Regular' }, { key: 'large', label: 'Large' }, { key: 'extra-large', label: 'Extra large' }].map((opt, idx) => (
                                            <button key={opt.key} onClick={() => setTextSizeMode(opt.key)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', background: 'none', border: 'none', borderBottom: idx < 2 ? '1px solid #e5e7eb' : 'none', cursor: 'pointer' }}>
                                                {textSizeMode === opt.key ? <svg width="20" height="20" viewBox="0 0 24 24" fill="#333"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" /></svg> : <span style={{ width: '20px' }}></span>}
                                                <span style={{ fontSize: '16px', color: '#000' }}>{opt.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                )
            }

        </div >
    );
}

export default function ReadingExamPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><FaSpinner className="animate-spin text-4xl text-blue-600" /></div>}>
            <ReadingExamPageContent />
        </Suspense>
    );
}
