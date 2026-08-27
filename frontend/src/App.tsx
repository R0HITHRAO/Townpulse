import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import { Home } from './pages/Home';
import { MapView } from './pages/MapView';
import { ListingDetail } from './pages/ListingDetail';
import { SubmitListing } from './pages/SubmitListing';
import { BusinessDashboard } from './pages/BusinessDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { About } from './pages/About';
import { AccessibilityStatement } from './pages/AccessibilityStatement';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-slate-50 text-gray-900 font-sans">
        <Header />
        <div className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/listings/:id" element={<ListingDetail />} />
            <Route path="/submit" element={<SubmitListing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/about" element={<About />} />
            <Route path="/accessibility" element={<AccessibilityStatement />} />

            {/* Business Owner Protected Route */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requireBusiness>
                  <BusinessDashboard />
                </ProtectedRoute>
              }
            />

            {/* Admin Protected Route */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  );
};
export default App;
