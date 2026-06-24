"use client";

import React, { useState, useEffect } from "react";
import { toast } from "@/components/toast/Toaster";
import {
    FaUsers,
    FaSearch,
    FaSpinner,
    FaUserShield,
    FaUser,
    FaChalkboardTeacher,
    FaPlus,
    FaTrashAlt,
    FaTimes,
    FaExclamationTriangle,
    FaEnvelope,
    FaPhone,
    FaLock,
    FaUserCog,
    FaUserGraduate,
    FaCalendarAlt,
} from "react-icons/fa";
import { usersAPI, studentsAPI } from "@/lib/api";

const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "-";

const studentStatusStyle = (st) => {
    if (st === "completed") return "bg-emerald-100 text-emerald-700";
    if (st === "in-progress") return "bg-amber-100 text-amber-700";
    if (st === "terminated") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-600";
};

// Professional, reusable delete icon-button
const DeleteButton = ({ onClick, title = "Delete" }) => (
    <button
        onClick={onClick}
        title={title}
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-red-200 text-red-500 bg-white hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-sm cursor-pointer"
    >
        <FaTrashAlt className="text-xs" />
    </button>
);

export default function UsersPage() {
    const [activeTab, setActiveTab] = useState("officials");

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState([]);
    const [studentsLoading, setStudentsLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState("");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null); // { type: 'user'|'student', item }
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const [error, setError] = useState("");
    const [currentUserRole, setCurrentUserRole] = useState("");
    const [currentUserId, setCurrentUserId] = useState("");

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        password: "",
        role: "admin",
    });

    const isAdmin = currentUserRole === "admin";

    useEffect(() => {
        try {
            const userStr = localStorage.getItem("user");
            if (userStr) {
                const user = JSON.parse(userStr);
                setCurrentUserRole(user.role || "admin");
                setCurrentUserId(user._id || "");
            }
        } catch (e) { }

        fetchUsers();
        fetchStudents();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await usersAPI.getAll();
            if (response.success) {
                setUsers(response.data || []);
            }
        } catch (err) {
            setError("You don't have permission to manage users. Only Admins can access this feature.");
        } finally {
            setLoading(false);
        }
    };

    const fetchStudents = async () => {
        try {
            setStudentsLoading(true);
            const response = await studentsAPI.getAll({ page: 1, limit: 100 });
            if (response.success && response.data) {
                setStudents(response.data.students || []);
            }
        } catch (err) {
            // students list is secondary — fail quietly
        } finally {
            setStudentsLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setCreating(true);
        setError("");

        try {
            const response = await usersAPI.create(formData);
            if (response.success) {
                const roleLabel = formData.role === "admin" ? "Admin" : formData.role === "mentor" ? "Mentor" : "User";
                toast.success(`${roleLabel} "${formData.name}" has been created successfully.`, { title: "User created" });
                setShowCreateModal(false);
                setFormData({ name: "", email: "", phone: "", password: "", role: "admin" });
                fetchUsers();
            } else {
                toast.error(response.message || "Please try again.", { title: "Could not create user" });
            }
        } catch (err) {
            toast.error(err.message || "Please try again.", { title: "Could not create user" });
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        setDeleting(userId);
        try {
            const response = await usersAPI.delete(userId);
            if (response.success) {
                toast.success("The user has been deleted successfully.", { title: "User deleted" });
                setDeleteConfirm(null);
                setUsers((prev) => prev.filter((u) => u._id !== userId));
            } else {
                toast.error(response.message || "Please try again.", { title: "Could not delete user" });
            }
        } catch (err) {
            toast.error(err.message || "Please try again.", { title: "Could not delete user" });
        } finally {
            setDeleting(null);
        }
    };

    const handleDeleteStudent = async (studentId) => {
        setDeleting(studentId);
        try {
            const response = await studentsAPI.delete(studentId);
            if (response.success) {
                toast.success("The student has been deleted successfully.", { title: "Student deleted" });
                setDeleteConfirm(null);
                setStudents((prev) => prev.filter((s) => s._id !== studentId));
            } else {
                toast.error(response.message || "Please try again.", { title: "Could not delete student" });
            }
        } catch (err) {
            toast.error(err.message || "Please try again.", { title: "Could not delete student" });
        } finally {
            setDeleting(null);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            const response = await usersAPI.updateRole(userId, newRole);
            if (response.success) {
                setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u)));
                toast.success(`The user's role has been updated to ${newRole}.`, { title: "Role updated" });
            }
        } catch (err) {
            toast.error(err.message || "Please try again.", { title: "Could not update role" });
        }
    };

    const roleConfig = {
        admin: { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200", icon: FaUserShield, label: "Admin" },
        mentor: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200", icon: FaChalkboardTeacher, label: "Mentor" },
        user: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200", icon: FaUser, label: "User" },
    };

    const term = searchTerm.toLowerCase();
    // Officials = staff accounts only (admin / mentor). Role "user" accounts are
    // student logins and are shown in the Students tab, not here.
    const officials = users.filter((u) => u.role === "admin" || u.role === "mentor");
    const filteredUsers = officials.filter(
        (u) => u.name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term)
    );
    const filteredStudents = students.filter(
        (s) =>
            s.nameEnglish?.toLowerCase().includes(term) ||
            s.email?.toLowerCase().includes(term) ||
            s.examId?.toLowerCase().includes(term) ||
            (s.phone || "").includes(searchTerm)
    );

    const TabButton = ({ id, icon: Icon, label, count }) => {
        const active = activeTab === id;
        return (
            <button
                onClick={() => { setActiveTab(id); setSearchTerm(""); }}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${active
                    ? "border-cyan-600 text-cyan-700"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                    }`}
            >
                <Icon className="text-sm" />
                {label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? "bg-cyan-100 text-cyan-700" : "bg-gray-100 text-gray-500"}`}>
                    {count}
                </span>
            </button>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
                    <p className="text-gray-500 mt-1">Manage officials and registered students</p>
                </div>
                {isAdmin && activeTab === "officials" && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                        <FaPlus className="text-xs" /> Create User
                    </button>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700 text-sm">
                    <FaExclamationTriangle /> {error}
                    <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600 cursor-pointer"><FaTimes /></button>
                </div>
            )}

            {/* Info Banner */}
            {!isAdmin && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <FaLock className="text-amber-500 text-xl mt-0.5" />
                    <div>
                        <p className="text-amber-800 font-medium">View Only Access</p>
                        <p className="text-amber-600 text-sm">Only Admins can create, edit, or delete.</p>
                    </div>
                </div>
            )}

            {/* Tabs + Search */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 pt-2 border-b border-gray-200 flex items-center gap-1">
                    <TabButton id="officials" icon={FaUserShield} label="Officials" count={officials.length} />
                    <TabButton id="students" icon={FaUserGraduate} label="Students" count={students.length} />
                </div>

                <div className="p-4 border-b border-gray-100">
                    <div className="relative max-w-md">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder={activeTab === "officials" ? "Search officials..." : "Search by name, email, phone, or Exam ID..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-cyan-500 text-sm"
                        />
                    </div>
                </div>

                {/* ───────── Officials Table ───────── */}
                {activeTab === "officials" && (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                                        {isAdmin && (
                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={isAdmin ? 6 : 5} className="px-4 py-12 text-center">
                                                <FaSpinner className="animate-spin text-3xl text-cyan-500 mx-auto" />
                                                <p className="text-gray-500 mt-2">Loading officials...</p>
                                            </td>
                                        </tr>
                                    ) : filteredUsers.length > 0 ? (
                                        filteredUsers.map((user) => {
                                            const rc = roleConfig[user.role] || roleConfig.user;
                                            const RoleIcon = rc.icon;
                                            const isCurrentUser = user._id === currentUserId;
                                            return (
                                                <tr key={user._id} className={`hover:bg-gray-50 transition-colors ${isCurrentUser ? "bg-blue-50/30" : ""}`}>
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.role === "admin"
                                                                ? "bg-gradient-to-br from-purple-500 to-indigo-600"
                                                                : user.role === "mentor"
                                                                    ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                                                                    : "bg-gradient-to-br from-blue-400 to-cyan-500"
                                                                }`}>
                                                                <span className="text-white font-semibold">{user.name?.charAt(0).toUpperCase()}</span>
                                                            </div>
                                                            <p className="font-medium text-gray-800">
                                                                {user.name}
                                                                {isCurrentUser && (
                                                                    <span className="ml-2 text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">You</span>
                                                                )}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-gray-600 text-sm">{user.email}</td>
                                                    <td className="px-4 py-4 text-gray-600 text-sm">{user.phone || "-"}</td>
                                                    <td className="px-4 py-4">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${rc.bg} ${rc.text} ${rc.border}`}>
                                                            <RoleIcon className="text-[10px]" />
                                                            {rc.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-sm text-gray-500">{fmtDate(user.createdAt)}</td>
                                                    {isAdmin && (
                                                        <td className="px-4 py-4">
                                                            {!isCurrentUser ? (
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <select
                                                                        value={user.role}
                                                                        onChange={(e) => handleRoleChange(user._id, e.target.value)}
                                                                        className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                                                                    >
                                                                        <option value="admin">Admin</option>
                                                                        <option value="mentor">Mentor</option>
                                                                    </select>
                                                                    <DeleteButton onClick={() => setDeleteConfirm({ type: "user", item: user })} title="Delete user" />
                                                                </div>
                                                            ) : (
                                                                <p className="text-center"><span className="text-xs text-gray-400">—</span></p>
                                                            )}
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={isAdmin ? 6 : 5} className="px-4 py-12 text-center">
                                                <FaUsers className="text-gray-300 text-5xl mx-auto mb-4" />
                                                <p className="text-gray-500">No officials found</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
                            <span>Total: {officials.length} officials</span>
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1"><FaUserShield className="text-purple-500" /> {officials.filter((u) => u.role === "admin").length} Admin</span>
                                <span className="flex items-center gap-1"><FaChalkboardTeacher className="text-emerald-500" /> {officials.filter((u) => u.role === "mentor").length} Mentor</span>
                            </div>
                        </div>
                    </>
                )}

                {/* ───────── Students Table ───────── */}
                {activeTab === "students" && (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam ID</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registered</th>
                                        {isAdmin && (
                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {studentsLoading ? (
                                        <tr>
                                            <td colSpan={isAdmin ? 6 : 5} className="px-4 py-12 text-center">
                                                <FaSpinner className="animate-spin text-3xl text-cyan-500 mx-auto" />
                                                <p className="text-gray-500 mt-2">Loading students...</p>
                                            </td>
                                        </tr>
                                    ) : filteredStudents.length > 0 ? (
                                        filteredStudents.map((student) => (
                                            <tr key={student._id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-semibold shrink-0">
                                                            {(student.nameEnglish || "?").charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-gray-800 truncate">{student.nameEnglish}</p>
                                                            <p className="text-xs text-gray-400 truncate">{student.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className="font-mono text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded px-2 py-1">
                                                        {student.examId}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-gray-600 text-sm">{student.phone || "-"}</td>
                                                <td className="px-4 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${studentStatusStyle(student.examStatus)}`}>
                                                        {student.examStatus || "not-started"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-sm text-gray-500">
                                                    <span className="flex items-center gap-1.5">
                                                        <FaCalendarAlt className="text-[10px] text-gray-400" />
                                                        {fmtDate(student.createdAt)}
                                                    </span>
                                                </td>
                                                {isAdmin && (
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center justify-center">
                                                            <DeleteButton onClick={() => setDeleteConfirm({ type: "student", item: student })} title="Delete student" />
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={isAdmin ? 6 : 5} className="px-4 py-12 text-center">
                                                <FaUserGraduate className="text-gray-300 text-5xl mx-auto mb-4" />
                                                <p className="text-gray-500">No students found</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
                            <span>Total: {students.length} students</span>
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> {students.filter((s) => s.examStatus === "completed").length} Completed</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> {students.filter((s) => s.examStatus === "in-progress").length} In Progress</span>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                                        <FaUserCog className="text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-800">Create New User</h2>
                                        <p className="text-xs text-gray-500">Add an admin account</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowCreateModal(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg cursor-pointer">
                                    <FaTimes />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <div className="relative">
                                    <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-cyan-500 text-sm"
                                        placeholder="Enter full name"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <div className="relative">
                                    <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-cyan-500 text-sm"
                                        placeholder="admin@example.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                <div className="relative">
                                    <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                                    <input
                                        type="text"
                                        required
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-cyan-500 text-sm"
                                        placeholder="01712345678"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <div className="relative">
                                    <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-cyan-500 text-sm"
                                        placeholder="Min 6 characters"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { value: "admin", label: "Admin", icon: FaUserShield, desc: "Full system access", color: "purple" },
                                        { value: "mentor", label: "Mentor", icon: FaChalkboardTeacher, desc: "All access except user mgmt", color: "emerald" },
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, role: opt.value })}
                                            className={`p-3 rounded-lg border-2 text-left transition-all cursor-pointer ${formData.role === opt.value
                                                ? `border-${opt.color}-400 bg-${opt.color}-50`
                                                : "border-gray-200 hover:border-gray-300"
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <opt.icon className={`text-sm ${formData.role === opt.value ? `text-${opt.color}-600` : "text-gray-400"}`} />
                                                <span className="text-sm font-medium text-gray-800">{opt.label}</span>
                                            </div>
                                            <p className="text-[11px] text-gray-500">{opt.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-1 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {creating ? <FaSpinner className="animate-spin" /> : <FaPlus className="text-xs" />}
                                    {creating ? "Creating..." : "Create User"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
                        <div className="text-center mb-4">
                            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <FaTrashAlt className="text-red-500 text-xl" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">
                                Delete {deleteConfirm.type === "student" ? "Student" : "User"}?
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Are you sure you want to delete{" "}
                                <strong>{deleteConfirm.item.name || deleteConfirm.item.nameEnglish}</strong>? This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() =>
                                    deleteConfirm.type === "student"
                                        ? handleDeleteStudent(deleteConfirm.item._id)
                                        : handleDeleteUser(deleteConfirm.item._id)
                                }
                                disabled={deleting === deleteConfirm.item._id}
                                className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {deleting === deleteConfirm.item._id ? <FaSpinner className="animate-spin" /> : <FaTrashAlt className="text-xs" />}
                                {deleting === deleteConfirm.item._id ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
