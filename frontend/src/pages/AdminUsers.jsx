import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users, UserCog, Plus, Loader2, AlertCircle, X, Trash2,
  Mail, Shield, Calendar, Check,
} from "lucide-react";
import { adminAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import ConfirmModal from "../components/ConfirmModal";
import toast from "react-hot-toast";

const itemV = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

// ═══════════════════════════════════════════════════════════════════════
// CREATE / EDIT MODAL
// ═══════════════════════════════════════════════════════════════════════
function UserFormModal({ mode, initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    email: initial?.email || "",
    password: "",
    role: initial?.role || "user",
  });
  const [submitting, setSubmitting] = useState(false);

  const isEdit = mode === "edit";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || (!isEdit && !form.password)) {
      toast.error("Please fill all required fields");
      return;
    }
    setSubmitting(true);
    try {
      if (isEdit) {
        const payload = { name: form.name, email: form.email, role: form.role };
        if (form.password) payload.password = form.password;
        await adminAPI.updateUser(initial.id, payload);
        toast.success("User updated");
      } else {
        await adminAPI.createUser(form);
        toast.success("User created");
      }
      onSaved();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to save user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{isEdit ? "Edit User" : "Create User"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Name *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 px-3 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email *</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 px-3 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Password {isEdit ? "(leave blank to keep)" : "*"}
            </label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 px-3 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
              required={!isEdit} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 px-3 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:bg-slate-800/50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-60">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isEdit ? "Save Changes" : "Create User"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════
export default function AdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null); // { mode: "create"|"edit", initial: obj|null }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [roleUpdating, setRoleUpdating] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getUsers();
      setUsers(res.data.data || []);
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleRoleChange = async (id, role) => {
    setRoleUpdating(id);
    const prev = [...users];
    setUsers((u) => u.map((x) => (x.id === id ? { ...x, role } : x)));
    try {
      await adminAPI.updateUserRole(id, role);
      toast.success("Role updated");
    } catch {
      setUsers(prev);
      toast.error("Failed to update role");
    } finally { setRoleUpdating(null); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminAPI.deleteUser(deleteTarget.id);
      setUsers((u) => u.filter((x) => x.id !== deleteTarget.id));
      toast.success("User deleted");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to delete");
    }
    setDeleteTarget(null);
  };

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-20">
        <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Access Denied</h3>
        <p className="text-slate-500 dark:text-slate-300 mt-1">You need admin privileges to view this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl bg-gradient-to-r from-slate-700 to-slate-800 shadow-xl p-6 sm:p-8 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">User Management</h2>
            <p className="text-slate-300 mt-1.5">Manage application users — create, edit, and remove accounts</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm text-white text-sm">
              <span className="font-bold text-2xl">{users.length}</span>
              <span className="ml-2 text-slate-300">users</span>
            </div>
            <button onClick={() => setModal({ mode: "create", initial: null })}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-slate-800 dark:text-white
                bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 shadow-lg transition-all duration-200">
              <Plus className="w-4 h-4" /> Create User
            </button>
          </div>
        </div>
      </motion.div>

      {/* Error */}
      {error && (
        <motion.div variants={itemV} initial="hidden" animate="visible"
          className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
          <button onClick={loadUsers} className="ml-auto text-red-600 hover:underline font-medium">Retry</button>
        </motion.div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : users.length === 0 ? (
        /* Empty */
        <motion.div variants={itemV} initial="hidden" animate="visible"
          className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">No users found</h3>
          <p className="text-slate-500 dark:text-slate-300 mt-1 mb-6">Create your first user to get started</p>
          <button onClick={() => setModal({ mode: "create", initial: null })}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg shadow-emerald-500/25 transition-all">
            <Plus className="w-5 h-5" /> Create User
          </button>
        </motion.div>
      ) : (
        /* Users Table */
        <motion.div variants={itemV} initial="hidden" animate="visible"
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden">
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700
            text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
            <div className="col-span-3">User</div>
            <div className="col-span-3">Email</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-2">Created</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {users.map((u) => (
              <div key={u.id}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-6 py-4 items-center
                  hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                {/* Name + avatar */}
                <div className="sm:col-span-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600
                    flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {u.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{u.name}</p>
                    {u.id === user?.id && (
                      <span className="text-[10px] text-emerald-600 font-medium">(you)</span>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="sm:col-span-3 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                  <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-300 flex-shrink-0" />
                  <span className="truncate">{u.email}</span>
                </div>

                {/* Role */}
                <div className="sm:col-span-2">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    disabled={roleUpdating === u.id}
                    className={`w-full sm:w-auto px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all outline-none
                      ${u.role === "admin"
                        ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                        : "bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600"}`}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {/* Created */}
                <div className="sm:col-span-2 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-300">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-300 flex-shrink-0" />
                  <span>{new Date(u.created_at).toLocaleDateString()}</span>
                </div>

                {/* Actions */}
                <div className="sm:col-span-2 flex items-center justify-end gap-1.5">
                  <button onClick={() => setModal({ mode: "edit", initial: u })}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300
                      hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    Edit
                  </button>
                  {u.id !== user?.id && (
                    <button onClick={() => setDeleteTarget(u)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400
                        hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <UserFormModal
            mode={modal.mode}
            initial={modal.initial}
            onClose={() => setModal(null)}
            onSaved={() => { setModal(null); loadUsers(); }}
          />
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      {deleteTarget && (
        <ConfirmModal
          title="Delete User"
          message={`Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
