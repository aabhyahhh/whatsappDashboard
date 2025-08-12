import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import ChatView from './pages/ChatView';
import AdminManagement from './pages/AdminManagement';
import UserManagement from './pages/UserManagement';
import OTPVerification from './pages/OTPVerification';
import ProtectedRoute from './components/ProtectedRoute';
import { ContactsProvider } from './contexts/ContactsContext';
import './App.css';
import LoanReplyLog from './pages/LoanReplyLog';
import ActiveVendors24h from './pages/ActiveVendors24h';
import SupportCalls from './pages/SupportCalls';
import InactiveVendors from './pages/InactiveVendors';
import MessageHealth from './pages/MessageHealth';

function App() {
  return (
    <ContactsProvider>
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
          <Route path="/dashboard/active-vendors-24h" element={
            <ProtectedRoute>
              <ActiveVendors24h />
            </ProtectedRoute>
          } />
          <Route path="/support-calls" element={
            <ProtectedRoute>
              <SupportCalls />
            </ProtectedRoute>
          } />
          <Route path="/inactive-vendors" element={
            <ProtectedRoute>
              <InactiveVendors />
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
          <Route path="/message-health" element={
            <ProtectedRoute>
              <MessageHealth />
            </ProtectedRoute>
          } />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </ContactsProvider>
  );
}

export default App;
