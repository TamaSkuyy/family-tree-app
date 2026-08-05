import React, { useEffect, useState, useMemo } from "react";
import DataTable from "react-data-table-component";
import { adminAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import ConfirmModal from "../components/ConfirmModal";

const AdminUsers = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getUsers();
      setUsers(res.data.data || []);
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Listen for events from row actions to keep list in sync (delete/update)
  useEffect(() => {
    const onDeleted = (e) => {
      const id = e?.detail?.id;
      if (!id) return;
      setUsers((s) => s.filter((u) => u.id !== id));
    };
    const onUpdated = (e) => {
      const updated = e?.detail?.user;
      if (!updated) return;
      setUsers((s) => s.map((u) => (u.id === updated.id ? updated : u)));
    };
    window.addEventListener("admin:user:deleted", onDeleted);
    window.addEventListener("admin:user:updated", onUpdated);
    return () => {
      window.removeEventListener("admin:user:deleted", onDeleted);
      window.removeEventListener("admin:user:updated", onUpdated);
    };
  }, []);

  const updateRole = async (id, role) => {
    const prev = users.slice();
    setUsers((u) => u.map((x) => (x.id === id ? { ...x, role } : x)));
    try {
      await adminAPI.updateUserRole(id, role);
      push({ type: "success", message: "Role updated" });
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
      setUsers(prev);
      push({ type: "error", message: "Failed to update role" });
    }
  };

  const push = useToast();

  // Create user
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
  });

  // We'll use a modal for create/edit flows. keep creating flag for submit state.

  // Delete user
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const requestDelete = (id) => {
    setToDelete(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    setConfirmOpen(false);
    if (!toDelete) return;
    const prev = users.slice();
    setUsers((s) => s.filter((u) => u.id !== toDelete));
    try {
      await adminAPI.deleteUser(toDelete);
      push({ type: "success", message: "User deleted" });
    } catch (err) {
      setUsers(prev);
      push({
        type: "error",
        message: err?.response?.data?.error || err.message,
      });
    } finally {
      setToDelete(null);
    }
  };

  if (!user || user.role !== "admin") {
    return (
      <div className="p-4">You do not have permission to view this page.</div>
    );
  }

  return (
    <div className="p-4">
      {/* Modal state for create/edit */}
      <UserModal
        open={modalOpen}
        mode={modalMode}
        initialData={modalData}
        onClose={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
        submitting={creating}
      />
      <ConfirmModal
        open={confirmOpen}
        title="Delete user"
        message="Are you sure you want to delete this user? This action cannot be undone."
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
      />

      <h2 className="text-xl font-semibold mb-4">User Management</h2>
      <div className="mb-4 p-4 bg-white rounded shadow flex justify-between items-center">
        <div>
          <strong>Manage application users</strong>
          <div className="text-sm text-gray-500">
            Create, edit or remove users
          </div>
        </div>
        <div>
          <button className="btn btn-primary" onClick={() => openCreateModal()}>
            Create user
          </button>
        </div>
      </div>

      {error && <div className="text-red-500 mb-2">{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="bg-white rounded shadow">
          <DataTable
            columns={columns}
            data={users}
            pagination
            highlightOnHover
            defaultSortFieldId={4}
            dense
          />
        </div>
      )}
    </div>
  );
};

export default AdminUsers;

// Local component for editable row
function EditableUserRow() {
  // Kept for backwards compatibility if needed; rows are rendered via DataTable custom cells below.
  return null;
}

// Columns definition for react-data-table-component
const columns = [
  {
    name: "Name",
    selector: (row) => row.name,
    sortable: true,
    cell: (row) => <UserNameCell row={row} />,
    id: 1,
  },
  {
    name: "Email",
    selector: (row) => row.email,
    sortable: true,
    cell: (row) => <UserEmailCell row={row} />,
    id: 2,
  },
  {
    name: "Role",
    selector: (row) => row.role,
    sortable: true,
    cell: (row) => <UserRoleCell row={row} />,
    id: 3,
  },
  {
    name: "Created",
    selector: (row) => row.created_at,
    sortable: true,
    cell: (row) => new Date(row.created_at).toLocaleString(),
    id: 4,
  },
  {
    name: "Actions",
    cell: (row) => <UserActionsCell row={row} />,
    ignoreRowClick: true,
    allowOverflow: true,
    button: true,
    id: 5,
  },
];

function UserNameCell({ row }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(row.name);
  useEffect(() => setValue(row.name), [row.name]);
  return editing ? (
    <input
      className="input input-sm"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => setEditing(false)}
      onKeyDown={(e) => {
        if (e.key === "Enter") setEditing(false);
      }}
    />
  ) : (
    <div onDoubleClick={() => setEditing(true)}>{row.name}</div>
  );
}

