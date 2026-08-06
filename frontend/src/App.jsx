import React from "react";
import { Toaster } from "sonner";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useParams,
  useLocation,
} from "react-router-dom";
import PersonList from "./components/PersonList.jsx";
import FamilyTree from "./components/FamilyTree.jsx";
import Header from "./components/Header.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";
import Profile from "./pages/Profile.jsx";
import Help from "./pages/Help.jsx";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import CommandPalette from "./components/CommandPalette";
import "./App.css";

// ═══════════════════════════════════════════════════════════════════════
// Auth pages — full screen, no header/footer
// ═══════════════════════════════════════════════════════════════════════
const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"];

function AppLayout({ children }) {
  const location = useLocation();
  const isAuthPage = AUTH_PATHS.some((p) => location.pathname === p);

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:bg-white dark:bg-slate-800 dark:focus:bg-slate-800 focus:py-2 focus:px-3 focus:rounded shadow"
      >
        Skip to content
      </a>
      <Header />
      <main id="main-content" role="main" className="py-8">
        <div className="container mx-auto px-4">{children}</div>
      </main>
      <footer className="py-6 text-center text-sm text-slate-400 dark:text-slate-500 border-t border-slate-200 dark:border-slate-800 mt-8">
        © {new Date().getFullYear()} Family Tree App  ·  Built with ❤️
      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════

const FamilyTreeWrapper = () => {
  const { personId } = useParams();
  return <FamilyTree personId={personId} />;
};

const RoutesConfig = () => (
  <Routes>
    <Route path="/" element={<ProtectedRoute><PersonList /></ProtectedRoute>} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
    <Route path="/help" element={<Help />} />
    <Route path="/family-tree/:personId" element={<FamilyTreeWrapper />} />
  </Routes>
);

// ═══════════════════════════════════════════════════════════════════════

export default function App() {
  return (
    <Router>
      <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AppLayout>
            <RoutesConfig />
          </AppLayout>
          <CommandPalette />
          <Toaster position="top-right" richColors closeButton toastOptions={{ duration: 4000 }} />
        </ToastProvider>
      </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}
