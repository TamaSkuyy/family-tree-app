import React, { createContext, useContext } from "react";
import { Toaster, toast } from "react-hot-toast";

// Thin compatibility wrapper so existing code that calls useToast() (push({type,message})) keeps working.
const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const push = ({ type = "info", message = "" }) => {
    if (!message) return;
    if (type === "success") return toast.success(message);
    if (type === "error") return toast.error(message);
    if (type === "loading") return toast.loading(message);
    return toast(message);
  };

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <Toaster position="top-right" reverseOrder={false} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.push;
};

export default ToastContext;
