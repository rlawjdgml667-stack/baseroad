import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Layout from "./components/layout/Layout";
import LoadingSpinner from "./components/ui/LoadingSpinner";

import Home from "./pages/Home";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import SchoolList from "./pages/schools/SchoolList";
import SchoolDetail from "./pages/schools/SchoolDetail";
import PlayerList from "./pages/players/PlayerList";
import PlayerDetail from "./pages/players/PlayerDetail";
import QABoard from "./pages/qa/QABoard";
import Profile from "./pages/profile/Profile";
import CoachDashboard from "./pages/dashboard/CoachDashboard";
import PlayerDashboard from "./pages/dashboard/PlayerDashboard";
import ParentDashboard from "./pages/dashboard/ParentDashboard";
import AdminDashboard from "./pages/dashboard/AdminDashboard";

function ProtectedRoute({ children, roles }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(profile?.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/schools" element={<SchoolList />} />
        <Route path="/schools/:id" element={<SchoolDetail />} />
        <Route path="/players" element={<PlayerList />} />
        <Route path="/players/:id" element={<PlayerDetail />} />
        <Route path="/qa" element={<QABoard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/dashboard/coach" element={
          <ProtectedRoute roles={["coach","admin"]}><CoachDashboard /></ProtectedRoute>
        } />
        <Route path="/dashboard/player" element={
          <ProtectedRoute roles={["player","admin"]}><PlayerDashboard /></ProtectedRoute>
        } />
        <Route path="/dashboard/parent" element={
          <ProtectedRoute roles={["parent","admin"]}><ParentDashboard /></ProtectedRoute>
        } />
        <Route path="/dashboard/admin" element={
          <ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