function UserEmailCell({ row }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(row.email);
  useEffect(() => setValue(row.email), [row.email]);
  return editing ? (
    <input
      className="input input-sm"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => setEditing(false)}
      onKeyDown={(e) => {
        if (e.key === "Enter") setEditing(false);
      }}
    />
  ) : (
    <div onDoubleClick={() => setEditing(true)}>{row.email}</div>
  );
}

function UserRoleCell({ row }) {
  const push = useToast();
  const [role, setRole] = useState(row.role);
  useEffect(() => setRole(row.role), [row.role]);
  const handle = async (r) => {
    setRole(r);
    try {
      await adminAPI.updateUserRole(row.id, r);
      push({ type: "success", message: "Role updated" });
      // notify parent/listeners
      window.dispatchEvent(
        new CustomEvent("admin:user:updated", {
          detail: { user: { ...row, role: r } },
        })
      );
    } catch (err) {
      push({
        type: "error",
        message: err?.response?.data?.error || err.message,
      });
      setRole(row.role);
    }
  };

  return (
    <select
      value={role}
      onChange={(e) => handle(e.target.value)}
      className="select select-sm"
    >
      <option value="user">user</option>
      <option value="admin">admin</option>
    </select>
  );
}

// New modal wiring and helper functions
import UserModal from "../components/UserModal";
import { useCallback } from "react";

// modal state
let _modalInserted = false;

const [modalOpen, setModalOpen] = [false, () => {}];

function UserActionsCell({ row }) {
  const push = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: row.name,
    email: row.email,
    password: "",
  });
  useEffect(
    () => setForm({ name: row.name, email: row.email, password: "" }),
    [row]
  );
  const save = async () => {
    const payload = { name: form.name, email: form.email };
    if (form.password && form.password.length > 0)
      payload.password = form.password;
    try {
      const res = await adminAPI.updateUser(row.id, payload);
      push({ type: "success", message: "User updated" });
      // notify parent/listeners with updated user
      if (res?.data?.data) {
        window.dispatchEvent(
          new CustomEvent("admin:user:updated", {
            detail: { user: res.data.data },
          })
        );
      }
    } catch (err) {
      push({
        type: "error",
        message: err?.response?.data?.error || err.message,
      });
    } finally {
      setEditing(false);
    }
  };

  const [confirmOpen, setConfirmOpen] = useState(false);
  const confirmDelete = async () => {
    setConfirmOpen(false);
    try {
      await adminAPI.deleteUser(row.id);
      push({ type: "success", message: "User deleted" });
      // trigger a reload by emitting a custom event the parent listens to
      window.dispatchEvent(
        new CustomEvent("admin:user:deleted", { detail: { id: row.id } })
      );
    } catch (err) {
      push({
        type: "error",
        message: err?.response?.data?.error || err.message,
      });
    }
  };

  return (
    <div className="flex gap-2">
      {editing ? (
        <>
          <input
            className="input input-sm"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Name"
          />
          <input
            className="input input-sm"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="Email"
          />
          <input
            className="input input-sm"
            type="password"
            value={form.password}
            onChange={(e) =>
              setForm((f) => ({ ...f, password: e.target.value }))
            }
            placeholder="New password (leave blank to keep)"
          />
          <button className="btn btn-sm btn-primary" onClick={save}>
            Save
          </button>
          <button className="btn btn-sm" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </>
      ) : (
        <>
          <button className="btn btn-sm" onClick={() => setEditing(true)}>
            Edit
          </button>
          <button
            className="btn btn-sm btn-error"
            onClick={() => setConfirmOpen(true)}
          >
            Delete
          </button>
          <ConfirmModal
            open={confirmOpen}
            title="Delete user"
            message="Are you sure you want to delete this user? This action cannot be undone."
            onCancel={() => setConfirmOpen(false)}
            onConfirm={confirmDelete}
          />
        </>
      )}
    </div>
  );
}
