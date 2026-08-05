import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useParams,
} from "react-router-dom";
import PersonList from "./components/PersonList.jsx";
import FamilyTree from "./components/FamilyTree.jsx";
import Header from "./components/Header.jsx";
import Login from "./pages/Login.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css";

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <div className="min-h-screen bg-gray-50 text-slate-900">
            {/* Skip link for keyboard users */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:bg-white focus:py-2 focus:px-3 focus:rounded shadow"
            >
              Skip to content
            </a>
            <Header />

            <main id="main-content" role="main" className="py-8">
              <div className="container mx-auto px-4">
                <Routes>
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <PersonList />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/login" element={<Login />} />
                  <Route
                    path="/admin/users"
                    element={
                      <ProtectedRoute>
                        <AdminUsers />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/family-tree/:personId"
                    element={<FamilyTreeWrapper />}
                  />
                </Routes>
              </div>
            </main>

            <footer className="py-6 text-center text-sm text-gray-500">
              © {new Date().getFullYear()} Family Tree App
            </footer>
          </div>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

const FamilyTreeWrapper = () => {
  const { personId } = useParams();
  return <FamilyTree personId={personId} />;
};

export default App;
