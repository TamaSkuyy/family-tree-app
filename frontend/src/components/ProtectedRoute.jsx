import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // While auth state is loading, show a small spinner
  if (loading)
    return (
      <div className="w-full h-48 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
