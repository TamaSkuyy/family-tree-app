import React from "react";

const ConfirmModal = ({
  open,
  title = "Confirm",
  message,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded shadow p-4 max-w-md w-full">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
