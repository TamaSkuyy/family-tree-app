import React from "react";

// Very small toast item
export const Toast = ({ type = "info", message }) => {
  const bg =
    type === "success"
      ? "bg-green-500"
      : type === "error"
      ? "bg-red-500"
      : "bg-gray-600";
  return (
    <div className={`text-white px-4 py-2 rounded shadow ${bg}`} role="status">
      {message}
    </div>
  );
};

export default Toast;
