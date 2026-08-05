import React, { useEffect } from "react";
import { useForm } from "react-hook-form";

// Simple modal for create/edit user. Uses react-hook-form for validation.
export default function UserModal({
  open,
  mode = "create",
  initialData = {},
  onClose,
  onSubmit,
  submitting,
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "user",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: initialData.name || "",
        email: initialData.email || "",
        password: "",
        role: initialData.role || "user",
      });
    }
  }, [open, initialData, reset]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded shadow-lg w-full max-w-lg p-6">
        <h3 className="text-lg font-semibold mb-4">
          {mode === "create" ? "Create user" : "Edit user"}
        </h3>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3">
          <div>
            <label className="block text-sm">Name</label>
            <input
              className="input w-full"
              {...register("name", { required: "Name is required" })}
            />
            {errors.name && (
              <div className="text-red-500 text-sm">{errors.name.message}</div>
            )}
          </div>

          <div>
            <label className="block text-sm">Email</label>
            <input
              className="input w-full"
              {...register("email", { required: "Email is required" })}
            />
            {errors.email && (
              <div className="text-red-500 text-sm">{errors.email.message}</div>
            )}
          </div>

          <div>
            <label className="block text-sm">
              Password{" "}
              {mode === "edit" && (
                <span className="text-xs text-gray-500">
                  (leave blank to keep)
                </span>
              )}
            </label>
            <input
              className="input w-full"
              type="password"
              {...register("password")}
            />
          </div>

          <div>
            <label className="block text-sm">Role</label>
            <select className="select w-full" {...register("role")}>
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? "Saving..." : mode === "create" ? "Create" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
