"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
    FaArrowLeft, FaSpinner, FaSave, FaHeadphones, FaTimes, FaCheck,
    FaPlus, FaTrash, FaChevronDown, FaChevronUp, FaEye, FaEyeSlash,
    FaCode, FaCopy, FaVolumeUp, FaUpload,
} from "react-icons/fa";
import { listeningAPI, uploadAudio } from "@/lib/api";
import ListeningPreview from "@/components/listening/ListeningPreview";
import { ListeningGroupEditor } from "@/components/listening/ListeningGroupForms";
import {
    LISTENING_QUESTION_TYPES,
    createListeningGroupTemplate,
    generateListeningQuestions,
    getNextListeningQNumber,
    renumberListeningGroups,
    convertFlatQuestionsToGroups,
} from "@/lib/listeningHelpers";

// ═══════════════════════════════════════════════════════
// Audio Upload Button (reusable)
// ═══════════════════════════════════════════════════════
function AudioUploadBtn({ onUploaded, label = "Upload" }) {
    const [uploading, setUploading] = useState(false);
    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const res = await uploadAudio(file);
            if (res?.data?.url) onUploaded(res.data.url);
        } catch (err) {
            alert("Audio upload failed: " + (err.message || "Unknown"));
        } finally { setUploading(false); e.target.value = ''; }
    };
    return (
        <label className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium cursor-pointer hover:bg-indigo-700 transition-colors whitespace-nowrap">
            {uploading ? <FaSpinner className="animate-spin" size={11} /> : <FaUpload size={11} />}
            {uploading ? 'Uploading...' : label}
            <input type="file" accept="audio/*" onChange={handleFile} className="hidden" disabled={uploading} />
        </label>
    );
}

