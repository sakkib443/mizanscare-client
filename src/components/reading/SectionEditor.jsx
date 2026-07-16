"use client";
import React, { useState, useRef } from "react";
import { FaPlus, FaTrash, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { QuestionGroupEditor } from "./QuestionGroupForms";
import { QUESTION_TYPES, createGroupTemplate, getNextQuestionNumber, renumberGroups } from "@/lib/readingHelpers";

const label = "block text-xs font-semibold text-gray-600 mb-1";
const input = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none";
const textarea = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none resize-y";

export default function SectionEditor({ section, sectionIndex, onChange }) {
    const [showTypeMenu, setShowTypeMenu] = useState(false);
    const [passageCollapsed, setPassageCollapsed] = useState(false);
    const [showParagraphs, setShowParagraphs] = useState((section.paragraphs || []).length > 0);
    const passageRef = useRef(null);

    const updateField = (field, value) => {
        onChange({ ...section, [field]: value });
    };

    // Wrap the selected passage text (or insert a placeholder) as a bold sub-heading (**...**),
    // so a non-technical admin doesn't need to know the markdown syntax.
    const insertBoldHeading = () => {
        const text = section.passage || "";
        const el = passageRef.current;
        const start = el ? el.selectionStart : text.length;
        const end = el ? el.selectionEnd : text.length;
        const selected = text.slice(start, end);
        const insert = selected ? `**${selected}**` : "**Heading**";
        const newText = text.slice(0, start) + insert + text.slice(end);
        updateField("passage", newText);
        setTimeout(() => {
            if (passageRef.current) {
                const pos = start + insert.length;
                passageRef.current.focus();
                passageRef.current.setSelectionRange(pos, pos);
            }
        }, 0);
    };

    const addQuestionGroup = (type) => {
        const groups = section.questionGroups || [];
        const startQ = getNextQuestionNumber(groups);
        const template = createGroupTemplate(type, startQ);
        onChange({ ...section, questionGroups: [...groups, template] });
        setShowTypeMenu(false);
    };

    const updateGroup = (gIdx, updated) => {
        const groups = [...(section.questionGroups || [])];
        groups[gIdx] = updated;
        onChange({ ...section, questionGroups: groups });
    };

    const removeGroup = (gIdx) => {
        const groups = (section.questionGroups || []).filter((_, i) => i !== gIdx);
        onChange({ ...section, questionGroups: groups });
    };

    // Paragraph management
    const addParagraph = () => {
        const paras = section.paragraphs || [];
        const nextLabel = String.fromCharCode(65 + paras.length);
        onChange({ ...section, paragraphs: [...paras, { label: nextLabel, text: "" }] });
        setShowParagraphs(true);
    };

    const updateParagraph = (pIdx, field, value) => {
        const paras = (section.paragraphs || []).map((p, i) => i === pIdx ? { ...p, [field]: value } : p);
        onChange({ ...section, paragraphs: paras });
    };

    const removeParagraph = (pIdx) => {
        onChange({ ...section, paragraphs: (section.paragraphs || []).filter((_, i) => i !== pIdx) });
    };

    const totalGroupQuestions = (section.questionGroups || []).reduce((sum, g) => {
        return sum + (g.endQuestion - g.startQuestion + 1);
    }, 0);

    return (
        <div className="space-y-4">
            {/* Section Title */}
            <div>
                <label className={label}>📌 Section {sectionIndex + 1} Title</label>
                <input className={input} value={section.title || ""} onChange={e => updateField("title", e.target.value)} placeholder="e.g. The development of the London underground railway" />
            </div>

            {/* Main Passage */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 cursor-pointer" onClick={() => setPassageCollapsed(!passageCollapsed)}>
                    <span className="text-xs font-semibold text-gray-700">📄 Passage Text</span>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{(section.passage || "").length} chars</span>
                        {passageCollapsed ? <FaChevronDown size={10} className="text-gray-400" /> : <FaChevronUp size={10} className="text-gray-400" />}
                    </div>
                </div>
                {!passageCollapsed && (
                    <div className="p-3 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] text-gray-400">Passage টেক্সট paste করুন। Sub-heading bold করতে: heading টেক্সট সিলেক্ট করে ডানের বাটন চাপুন।</span>
                            <button type="button" onClick={insertBoldHeading}
                                className="text-[11px] font-semibold text-blue-600 border border-blue-200 rounded px-2 py-0.5 hover:bg-blue-50 cursor-pointer flex items-center gap-1">
                                <span className="font-extrabold">B</span> Bold Heading
                            </button>
                        </div>
                        <textarea ref={passageRef} className={textarea} rows={10} value={section.passage || ""} onChange={e => updateField("passage", e.target.value)} placeholder={"Paste the entire reading passage here...\n\nSub-heading bold করতে: **Butterflies versus Moths**"} />

                        {/* Optional Paragraphs (A, B, C, etc.) */}
                        <div>
                            <div className="flex items-center justify-between">
                                <label className={label}>
                                    Labeled Paragraphs (A, B, C...) — <span className="font-normal text-gray-400">optional, for matching info/headings</span>
                                </label>
                                <button type="button" onClick={addParagraph} className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer">+ Add Paragraph</button>
                            </div>
                            {showParagraphs && (section.paragraphs || []).map((p, pIdx) => (
                                <div key={pIdx} className="flex items-start gap-2 mt-1.5">
                                    <span className="text-xs font-bold text-blue-600 mt-2 w-6">{p.label}</span>
                                    <textarea className={`${textarea} flex-1`} rows={3} value={p.text} onChange={e => updateParagraph(pIdx, "text", e.target.value)} placeholder={`Paragraph ${p.label} text...`} />
                                    <button type="button" onClick={() => removeParagraph(pIdx)} className="text-red-400 hover:text-red-600 mt-2 p-1"><FaTrash size={11} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Question Groups */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-gray-700">
                        📝 Question Groups
                        <span className="ml-2 text-xs font-normal text-gray-400">({totalGroupQuestions} questions)</span>
                    </h3>
                </div>

                <div className="space-y-3">
                    {(section.questionGroups || []).map((g, gIdx) => (
                        <QuestionGroupEditor
                            key={gIdx}
                            group={g}
                            index={gIdx}
                            onUpdate={updated => updateGroup(gIdx, updated)}
                            onRemove={() => removeGroup(gIdx)}
                        />
                    ))}
                </div>

                {/* Add Question Group */}
                <div className="mt-3 relative">
                    <button type="button" onClick={() => setShowTypeMenu(!showTypeMenu)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors w-full justify-center border-2 border-dashed border-blue-200 cursor-pointer">
                        <FaPlus size={12} /> Add Question Group
                    </button>

                    {showTypeMenu && (
                        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 p-2 grid grid-cols-2 gap-1">
                            {QUESTION_TYPES.map(t => (
                                <button key={t.value} type="button" onClick={() => addQuestionGroup(t.value)}
                                    className="flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-blue-50 rounded-lg transition-colors cursor-pointer">
                                    <span>{t.icon}</span>
                                    <span className="text-gray-700">{t.label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
