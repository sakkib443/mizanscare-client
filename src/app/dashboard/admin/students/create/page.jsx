"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    FaArrowLeft,
    FaUserGraduate,
    FaSpinner,
    FaCheck,
    FaCopy,
    FaEnvelope,
    FaPhone,
    FaIdCard,
    FaHeadphones,
    FaBook,
    FaPen,
    FaMicrophone,
    FaTimes,
    FaExclamationTriangle,
    FaPlus,
    FaTrash,
} from "react-icons/fa";
import { studentsAPI, listeningAPI, readingAPI, writingAPI, speakingAPI } from "@/lib/api";

// Toast Notification Component
const Toast = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => { onClose(); }, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bgColor = type === "error" ? "bg-red-500" : type === "success" ? "bg-green-500" : "bg-yellow-500";
    const Icon = type === "error" ? FaTimes : type === "success" ? FaCheck : FaExclamationTriangle;

    return (
        <div className={`fixed top-4 right-4 z-50 ${bgColor} text-white px-6 py-4 rounded-xl shadow-2xl flex items-start gap-3 max-w-md animate-slide-in`}>
            <div className="flex-shrink-0 mt-0.5"><Icon className="text-lg" /></div>
            <div className="flex-1"><p className="font-medium">{message}</p></div>
            <button onClick={onClose} className="flex-shrink-0 hover:bg-white/20 p-1 rounded cursor-pointer"><FaTimes /></button>
        </div>
    );
};

// Field Error Display
const FieldError = ({ error }) => {
    if (!error) return null;
    return (
        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
            <FaExclamationTriangle className="text-[10px]" />
            {error}
        </p>
    );
};

// Animated success overlay shown center-screen after a student is created
const SuccessOverlay = ({ examId, name }) => (
    <div className="success-overlay">
        <div className="success-card">
            <div className="success-icon-wrap">
                <span className="success-ring" />
                <svg className="success-check" viewBox="0 0 52 52" aria-hidden="true">
                    <circle className="success-check__circle" cx="26" cy="26" r="24" fill="none" />
                    <path className="success-check__path" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                </svg>
            </div>
            <h2 className="success-title">Student Registered Successfully!</h2>
            <p className="success-sub">
                {name ? <>“{name}” has been created.</> : "The student account has been created."}
            </p>
            {examId && (
                <div className="success-id">
                    <span className="success-id__label">Exam ID</span>
                    <span className="success-id__value">{examId}</span>
                </div>
            )}
            <p className="success-redirect">
                <FaSpinner className="animate-spin inline mr-1.5 text-[11px]" />
                Redirecting to all students…
            </p>
        </div>
    </div>
);

// Parse error from API response
const parseApiError = (error) => {
    if (Array.isArray(error)) {
        const fieldErrors = {};
        let generalMessage = "";
        error.forEach((err) => {
            let fieldName = err.field?.split(".")?.pop() || err.path?.[err.path.length - 1] || "general";
            const message = err.message || "Invalid value";
            if (fieldName === "general" || fieldName === "body" || !fieldName) {
                generalMessage += message + " ";
            } else {
                fieldErrors[fieldName] = message;
            }
        });
        return { fieldErrors, generalMessage: generalMessage.trim() || "Please fix the highlighted errors" };
    }
    if (typeof error === "string") return { fieldErrors: {}, generalMessage: error };
    if (error?.errors && Array.isArray(error.errors)) return parseApiError(error.errors);
    if (error?.message) return { fieldErrors: {}, generalMessage: error.message };
    return { fieldErrors: {}, generalMessage: "An unexpected error occurred" };
};