// ═══════════════════════════════════════════════════════
// SECTION EDITOR (each Part)
// ═══════════════════════════════════════════════════════
function SectionEditor({ section, sectionIndex, onChange }) {
    const [showTypeMenu, setShowTypeMenu] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    const groups = section.questionGroups || [];

    const addQuestionGroup = (type) => {
        const startQ = getNextListeningQNumber(groups);
        const template = createListeningGroupTemplate(type, startQ);
        onChange({ ...section, questionGroups: [...groups, template] });
        setShowTypeMenu(false);
    };

    const updateGroup = (gIdx, updated) => {
        const newGroups = [...groups];
        newGroups[gIdx] = updated;
        onChange({ ...section, questionGroups: newGroups });
    };

    const removeGroup = (gIdx) => {
        onChange({ ...section, questionGroups: groups.filter((_, i) => i !== gIdx) });
    };

    const totalGroupQs = groups.reduce((sum, g) => sum + (g.endQuestion - g.startQuestion + 1), 0);

    return (
        <div className="space-y-4">
            {/* Part Meta */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">📌 Part Title</label>
                    <input value={section.title} onChange={e => onChange({ ...section, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                        placeholder={`e.g. Part ${section.sectionNumber}`} />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">📝 Context / Situation</label>
                    <input value={section.context || ''} onChange={e => onChange({ ...section, context: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                        placeholder="e.g. A conversation between two people about..." />
                </div>
                <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-2">
                        <FaVolumeUp className="text-indigo-500" size={11} /> Part Audio (optional)
                    </label>
                    <div className="flex items-center gap-2">
                        <input value={section.audioUrl || ''} onChange={e => onChange({ ...section, audioUrl: e.target.value })}
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
                            placeholder="URL or upload →" />
                        <AudioUploadBtn onUploaded={url => onChange({ ...section, audioUrl: url })} />
                        {section.audioUrl && (
                            <button type="button" onClick={() => onChange({ ...section, audioUrl: '' })}
                                className="text-red-400 hover:text-red-600 cursor-pointer p-1"><FaTimes size={12} /></button>
                        )}
                    </div>
                    {section.audioUrl && (
                        <div className="mt-1 text-[10px] text-green-600 flex items-center gap-1"><FaCheck size={8} /> Audio set</div>
                    )}
                </div>
            </div>

            {/* Question Groups */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-gray-700">
                        📝 Question Groups
                        <span className="ml-2 text-xs font-normal text-gray-400">({totalGroupQs} questions)</span>
                    </h3>
                </div>

                <div className="space-y-3">
                    {groups.length === 0 && (
                        <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                            <FaHeadphones size={30} className="mx-auto text-gray-300 mb-3" />
                            <p className="text-sm text-gray-400 mb-1">No question groups yet</p>
                            <p className="text-xs text-gray-400">নিচের "Add Question Group" button থেকে যোগ করুন</p>
                        </div>
                    )}

                    {groups.map((g, gIdx) => (
                        <ListeningGroupEditor
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
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-medium hover:bg-indigo-100 transition-colors w-full justify-center border-2 border-dashed border-indigo-200 cursor-pointer">
                        <FaPlus size={12} /> Add Question Group
                    </button>

                    {showTypeMenu && (
                        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 p-2 grid grid-cols-2 gap-1">
                            {LISTENING_QUESTION_TYPES.map(t => (
                                <button key={t.value} type="button" onClick={() => addQuestionGroup(t.value)}
                                    className="flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer">
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

// ═══════════════════════════════════════════════════════
// MAIN PAGE CONTENT
// ═══════════════════════════════════════════════════════
function CreateListeningPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get("edit");

    const [isEditMode, setIsEditMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showPreview, setShowPreview] = useState(true);
    const [activeTab, setActiveTab] = useState(0);

    // JSON
    const [showJson, setShowJson] = useState(false);
    const [jsonText, setJsonText] = useState("");
    const [jsonError, setJsonError] = useState("");
    const [copied, setCopied] = useState(false);

    // Form
    const [formData, setFormData] = useState({
        title: "", description: "", source: "",
        difficulty: "medium", duration: 40,
        mainAudioUrl: "", audioDuration: 0,
    });

    // Sections
    const emptySection = (num) => ({
        sectionNumber: num,
        title: `Part ${num}`,
        context: "",
        instructions: `Questions ${(num - 1) * 10 + 1}–${num * 10}`,
        audioUrl: "",
        imageUrl: "",
        questionGroups: [],
        questions: [],
    });

    const [sections, setSections] = useState([
        emptySection(1), emptySection(2), emptySection(3), emptySection(4),
    ]);

    // ═══ Fetch data for edit mode ═══
    useEffect(() => {
        if (!editId) return;
        const fetchData = async () => {
            setFetchLoading(true);
            try {
                const response = await listeningAPI.getById(editId, true);
                if (response.success && response.data) {
                    const data = response.data;
                    setIsEditMode(true);
                    setFormData({
                        title: data.title || "", description: data.description || "",
                        source: data.source || "", difficulty: data.difficulty || "medium",
                        duration: data.duration || 40,
                        mainAudioUrl: data.mainAudioUrl || "", audioDuration: data.audioDuration || 0,
                    });
                    if (data.sections?.length > 0) {
                        setSections(data.sections.map((s, i) => {
                            // If questionGroups already exist, use them directly
                            // Otherwise, convert flat questions[] to questionGroups[]
                            let qGroups = s.questionGroups || [];
                            console.log(`Part ${i + 1} raw questions:`, s.questions?.length, JSON.stringify(s.questions?.slice(0, 2)));
                            console.log(`Part ${i + 1} existing questionGroups:`, qGroups.length);
                            if (qGroups.length === 0 && s.questions?.length > 0) {
                                try {
                                    qGroups = convertFlatQuestionsToGroups(s.questions);
                                    console.log(`Part ${i + 1} converted groups:`, qGroups.length, JSON.stringify(qGroups.map(g => ({ type: g.groupType, start: g.startQuestion, end: g.endQuestion }))));
                                } catch (convErr) {
                                    console.error(`Part ${i + 1} conversion error:`, convErr);
                                }
                            }
                            return {
                                sectionNumber: s.sectionNumber || i + 1,
                                title: s.title || `Part ${i + 1}`,
                                context: s.context || "",
                                instructions: s.instructions || "",
                                audioUrl: s.audioUrl || "",
                                imageUrl: s.imageUrl || "",
                                questionGroups: qGroups,
                                questions: s.questions || [],
                            };
                        }));
                    }
                }
            } catch (err) {
                setError("Failed to fetch listening test data");
            } finally {
                setFetchLoading(false);
            }
        };
        fetchData();
    }, [editId]);

    const updateSection = (idx, updated) => {
        setSections(prev => prev.map((s, i) => i === idx ? updated : s));
    };

    // ═══ Build preview sections ═══
    const previewSections = sections.map(s => {
        const groups = s.questionGroups || [];
        if (groups.length > 0) {
            return {
                ...s,
                questions: generateListeningQuestions(groups),
                instructions: `Questions ${groups[0]?.startQuestion || 1}–${groups[groups.length - 1]?.endQuestion || 10}`
            };
        }
        return s;
    });

    // ═══ JSON Export / Import ═══
    const handleJsonExport = () => {
        const data = {
            ...formData,
            sections: previewSections.map(s => ({
                sectionNumber: s.sectionNumber,
                title: s.title,
                context: s.context,
                instructions: s.instructions,
                audioUrl: s.audioUrl,
                imageUrl: s.imageUrl,
                questions: s.questions,
            }))
        };
        setJsonText(JSON.stringify(data, null, 2));
        setShowJson(true); setJsonError("");
    };

    const handleJsonImport = () => {
        try {
            const parsed = JSON.parse(jsonText);
            if (parsed.title !== undefined) {
                setFormData(prev => ({
                    ...prev,
                    title: parsed.title || prev.title,
                    description: parsed.description || prev.description,
                    source: parsed.source || prev.source,
                    difficulty: parsed.difficulty || prev.difficulty,
                    duration: parsed.duration || prev.duration,
                    mainAudioUrl: parsed.mainAudioUrl || prev.mainAudioUrl,
                }));
            }
            if (parsed.sections?.length) {
                setSections(parsed.sections.map((s, i) => ({
                    sectionNumber: s.sectionNumber || i + 1,
                    title: s.title || `Part ${i + 1}`,
                    context: s.context || "",
                    instructions: s.instructions || "",
                    audioUrl: s.audioUrl || "",
                    imageUrl: s.imageUrl || "",
                    questionGroups: s.questionGroups || [],
                    questions: s.questions || [],
                })));
            }
            setShowJson(false); setJsonError("");
            setSuccess("JSON imported!"); setTimeout(() => setSuccess(""), 2000);
        } catch (err) { setJsonError(err.message); }
    };

    // ═══ Submit ═══
    const handleSubmit = async () => {
        if (!formData.title.trim()) { setError("Title is required"); return; }
        setLoading(true); setError("");

        try {
            const finalSections = sections.map(s => {
                const groups = s.questionGroups || [];
                const questions = groups.length > 0 ? generateListeningQuestions(groups) : (s.questions || []);
                return {
                    sectionNumber: s.sectionNumber,
                    title: s.title,
                    context: s.context || '',
                    instructions: s.instructions || '',
                    audioUrl: s.audioUrl || '',
                    imageUrl: s.imageUrl || '',
                    questions,
                };
            });

            const totalQuestions = finalSections.reduce((sum, s) =>
                sum + s.questions.filter(b => b.blockType === "question").length, 0);

            const payload = {
                ...formData,
                totalQuestions, totalMarks: totalQuestions,
                sections: finalSections,
            };

            let response;
            if (isEditMode && editId) {
                response = await listeningAPI.update(editId, payload);
            } else {
                response = await listeningAPI.create(payload);
            }

            if (response.success) {
                setSuccess(isEditMode ? "Listening test updated!" : "Listening test created!");
                setTimeout(() => router.push("/dashboard/admin/listening"), 1500);
            } else {
                setError(response.message || "Failed");
            }
        } catch (err) {
            setError(err.message || "Failed");
        } finally { setLoading(false); }
    };

    // Total Q count
    const totalQuestions = previewSections.reduce((sum, s) =>
        sum + (s.questions || []).filter(b => b.blockType === "question").length, 0);

    if (fetchLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <FaSpinner className="animate-spin text-3xl text-indigo-500" />
            </div>
        );
    }

    return (
        <div className={`pb-10 mx-auto ${showPreview ? 'max-w-[1600px]' : 'max-w-5xl'}`}>



            {/* ═══ Header ═══ */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/admin/listening" className="p-2 text-gray-400 hover:text-gray-600 rounded-md transition-colors">
                        <FaArrowLeft />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <FaHeadphones className="text-indigo-600" />
                            {isEditMode ? "Edit Listening Test" : "Create Listening Test"}
                        </h1>
                        <p className="text-gray-500 text-xs mt-0.5">
                            {totalQuestions}/40 questions across 4 parts
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setShowPreview(!showPreview)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${showPreview
                            ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                            : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        {showPreview ? <FaEyeSlash size={11} /> : <FaEye size={11} />} Preview
                    </button>
                    <button type="button" onClick={handleJsonExport}
                        className="px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer">
                        <FaCode size={11} /> JSON
                    </button>
                    <button type="button" onClick={handleSubmit} disabled={loading}
                        className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50 cursor-pointer transition-colors">
                        {loading ? <FaSpinner className="animate-spin" size={13} /> : <FaSave size={13} />}
                        {isEditMode ? "Update" : "Save"} Test
                    </button>
                </div>
            </div>

            {/* Messages */}
            {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center justify-between text-sm">
                    <span>{error}</span>
                    <button onClick={() => setError("")} className="cursor-pointer"><FaTimes /></button>
                </div>
            )}
            {success && (
                <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2 text-sm">
                    <FaCheck /> <span>{success}</span>
                </div>
            )}

            {/* JSON Panel */}
            {showJson && (
                <div className="border border-indigo-200 rounded-xl bg-indigo-50 p-4 mb-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-indigo-700">📋 Full Test JSON</span>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => { navigator.clipboard.writeText(jsonText); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                                className="text-xs text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer">
                                {copied ? <><FaCheck /> Copied!</> : <><FaCopy /> Copy</>}
                            </button>
                            <button type="button" onClick={() => setShowJson(false)} className="cursor-pointer text-gray-400 hover:text-gray-600"><FaTimes /></button>
                        </div>
                    </div>
                    <textarea value={jsonText} onChange={e => setJsonText(e.target.value)} rows={15}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono outline-none focus:border-indigo-500 resize-y" />
                    {jsonError && <p className="text-xs text-red-600 mt-1">{jsonError}</p>}
                    <button type="button" onClick={handleJsonImport}
                        className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium cursor-pointer hover:bg-indigo-700">
                        Import JSON
                    </button>
                </div>
            )}

            {/* ═══ Test Info ═══ */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
                <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">📋 Test Information</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Title *</label>
                        <input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                            placeholder="e.g. Listening Test 06" />
                    </div>
                    <div className="col-span-2">
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Description</label>
                        <textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                            rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                            placeholder="Optional" />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Difficulty</label>
                        <select value={formData.difficulty} onChange={e => setFormData(p => ({ ...p, difficulty: e.target.value }))}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none bg-white">
                            <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Source</label>
                        <input value={formData.source} onChange={e => setFormData(p => ({ ...p, source: e.target.value }))}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                            placeholder="e.g. Cambridge 17" />
                    </div>
                    <div className="col-span-2">
                        <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-2">
                            <FaVolumeUp className="text-indigo-500" /> Main Audio (Full Test)
                        </label>
                        <div className="flex items-center gap-2">
                            <input value={formData.mainAudioUrl} onChange={e => setFormData(p => ({ ...p, mainAudioUrl: e.target.value }))}
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none font-mono"
                                placeholder="URL or upload →" />
                            <AudioUploadBtn onUploaded={url => setFormData(p => ({ ...p, mainAudioUrl: url }))} label="Upload Audio" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ Two-Column: Editor + Preview ═══ */}
            <div className="flex gap-5">
                {/* LEFT — Editor */}
                <div className={`${showPreview ? 'w-1/2' : 'w-full'} min-w-0`}>
                    {/* Part Tabs */}
                    <div className="flex gap-1 mb-4">
                        {sections.map((s, idx) => {
                            const partQs = (previewSections[idx]?.questions || []).filter(b => b.blockType === "question").length;
                            return (
                                <button key={idx} type="button" onClick={() => setActiveTab(idx)}
                                    className={`flex-1 py-3 px-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === idx
                                        ? "bg-indigo-600 text-white shadow-md"
                                        : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>
                                    <div>Part {idx + 1}</div>
                                    <div className={`text-[10px] mt-0.5 ${activeTab === idx ? "text-indigo-200" : "text-gray-400"}`}>
                                        {partQs}Q • {(sections[idx].questionGroups || []).length} groups
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Active Section Editor */}
                    <SectionEditor
                        section={sections[activeTab]}
                        sectionIndex={activeTab}
                        onChange={updated => updateSection(activeTab, updated)}
                    />

                    {/* Bottom Save */}
                    <div className="mt-6 flex items-center justify-between">
                        <div className="text-xs text-gray-400">
                            💡 Question Group add করুন → type select → step অনুসরণ করুন
                        </div>
                        <button type="button" onClick={handleSubmit} disabled={loading}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-md transition-colors">
                            {loading ? <FaSpinner className="animate-spin" /> : <FaSave />}
                            {isEditMode ? "Update" : "Save"} Listening Test
                        </button>
                    </div>
                </div>

                {/* RIGHT — Preview */}
                {showPreview && (
                    <div className="w-1/2 min-w-0 sticky top-4 self-start">
                        <ListeningPreview sections={previewSections} title={formData.title} mainAudioUrl={formData.mainAudioUrl} />
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════
// PAGE WRAPPER
// ═══════════════════════════════════════════════════════
export default function CreateListeningPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center py-20">
                <FaSpinner className="animate-spin text-3xl text-indigo-500" />
            </div>
        }>
            <CreateListeningPageContent />
        </Suspense>
    );
}
