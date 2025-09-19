// src/shared/routes/ProtectedRoute.tsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type Props = { children: React.ReactNode };

export default function ProtectedRoute({ children }: Props) {
  const { user, loading } = useAuth();

  // While auth state is resolving → show loading screen
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-white">
        Checking authentication...
      </div>
    );
  }

  // If not logged in → redirect to login
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Authenticated → render the page
  return <>{children}</>;
}