// ═══════════════════════════════════════════
// Multi-Set Selector Component
// ═══════════════════════════════════════════
function MultiSetSelector({ label, icon, sets, selectedSets, onChange, color = "purple" }) {
    const colorMap = {
        purple: 'text-purple-500 bg-purple-50 border-purple-200',
        blue: 'text-blue-500 bg-blue-50 border-blue-200',
        green: 'text-green-500 bg-green-50 border-green-200',
        orange: 'text-orange-500 bg-orange-50 border-orange-200',
    };
    const c = colorMap[color] || colorMap.purple;

    const addSet = () => {
        // Find first unselected set
        const available = sets.filter(s => !selectedSets.includes(s.testNumber));
        if (available.length > 0) {
            onChange([...selectedSets, available[0].testNumber]);
        }
    };

    const removeSet = (idx) => {
        onChange(selectedSets.filter((_, i) => i !== idx));
    };

    const updateSet = (idx, value) => {
        const updated = [...selectedSets];
        updated[idx] = Number(value);
        onChange(updated);
    };

    return (
        <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {icon} {label}
                <span className="text-xs text-gray-400 font-normal ml-1">(optional - multiple sets allowed)</span>
            </label>

            {selectedSets.length === 0 ? (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400 italic">No sets assigned</span>
                    <button
                        type="button"
                        onClick={addSet}
                        disabled={sets.length === 0}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FaPlus className="text-[9px]" /> Add Set
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    {selectedSets.map((setNum, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                            <span className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${c}`}>
                                {idx + 1}
                            </span>
                            <select
                                value={setNum}
                                onChange={(e) => updateSet(idx, e.target.value)}
                                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
                            >
                                <option value="">Select a set...</option>
                                {sets.map((set) => (
                                    <option
                                        key={set._id}
                                        value={set.testNumber}
                                        disabled={selectedSets.includes(set.testNumber) && set.testNumber !== setNum}
                                    >
                                        Test #{set.testNumber} - {set.title}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => removeSet(idx)}
                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                            >
                                <FaTrash className="text-xs" />
                            </button>
                        </div>
                    ))}
                    {selectedSets.length < sets.length && (
                        <button
                            type="button"
                            onClick={addSet}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs text-cyan-600 bg-cyan-50 rounded-lg hover:bg-cyan-100 cursor-pointer border border-dashed border-cyan-200"
                        >
                            <FaPlus className="text-[9px]" /> Add Another Set
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════
export default function CreateStudentPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(null);
    const [created, setCreated] = useState(null); // drives the animated success overlay
    const [toast, setToast] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [copiedField, setCopiedField] = useState(null);

    // Question set options
    const [listeningSets, setListeningSets] = useState([]);
    const [readingSets, setReadingSets] = useState([]);
    const [writingSets, setWritingSets] = useState([]);
    const [speakingSets, setSpeakingSets] = useState([]);

    // Form data - now with arrays for multi-set
    const [formData, setFormData] = useState({
        testType: "academic",
        nameEnglish: "",
        email: "",
        phone: "",
        nidNumber: "",
        passportNumber: "",
    });

    // Full Sets state (each full set = L+R+W)
    const [fullSets, setFullSets] = useState([{ listeningSetNumber: '', readingSetNumber: '', writingSetNumber: '' }]);
    // Extra individual parts
    const [extraSets, setExtraSets] = useState([]);

    useEffect(() => {
        fetchQuestionSets();
    }, []);

    const fetchQuestionSets = async () => {
        try {
            const [listeningRes, readingRes, writingRes, speakingRes] = await Promise.all([
                listeningAPI.getSummary().catch(() => ({ data: [] })),
                readingAPI.getSummary().catch(() => ({ data: [] })),
                writingAPI.getSummary().catch(() => ({ data: [] })),
                speakingAPI.getSummary().catch(() => ({ data: [] })),
            ]);
            setListeningSets(listeningRes.data || []);
            setReadingSets(readingRes.data || []);
            setWritingSets(writingRes.data || []);
            setSpeakingSets(speakingRes.data || []);
        } catch (error) {
            console.error("Failed to fetch question sets:", error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        let nextValue = type === "number" ? Number(value) : value;
        // Sanitise ID fields on input so stray spaces / invisible unicode chars
        // (from paste) can never sneak in and fail validation.
        if (name === "nidNumber") nextValue = value.replace(/\D/g, "");
        else if (name === "passportNumber") nextValue = value.replace(/[^A-Za-z0-9]/g, "");
        else if (name === "phone") nextValue = value.replace(/\D/g, "");
        setFormData(prev => ({
            ...prev,
            [name]: nextValue,
        }));
        if (fieldErrors[name]) {
            setFieldErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validateForm = () => {
        const errors = {};
        // Trim first so a stray leading/trailing space (common with paste/autofill)
        // never breaks an otherwise-valid value.
        const name = formData.nameEnglish.trim();
        const email = formData.email.trim();
        const phone = formData.phone.trim();
        const nid = formData.nidNumber.trim();
        const passport = formData.passportNumber.trim();

        if (!name) errors.nameEnglish = "Full name is required";
        if (!email) {
            errors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.email = "Please enter a valid email address";
        }
        if (!phone) {
            errors.phone = "Phone number is required";
        } else if (!/^01[3-9]\d{8}$/.test(phone)) {
            errors.phone = "Please enter a valid 11-digit BD phone number";
        }
        if (nid && !/^\d{10}$|^\d{17}$/.test(nid)) {
            errors.nidNumber = "NID must be 10 or 17 digits only";
        }
        if (passport && !/^[A-Za-z0-9]{6,12}$/.test(passport)) {
            errors.passportNumber = "Passport must be 6-12 letters/numbers";
        }
        // At least one of NID / Passport is required
        if (!nid && !passport) {
            errors.nidNumber = "NID অথবা Passport — অন্তত একটি দিন";
            errors.passportNumber = "NID অথবা Passport — অন্তত একটি দিন";
        }
        return errors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFieldErrors({});

        const validationErrors = validateForm();
        if (Object.keys(validationErrors).length > 0) {
            setFieldErrors(validationErrors);
            // Show the actual first error and jump to that field so it's never
            // hidden off-screen when the admin submits from the bottom.
            const firstKey = Object.keys(validationErrors)[0];
            setToast({ message: validationErrors[firstKey] || "Please fix the highlighted errors", type: "error" });
            setTimeout(() => {
                const el = document.querySelector(`[name="${firstKey}"]`);
                if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                    el.focus({ preventScroll: true });
                }
            }, 50);
            return;
        }

        setLoading(true);

        try {
            const studentData = {
                ...formData,
                // Trim text fields so trailing/leading spaces don't fail server validation
                nameEnglish: formData.nameEnglish.trim(),
                email: formData.email.trim(),
                phone: formData.phone.trim(),
                nidNumber: formData.nidNumber.trim(),
                passportNumber: formData.passportNumber.trim(),
                // Send Full Sets
                fullSets: fullSets
                    .filter(fs => fs.listeningSetNumber || fs.readingSetNumber || fs.writingSetNumber)
                    .map((fs, idx) => ({
                        label: `Full Set ${idx + 1}`,
                        listeningSetNumber: fs.listeningSetNumber ? Number(fs.listeningSetNumber) : undefined,
                        readingSetNumber: fs.readingSetNumber ? Number(fs.readingSetNumber) : undefined,
                        writingSetNumber: fs.writingSetNumber ? Number(fs.writingSetNumber) : undefined,
                    })),
                extraSets: extraSets
                    .filter(es => es.module && es.setNumber)
                    .map(es => ({ module: es.module, setNumber: Number(es.setNumber) })),
                // Legacy compatibility: first full set values
                listeningSetNumber: fullSets[0]?.listeningSetNumber ? Number(fullSets[0].listeningSetNumber) : undefined,
                readingSetNumber: fullSets[0]?.readingSetNumber ? Number(fullSets[0].readingSetNumber) : undefined,
                writingSetNumber: fullSets[0]?.writingSetNumber ? Number(fullSets[0].writingSetNumber) : undefined,
            };

            // Remove empty fields
            Object.keys(studentData).forEach(key => {
                if (studentData[key] === "" || studentData[key] === undefined) {
                    delete studentData[key];
                }
            });

            const response = await studentsAPI.create(studentData);

            if (response.success && response.data) {
                setCreated(response.data);
                setTimeout(() => { router.push("/dashboard/admin/students"); }, 2800);
            }
        } catch (err) {
            let errorData = err.message || "Failed to register student";
            try {
                if (typeof errorData === "string" && errorData.startsWith("[")) {
                    errorData = JSON.parse(errorData);
                }
            } catch (e) { }

            const { fieldErrors: parsedFieldErrors, generalMessage } = parseApiError(errorData);
            if (Object.keys(parsedFieldErrors).length > 0) setFieldErrors(parsedFieldErrors);
            setToast({ message: generalMessage, type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const getInputClass = (fieldName) => {
        const baseClass = "w-full border rounded-lg px-4 py-2.5 focus:outline-none transition-colors";
        if (fieldErrors[fieldName]) return `${baseClass} border-red-400 bg-red-50 focus:border-red-500`;
        return `${baseClass} border-gray-200 focus:border-cyan-500`;
    };

    // Success Screen
    if (success) {
        return (
            <div className="max-w-2xl mx-auto">
                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
                <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FaCheck className="text-green-600 text-3xl" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Student Registered Successfully!</h2>
                    <p className="text-gray-500 mb-6">
                        Share the following credentials with the student for exam access.
                    </p>

                    <div className="bg-gradient-to-br from-cyan-50 to-teal-50 rounded-xl p-6 border border-cyan-200 mb-6">
                        <h3 className="font-semibold text-gray-800 mb-4">Login Credentials</h3>
                        <div className="space-y-4">
                            {[
                                { label: "Exam ID", value: success.credentials.examId, field: "examId", mono: true },
                                { label: "Email (Username)", value: success.credentials.email, field: "email" },
                                { label: "Password", value: success.credentials.password, field: "password", mono: true },
                            ].map(({ label, value, field, mono }) => (
                                <div key={field} className="flex items-center justify-between bg-white rounded-lg p-3 border border-cyan-100">
                                    <div className="text-left">
                                        <p className="text-xs text-gray-500">{label}</p>
                                        <p className={`font-medium ${mono ? 'font-mono' : ''} ${field === 'examId' ? 'text-cyan-600 text-lg font-bold' : 'text-gray-800'}`}>{value}</p>
                                    </div>
                                    <button onClick={() => copyToClipboard(value, field)} className="p-2 hover:bg-cyan-50 rounded-lg text-gray-400 hover:text-cyan-600 cursor-pointer">
                                        {copiedField === field ? <FaCheck className="text-green-500" /> : <FaCopy />}
                                    </button>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-4">* Password is automatically generated from phone number</p>
                    </div>

                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={() => {
                                setSuccess(null);
                                setFormData({
                                    testType: "academic", nameEnglish: "", email: "", phone: "", nidNumber: "", passportNumber: "",
                                });
                            }}
                            className="px-6 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 cursor-pointer"
                        >Register Another</button>
                        <Link href="/dashboard/admin/students" className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-600 text-white rounded-lg hover:from-cyan-600 hover:to-teal-700">
                            View All Students
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            {created && <SuccessOverlay examId={created?.credentials?.examId} name={created?.student?.nameEnglish} />}

            <style jsx global>{`
                @keyframes slide-in {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .animate-slide-in { animation: slide-in 0.3s ease-out; }

                /* ── Animated success overlay ── */
                .success-overlay {
                    position: fixed; inset: 0; z-index: 100;
                    display: flex; align-items: center; justify-content: center;
                    padding: 16px;
                    background: rgba(15, 23, 42, 0.45);
                    backdrop-filter: blur(4px);
                    animation: success-fade 0.25s ease-out;
                }
                .success-card {
                    background: #fff; border-radius: 24px; padding: 40px 48px;
                    text-align: center; box-shadow: 0 24px 60px rgba(2, 6, 23, 0.28);
                    max-width: 90vw;
                    animation: success-pop 0.45s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .success-icon-wrap {
                    position: relative; width: 96px; height: 96px; margin: 0 auto 22px;
                    display: flex; align-items: center; justify-content: center;
                }
                .success-ring {
                    position: absolute; inset: -6px; border-radius: 50%;
                    background: #bbf7d0;
                    animation: success-ring 0.9s ease-out 0.15s both;
                }
                .success-check {
                    width: 96px; height: 96px; position: relative;
                    stroke-width: 4; stroke: #16a34a; stroke-miterlimit: 10;
                }
                .success-check__circle {
                    stroke-dasharray: 151; stroke-dashoffset: 151; stroke: #16a34a;
                    animation: success-stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) 0.1s forwards;
                }
                .success-check__path {
                    stroke-dasharray: 48; stroke-dashoffset: 48; stroke-linecap: round;
                    animation: success-stroke 0.35s cubic-bezier(0.65, 0, 0.45, 1) 0.65s forwards;
                }
                .success-title {
                    font-size: 1.4rem; font-weight: 700; color: #0f172a; margin: 0 0 6px;
                    opacity: 0; animation: success-up 0.45s ease-out 0.7s both;
                }
                .success-sub {
                    color: #64748b; font-size: 0.9rem; margin: 0 0 18px;
                    opacity: 0; animation: success-up 0.45s ease-out 0.8s both;
                }
                .success-id {
                    display: inline-flex; flex-direction: column; gap: 2px;
                    background: linear-gradient(135deg, #ecfeff, #cffafe);
                    border: 1px solid #a5f3fc; border-radius: 12px; padding: 10px 24px; margin-bottom: 16px;
                    opacity: 0; animation: success-up 0.45s ease-out 0.9s both;
                }
                .success-id__label { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.09em; color: #0891b2; font-weight: 700; }
                .success-id__value { font-size: 1.1rem; font-weight: 800; color: #0e7490; font-family: ui-monospace, SFMono-Regular, monospace; letter-spacing: 0.04em; }
                .success-redirect { font-size: 0.75rem; color: #94a3b8; margin: 0; opacity: 0; animation: success-up 0.45s ease-out 1s both; }

                @keyframes success-fade { from { opacity: 0; } to { opacity: 1; } }
                @keyframes success-pop {
                    0% { transform: scale(0.8); opacity: 0; }
                    60% { transform: scale(1.03); }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes success-stroke { to { stroke-dashoffset: 0; } }
                @keyframes success-ring {
                    0% { transform: scale(0.4); opacity: 0.7; }
                    100% { transform: scale(1.25); opacity: 0; }
                }
                @keyframes success-up {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link href="/dashboard/admin/students" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <FaArrowLeft className="text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Register New Student</h1>
                    <p className="text-gray-500">Create a new student account with exam ID</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <FaUserGraduate className="text-cyan-600" /> Personal Information
                    </h3>

                    <div className="mb-5 bg-cyan-50 border border-cyan-100 p-4 rounded-lg">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Test Type *</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="testType" value="academic" checked={formData.testType === "academic"} onChange={handleInputChange} className="w-4 h-4 text-cyan-600 focus:ring-cyan-500" />
                                <span className="text-sm font-medium text-gray-800">Academic</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="testType" value="general-training" checked={formData.testType === "general-training"} onChange={handleInputChange} className="w-4 h-4 text-cyan-600 focus:ring-cyan-500" />
                                <span className="text-sm font-medium text-gray-800">General Training (GT)</span>
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name (English) *</label>
                            <input type="text" name="nameEnglish" value={formData.nameEnglish} onChange={handleInputChange}
                                className={getInputClass("nameEnglish")} placeholder="e.g., Mohammad Rahman" />
                            <FieldError error={fieldErrors.nameEnglish} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <FaEnvelope className="inline mr-1 text-gray-400" /> Email Address *
                            </label>
                            <input type="email" name="email" value={formData.email} onChange={handleInputChange}
                                className={getInputClass("email")} placeholder="student@email.com" />
                            <FieldError error={fieldErrors.email} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <FaPhone className="inline mr-1 text-gray-400" /> Phone Number *
                            </label>
                            <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange}
                                className={getInputClass("phone")} placeholder="01712345678" />
                            <FieldError error={fieldErrors.phone} />
                            <p className="text-xs text-gray-500 mt-1">This will be used as the student's password</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <FaIdCard className="inline mr-1 text-gray-400" /> NID / Voter ID Number
                            </label>
                            <input type="text" name="nidNumber" value={formData.nidNumber} onChange={handleInputChange}
                                className={getInputClass("nidNumber")} placeholder="10 or 17 digit number" />
                            <FieldError error={fieldErrors.nidNumber} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <FaIdCard className="inline mr-1 text-gray-400" /> Passport Number
                            </label>
                            <input type="text" name="passportNumber" value={formData.passportNumber} onChange={handleInputChange}
                                className={getInputClass("passportNumber")} placeholder="e.g., A01234567" />
                            <FieldError error={fieldErrors.passportNumber} />
                        </div>
                        <div className="md:col-span-2">
                            <p className="text-xs text-gray-500">
                                <span className="text-red-500">*</span> NID অথবা Passport — যেকোনো একটি অবশ্যই দিতে হবে (চাইলে দুটোই দিতে পারেন)।
                            </p>
                        </div>
                    </div>
                </div>

                {/* ═══ Full Set Assignment UI ═══ */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-800 mb-1">Assign Exam Sets</h3>
                    <p className="text-sm text-gray-500 mb-5">
                        Full Set = Listening + Reading + Writing একসাথে। একাধিক Full Set add করতে পারবেন।
                    </p>

                    {/* Full Sets */}
                    <div className="space-y-4 mb-6">
                        {fullSets.map((fs, idx) => (
                            <div key={idx} className="border border-indigo-100 bg-indigo-50/30 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-bold text-indigo-700">Full Set {idx + 1}</h4>
                                    {fullSets.length > 1 && (
                                        <button type="button" onClick={() => setFullSets(fullSets.filter((_, i) => i !== idx))}
                                            className="text-red-400 hover:text-red-600 p-1 cursor-pointer">
                                            <FaTrash className="text-xs" />
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">🎧 Listening</label>
                                        <select
                                            value={fs.listeningSetNumber}
                                            onChange={(e) => {
                                                const updated = [...fullSets];
                                                updated[idx] = { ...updated[idx], listeningSetNumber: e.target.value };
                                                setFullSets(updated);
                                            }}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
                                        >
                                            <option value="">Select...</option>
                                            {listeningSets.filter(s => !s.testType || s.testType === formData.testType).map(s => (
                                                <option key={s._id} value={s.testNumber}>#{s.testNumber} - {s.title}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">📖 Reading</label>
                                        <select
                                            value={fs.readingSetNumber}
                                            onChange={(e) => {
                                                const updated = [...fullSets];
                                                updated[idx] = { ...updated[idx], readingSetNumber: e.target.value };
                                                setFullSets(updated);
                                            }}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
                                        >
                                            <option value="">Select...</option>
                                            {readingSets.filter(s => !s.testType || s.testType === formData.testType).map(s => (
                                                <option key={s._id} value={s.testNumber}>#{s.testNumber} - {s.title}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">✍️ Writing</label>
                                        <select
                                            value={fs.writingSetNumber}
                                            onChange={(e) => {
                                                const updated = [...fullSets];
                                                updated[idx] = { ...updated[idx], writingSetNumber: e.target.value };
                                                setFullSets(updated);
                                            }}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
                                        >
                                            <option value="">Select...</option>
                                            {writingSets.filter(s => !s.testType || s.testType === formData.testType).map(s => (
                                                <option key={s._id} value={s.testNumber}>#{s.testNumber} - {s.title}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={() => setFullSets([...fullSets, { listeningSetNumber: '', readingSetNumber: '', writingSetNumber: '' }])}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm text-indigo-600 bg-indigo-50 border border-dashed border-indigo-200 rounded-lg hover:bg-indigo-100 cursor-pointer"
                        >
                            <FaPlus className="text-xs" /> Add Full Set
                        </button>
                    </div>

                    {/* Extra Individual Parts */}
                    <div className="border-t border-gray-200 pt-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Extra Individual Parts <span className="font-normal text-gray-400">(optional)</span></h4>
                        {extraSets.length > 0 && (
                            <div className="space-y-2 mb-3">
                                {extraSets.map((es, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <select
                                            value={es.module}
                                            onChange={(e) => {
                                                const updated = [...extraSets];
                                                updated[idx] = { ...updated[idx], module: e.target.value, setNumber: '' };
                                                setExtraSets(updated);
                                            }}
                                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
                                        >
                                            <option value="">Module...</option>
                                            <option value="listening">🎧 Listening</option>
                                            <option value="reading">📖 Reading</option>
                                            <option value="writing">✍️ Writing</option>
                                        </select>
                                        <select
                                            value={es.setNumber}
                                            onChange={(e) => {
                                                const updated = [...extraSets];
                                                updated[idx] = { ...updated[idx], setNumber: e.target.value };
                                                setExtraSets(updated);
                                            }}
                                            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
                                        >
                                            <option value="">Select set...</option>
                                            {(es.module === 'listening' ? listeningSets : es.module === 'reading' ? readingSets : es.module === 'writing' ? writingSets : speakingSets).filter(s => !s.testType || s.testType === formData.testType).map(s => (
                                                <option key={s._id} value={s.testNumber}>#{s.testNumber} - {s.title}</option>
                                            ))}
                                        </select>
                                        <button type="button" onClick={() => setExtraSets(extraSets.filter((_, i) => i !== idx))}
                                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer">
                                            <FaTrash className="text-xs" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() => setExtraSets([...extraSets, { module: '', setNumber: '' }])}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 bg-gray-50 border border-dashed border-gray-200 rounded-lg hover:bg-gray-100 cursor-pointer"
                        >
                            <FaPlus className="text-[9px]" /> Add Extra Part
                        </button>
                    </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-4">
                    <Link href="/dashboard/admin/students" className="px-6 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-600 text-white rounded-lg hover:from-cyan-600 hover:to-teal-700 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                    >
                        {loading && <FaSpinner className="animate-spin" />}
                        Register Student
                    </button>
                </div>
            </form>
        </div>
    );
}
