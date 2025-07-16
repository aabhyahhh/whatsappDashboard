import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import ChatView from './pages/ChatView';
import AdminManagement from './pages/AdminManagement';
import UserManagement from './pages/UserManagement';
import OTPVerification from './pages/OTPVerification';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';
import LoanReplyLog from './pages/LoanReplyLog';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/dashboard/contacts" element={
          <ProtectedRoute>
            <Contacts />
          </ProtectedRoute>
        } />
        <Route path="/dashboard/otp" element={
          <ProtectedRoute>
            <OTPVerification />
          </ProtectedRoute>
        } />
        <Route path="/dashboard/chat/:phone" element={
          <ProtectedRoute>
            <ChatView />
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute>
            <AdminManagement />
          </ProtectedRoute>
        } />
        <Route path="/users" element={
          <ProtectedRoute>
            <UserManagement />
          </ProtectedRoute>
        } />
        <Route path="/loan-replies" element={
          <ProtectedRoute>
            <LoanReplyLog />
          </ProtectedRoute>
        } />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
