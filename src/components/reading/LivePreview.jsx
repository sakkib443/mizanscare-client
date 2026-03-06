"use client";
import React, { useState } from "react";

// ═══════════════════════════════════════════
// LIVE PREVIEW — Same rendering as exam page
// ═══════════════════════════════════════════
export default function LivePreview({ sections, title }) {
    const [activeSection, setActiveSection] = useState(0);
    const currentSection = sections[activeSection] || {};
    const groups = currentSection.questionGroups || [];

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* ═══ Preview Header ═══ */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-white font-bold text-sm">👁️ Live Preview — {title || "Untitled Test"}</h3>
                    <span className="text-blue-200 text-xs">Exam page এর মতো preview</span>
                </div>
                {/* Section tabs */}
                <div className="flex gap-1 mt-2">
                    {sections.map((s, idx) => (
                        <button key={idx} type="button" onClick={() => setActiveSection(idx)}
                            className={`px-3 py-1 rounded text-xs font-medium transition-all cursor-pointer ${activeSection === idx ? "bg-white text-blue-700" : "bg-blue-500/40 text-blue-100 hover:bg-blue-500/60"}`}>
                            Section {idx + 1}
                        </button>
                    ))}
                </div>
            </div>

            {/* ═══ Preview Content ═══ */}
            <div className="max-h-[75vh] overflow-y-auto">
                {/* Passage */}
                <div className="p-5 border-b border-gray-200 bg-amber-50/30">
                    <h2 className="text-lg font-bold text-gray-900 mb-3">{currentSection.title || "Section Title"}</h2>
                    {currentSection.passage ? (
                        <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto pr-2">
                            {currentSection.passage.substring(0, 1500)}
                            {currentSection.passage.length > 1500 && <span className="text-gray-400">... (passage truncated in preview)</span>}
                        </div>
                    ) : (
                        <p className="text-gray-400 text-sm italic">No passage yet</p>
                    )}
                </div>

                {/* Question Groups */}
                <div className="p-5 space-y-6">
                    {groups.length === 0 && (
                        <p className="text-gray-400 text-sm italic text-center py-8">No question groups added yet</p>
                    )}

                    {groups.map((group, gIdx) => (
                        <div key={gIdx} className="mb-6">
                            {/* ═══ NOTE COMPLETION ═══ */}
                            {group.groupType === "note-completion" && (
                                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                                    <div className="mb-4">
                                        <h3 className="text-lg font-bold text-gray-900 mb-1">Questions {group.startQuestion}-{group.endQuestion}</h3>
                                        <p className="text-gray-800 font-medium mb-1">{group.mainInstruction}</p>
                                        <p className="text-gray-700 text-sm italic">
                                            Choose <span className="font-bold">ONE WORD ONLY</span> from the passage for each answer.
                                        </p>
                                    </div>
                                    {group.mainHeading && (
                                        <h3 className="text-xl font-bold text-blue-900 mb-4 border-b-2 border-blue-100 pb-2">{group.mainHeading}</h3>
                                    )}
                                    {(group.passage || "").split('\n').map((line, lineIdx) => {
                                        const trimmed = line.trim();
                                        if (!trimmed) return <div key={lineIdx} className="h-3" />;
                                        const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-');
                                        const hasBlank = trimmed.includes('__________');
                                        const isHeading = !isBullet && !hasBlank && trimmed.length < 100;

                                        const renderLine = (text) => {
                                            const parts = text.split(/(\d+\s*__________)/g);
                                            return parts.map((part, pIdx) => {
                                                const match = part.match(/(\d+)\s*__________/);
                                                if (match) {
                                                    const qNum = parseInt(match[1]);
                                                    return (
                                                        <span key={pIdx} className="inline-flex items-center gap-1 mx-1 align-baseline">
                                                            <span className="bg-white border border-gray-400 text-gray-800 text-xs font-bold px-1.5 py-0.5 rounded shadow-sm">{qNum}</span>
                                                            <span className="border border-gray-300 rounded px-2 py-1 bg-gray-50 w-28 h-7 inline-block text-xs text-gray-400 leading-6">answer here</span>
                                                        </span>
                                                    );
                                                }
                                                return <span key={pIdx}>{part}</span>;
                                            });
                                        };

                                        if (isHeading) return <h4 key={lineIdx} className="font-extrabold text-gray-900 text-base mt-5 mb-2 uppercase tracking-wide">{trimmed}</h4>;
                                        if (isBullet) return (
                                            <div key={lineIdx} className="flex items-start gap-3 ml-6 mb-2">
                                                <span className="text-gray-400 mt-1.5 text-xs">•</span>
                                                <span className="flex-1 text-gray-700 leading-relaxed font-medium">{renderLine(trimmed.replace(/^[•\-]\s*/, ''))}</span>
                                            </div>
                                        );
                                        return <p key={lineIdx} className="text-gray-700 leading-relaxed mb-2 ml-2">{renderLine(trimmed)}</p>;
                                    })}

                                    {!group.passage && group.notesSections?.map((section, sIdx) => (
                                        <div key={sIdx} className="mt-3">
                                            {section.subHeading && <h4 className="font-bold text-gray-800 mb-2">{section.subHeading}</h4>}
                                            <ul className="space-y-2 pl-4">
                                                {section.bullets?.map((bullet, bIdx) => (
                                                    <li key={bIdx} className="flex items-start gap-2 text-gray-700">
                                                        <span className="mt-0.5">•</span>
                                                        {bullet.type === "context" ? (
                                                            <span>{bullet.text}</span>
                                                        ) : (
                                                            <div className="flex items-center flex-wrap gap-1">
                                                                <span>{bullet.textBefore}</span>
                                                                <span className="inline-flex items-center gap-1">
                                                                    <span className="border border-gray-400 text-gray-700 text-sm font-bold px-1.5 py-0.5">{bullet.questionNumber}</span>
                                                                    <span className="border border-gray-300 rounded px-2 py-1 bg-gray-50 w-28 h-7 inline-block text-xs text-gray-400 leading-6">answer</span>
                                                                </span>
                                                                {bullet.textAfter && <span>{bullet.textAfter}</span>}
                                                            </div>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* ═══ TRUE/FALSE/NOT GIVEN ═══ */}
                            {group.groupType === "true-false-not-given" && (
                                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                                    <div className="mb-4">
                                        <h3 className="text-lg font-bold text-gray-900 mb-1">Questions {group.startQuestion}-{group.endQuestion}</h3>
                                        <p className="text-gray-800 font-medium mb-3">{group.mainInstruction}</p>
                                        <div className="bg-gray-50 p-4 rounded-md space-y-2 text-sm border-l-4 border-gray-300">
                                            <p><span className="font-bold w-24 inline-block">TRUE</span> if the statement agrees with the information</p>
                                            <p><span className="font-bold w-24 inline-block">FALSE</span> if the statement contradicts the information</p>
                                            <p><span className="font-bold w-24 inline-block">NOT GIVEN</span> if there is no information on this</p>
                                        </div>
                                    </div>
                                    <div className="space-y-6 mt-6">
                                        {(group.statements || []).map(stmt => (
                                            <div key={stmt.questionNumber} className="pb-4 border-b border-gray-100 last:border-0">
                                                <div className="flex items-start gap-3 mb-4">
                                                    <span className="bg-gray-100 border border-gray-300 text-gray-800 text-sm font-bold px-2 py-0.5 rounded shadow-sm">{stmt.questionNumber}</span>
                                                    <p className="text-gray-800 font-medium leading-relaxed">{stmt.text || <span className="text-gray-400 italic">Statement text...</span>}</p>
                                                </div>
                                                <div className="space-y-3 pl-10 mt-2">
                                                    {["TRUE", "FALSE", "NOT GIVEN"].map(opt => (
                                                        <label key={opt} className="flex items-center gap-3 cursor-default">
                                                            <span className="font-bold text-gray-800 text-sm min-w-[16px]">{opt === "TRUE" ? "A" : opt === "FALSE" ? "B" : "C"}</span>
                                                            <div className="w-4 h-4 rounded-full border-2 border-gray-400 flex items-center justify-center" />
                                                            <span className="text-sm font-semibold uppercase tracking-wide text-gray-700">{opt}</span>
                                                            {stmt.correctAnswer === opt && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold ml-2">✓ Correct</span>}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ═══ YES/NO/NOT GIVEN ═══ */}
                            {group.groupType === "yes-no-not-given" && (
                                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                                    <div className="mb-4">
                                        <h3 className="text-lg font-bold text-gray-900 mb-1">Questions {group.startQuestion}-{group.endQuestion}</h3>
                                        <p className="text-gray-800 font-medium">{group.mainInstruction}</p>
                                    </div>
                                    <div className="space-y-4 mt-3">
                                        {(group.statements || []).map(stmt => (
                                            <div key={stmt.questionNumber} className="py-2">
                                                <div className="flex items-start gap-2 mb-2">
                                                    <span className="border border-gray-400 text-gray-700 text-sm font-bold px-1.5 py-0.5">{stmt.questionNumber}</span>
                                                    <span className="text-gray-800">{stmt.text || <span className="text-gray-400 italic">Statement...</span>}</span>
                                                </div>
                                                <div className="ml-8 space-y-1">
                                                    {["YES", "NO", "NOT GIVEN"].map(opt => (
                                                        <div key={opt} className="flex items-center gap-2">
                                                            <span className="text-gray-500">•</span>
                                                            <div className="w-4 h-4 border rounded border-gray-400 flex items-center justify-center" />
                                                            <span className="text-gray-700">{opt}</span>
                                                            {stmt.correctAnswer === opt && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold ml-1">✓</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ═══ MATCHING INFO / FEATURES / HEADINGS ═══ */}
                            {(group.groupType === "matching-information" || group.groupType === "matching-features" || group.groupType === "matching-headings") && (
                                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">Questions {group.startQuestion}-{group.endQuestion}</h3>
                                    <p className="text-gray-800 mb-2">{group.mainInstruction}</p>
                                    {group.subInstruction && <p className="text-gray-700 text-sm">{group.subInstruction}</p>}
                                    {group.note && <p className="text-gray-700 text-sm"><span className="font-bold">NB</span> <em>{group.note.replace('NB ', '')}</em></p>}

                                    {group.featureOptions?.length > 0 && (
                                        <div className="mt-4 mb-4 space-y-1">
                                            <p className="font-bold text-gray-900">{group.featureListTitle || "List of options"}</p>
                                            {group.featureOptions.map(opt => (
                                                <div key={opt.letter} className="flex items-center gap-3 pl-2">
                                                    <span className="font-bold text-gray-800 min-w-[20px]">{opt.letter}</span>
                                                    <span className="text-gray-800">{opt.text || <span className="text-gray-400 italic">option...</span>}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="space-y-3 mt-4">
                                        {(group.matchingItems || []).map(item => (
                                            <div key={item.questionNumber} className="flex items-center gap-3">
                                                <span className="border border-gray-400 text-gray-700 text-sm font-bold px-1.5 py-0.5 flex-shrink-0">{item.questionNumber}</span>
                                                <span className="flex-1 text-gray-800">{item.text || <span className="text-gray-400 italic">statement...</span>}</span>
                                                <span className="border border-gray-300 rounded px-3 py-1.5 text-gray-500 min-w-[60px] text-center bg-gray-50">
                                                    {item.correctAnswer || "--"}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ═══ MULTIPLE CHOICE FULL ═══ */}
                            {group.groupType === "multiple-choice-full" && (
                                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">Questions {group.startQuestion}-{group.endQuestion}</h3>
                                    <p className="text-gray-800 italic mb-1">{group.mainInstruction}</p>
                                    <p className="text-gray-800 mb-4">{group.subInstruction}</p>

                                    <div className="space-y-6 mt-4">
                                        {(group.mcQuestions || []).map(mcQ => (
                                            <div key={mcQ.questionNumber} className="py-2">
                                                <div className="flex items-start gap-2 mb-3">
                                                    <span className="border border-gray-400 text-gray-700 text-sm font-bold px-1.5 py-0.5">{mcQ.questionNumber}</span>
                                                    <span className="text-gray-800 font-medium">{mcQ.questionText || <span className="text-gray-400 italic">Question...</span>}</span>
                                                </div>
                                                <div className="ml-8 space-y-2">
                                                    {(mcQ.options || []).map(opt => (
                                                        <div key={opt.letter} className="flex items-start gap-2">
                                                            <span className="font-bold text-gray-700 mt-0.5">{opt.letter}</span>
                                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${mcQ.correctAnswer === opt.letter ? "border-green-600 bg-green-600" : "border-gray-400"}`}>
                                                                {mcQ.correctAnswer === opt.letter && <div className="w-2 h-2 bg-white rounded-full" />}
                                                            </div>
                                                            <span className={mcQ.correctAnswer === opt.letter ? "text-green-700 font-semibold" : "text-gray-700"}>
                                                                {opt.text || <span className="text-gray-400 italic">option...</span>}
                                                                {mcQ.correctAnswer === opt.letter && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold ml-2">✓ Correct</span>}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ═══ SUMMARY WITH OPTIONS ═══ */}
                            {group.groupType === "summary-with-options" && (
                                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">Questions {group.startQuestion}-{group.endQuestion}</h3>
                                    <p className="text-gray-800">{group.mainInstruction}</p>
                                    <p className="text-gray-800">{group.subInstruction}</p>

                                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-3">
                                        {(group.phraseList || []).map(phrase => (
                                            <div key={phrase.letter} className="text-gray-700">
                                                <span className="font-bold">{phrase.letter}</span> {phrase.text || <span className="text-gray-400 italic">word...</span>}
                                            </div>
                                        ))}
                                    </div>

                                    {group.mainHeading && <h3 className="text-lg font-bold text-gray-900 mt-4">{group.mainHeading}</h3>}

                                    <div className="text-gray-700 leading-relaxed mt-2">
                                        {(group.summarySegments || []).map((seg, sIdx) => (
                                            seg.type === "text" ? (
                                                <span key={sIdx}>{seg.content} </span>
                                            ) : (
                                                <span key={sIdx} className="inline-flex items-center gap-1 mx-1">
                                                    <span className="border border-gray-400 text-gray-700 text-sm font-bold px-1.5 py-0.5">{seg.questionNumber}</span>
                                                    <span className="border border-gray-300 rounded px-2 py-1 bg-gray-50 min-w-[50px] text-center text-xs text-gray-500">
                                                        {seg.correctAnswer || "--"}
                                                    </span>
                                                </span>
                                            )
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ═══ TABLE COMPLETION ═══ */}
                            {group.groupType === "table-completion" && (() => {
                                const renderCell = (content) => {
                                    if (!content) return null;
                                    const parts = content.split(/(\d+\s*_{5,})/g);
                                    return parts.map((part, pIdx) => {
                                        const match = part.match(/(\d+)\s*_{5,}/);
                                        if (match) {
                                            const qNum = parseInt(match[1]);
                                            const ans = (group.answers || []).find(a => a.questionNumber === qNum);
                                            return (
                                                <span key={pIdx} className="inline-flex items-center gap-1 mx-1 align-baseline">
                                                    <span className="bg-white border border-gray-400 text-gray-800 text-xs font-bold px-1.5 py-0.5 rounded shadow-sm">{qNum}</span>
                                                    <span className="border border-gray-300 rounded px-2 py-1 bg-green-50 w-24 h-7 inline-block text-xs text-green-700 font-medium leading-6">
                                                        {ans?.correctAnswer || "answer"}
                                                    </span>
                                                </span>
                                            );
                                        }
                                        return <span key={pIdx}>{part}</span>;
                                    });
                                };

                                const cols = group.columns || [];
                                const dataCols = cols.slice(1);

                                return (
                                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                                        <h3 className="text-lg font-bold text-gray-900 mb-1">Questions {group.startQuestion}–{group.endQuestion}</h3>
                                        <p className="text-gray-800 font-medium mb-1">{group.mainInstruction}</p>
                                        {group.subInstruction && <p className="text-gray-600 text-sm italic mb-3">{group.subInstruction}</p>}
                                        {group.tableTitle && <h4 className="font-bold text-gray-900 mb-3">{group.tableTitle}</h4>}
                                        <div className="overflow-x-auto border border-gray-300 rounded-lg">
                                            <table className="w-full text-sm border-collapse">
                                                <thead>
                                                    <tr className="bg-gray-100">
                                                        <th className="border border-gray-300 px-3 py-2 text-left font-bold text-gray-700 w-32">{cols[0] || ""}</th>
                                                        {dataCols.map((col, i) => (
                                                            <th key={i} className="border border-gray-300 px-3 py-2 text-left font-bold text-gray-700">{col}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(group.rows || []).map((row, rIdx) => (
                                                        <tr key={rIdx} className="hover:bg-gray-50">
                                                            <td className="border border-gray-300 px-3 py-2 font-semibold text-gray-800 bg-gray-50 whitespace-pre-wrap">{row.label}</td>
                                                            {dataCols.map((_, cIdx) => {
                                                                const cell = (row.cells || [])[cIdx] || { content: "" };
                                                                const hasBlank = /\d+\s*_{5,}/.test(cell.content || "");
                                                                return (
                                                                    <td key={cIdx} className={`border border-gray-300 px-3 py-2 text-gray-700 ${hasBlank ? "bg-amber-50" : ""}`}>
                                                                        <span className="leading-relaxed">{renderCell(cell.content)}</span>
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* ═══ CHOOSE TWO LETTERS ═══ */}
                            {group.groupType === "choose-two-letters" && (
                                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">Questions {group.startQuestion}-{group.endQuestion}</h3>
                                    <p className="text-gray-800 italic">{group.mainInstruction}</p>

                                    {(group.questionSets || []).map((qSet, qsIdx) => (
                                        <div key={qsIdx} className="mt-4">
                                            <div className="flex items-start gap-2 mb-3">
                                                <div className="flex gap-1">
                                                    {qSet.questionNumbers?.map(qNum => (
                                                        <span key={qNum} className="border border-gray-400 text-gray-700 text-sm font-bold px-1.5 py-0.5">{qNum}</span>
                                                    ))}
                                                </div>
                                                <p className="text-gray-800">{qSet.questionText || <span className="text-gray-400 italic">Question...</span>}</p>
                                            </div>
                                            <div className="space-y-2 ml-6">
                                                {(qSet.options || []).map(opt => {
                                                    const isCorrect = (qSet.correctAnswers || []).includes(opt.letter);
                                                    return (
                                                        <div key={opt.letter} className="flex items-center gap-2">
                                                            <span className="font-bold text-gray-700">{opt.letter}</span>
                                                            <div className={`w-4 h-4 border rounded flex items-center justify-center ${isCorrect ? "bg-green-600 border-green-600" : "border-gray-400"}`}>
                                                                {isCorrect && (
                                                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                            <span className={isCorrect ? "text-green-700 font-semibold" : "text-gray-700"}>
                                                                {opt.text || <span className="text-gray-400 italic">option...</span>}
                                                                {isCorrect && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold ml-2">✓</span>}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* ═══ SHORT ANSWER QUESTIONS ═══ */}
                            {group.groupType === "short-answer" && (
                                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">Questions {group.startQuestion}–{group.endQuestion}</h3>
                                    <p className="text-gray-800 font-medium mb-1">{group.mainInstruction || "Answer the questions below."}</p>
                                    {group.subInstruction && (
                                        <p className="text-blue-700 font-semibold mb-4 text-sm">
                                            Choose <strong>{group.subInstruction.match(/ONE \w+ ONLY/)?.[0] || "ONE WORD ONLY"}</strong> from the passage for each answer.
                                        </p>
                                    )}
                                    <div className="space-y-3 mt-3">
                                        {(group.questions || []).map((q, idx) => (
                                            <div key={idx} className="flex items-start gap-3">
                                                <span className="border border-gray-400 text-gray-700 text-sm font-bold px-1.5 py-0.5 flex-shrink-0 mt-0.5">{q.questionNumber}</span>
                                                <div className="flex-1">
                                                    <span className="text-gray-800">{q.questionText || <span className="text-gray-400 italic">Question text...</span>}</span>
                                                    {q.correctAnswer && (
                                                        <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">✓ {q.correctAnswer}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ═══ SUMMARY COMPLETION (legacy) ═══ */}
                            {group.groupType === "summary-completion" && (
                                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">Questions {group.startQuestion}-{group.endQuestion}</h3>
                                    <p className="text-gray-800 italic">{group.mainInstruction}</p>
                                    {group.mainHeading && <h3 className="text-lg font-bold text-gray-900 mt-4">{group.mainHeading}</h3>}
                                    <div className="text-gray-700 leading-relaxed mt-2">
                                        {(group.summarySegments || []).map((seg, sIdx) => (
                                            seg.type === "text" ? (
                                                <span key={sIdx}>{seg.content} </span>
                                            ) : (
                                                <span key={sIdx} className="inline-flex items-center gap-1 mx-1">
                                                    <span className="border border-gray-400 text-gray-700 text-sm font-bold px-1.5 py-0.5">{seg.questionNumber}</span>
                                                    <span className="border-b border-gray-400 bg-gray-50 w-28 px-2 py-1 inline-block text-xs text-gray-400">answer</span>
                                                </span>
                                            )
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
