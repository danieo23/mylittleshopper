import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import StyleVault from './pages/StyleVault';
import Orders from './pages/Orders';
import DashboardLayout from './components/DashboardLayout';

function WithLayout({ children }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/dashboard" element={<WithLayout><Dashboard /></WithLayout>} />
        <Route path="/style-vault" element={<WithLayout><StyleVault /></WithLayout>} />
        <Route path="/orders" element={<WithLayout><Orders /></WithLayout>} />
      </Routes>
    </Router>
  );
}
