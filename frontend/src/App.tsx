import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { BookmarkProvider } from './context/BookmarkContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { EmergencyAlertBanner } from './components/EmergencyAlertBanner';
import { OfflineNotice } from './components/OfflineNotice';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ScrollToTop } from './components/ScrollToTop';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ScrollProgressBar } from './components/ScrollProgressBar';
import { PageTransition } from './components/PageTransition';
import { SiteVideoBackdrop } from './components/SiteVideoBackdrop';

// Pages (route-level code splitting)
const Home = lazy(() => import('./pages/Home').then((m) => ({ default: m.Home })));
const MapView = lazy(() => import('./pages/MapView').then((m) => ({ default: m.MapView })));
const ListingDetail = lazy(() =>
  import('./pages/ListingDetail').then((m) => ({ default: m.ListingDetail }))
);
const SubmitListing = lazy(() =>
  import('./pages/SubmitListing').then((m) => ({ default: m.SubmitListing }))
);
const BusinessDashboard = lazy(() =>
  import('./pages/BusinessDashboard').then((m) => ({ default: m.BusinessDashboard }))
);
const AdminDashboard = lazy(() =>
  import('./pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Register').then((m) => ({ default: m.Register })));
const About = lazy(() => import('./pages/About').then((m) => ({ default: m.About })));
const AccessibilityStatement = lazy(() =>
  import('./pages/AccessibilityStatement').then((m) => ({ default: m.AccessibilityStatement }))
);
const PrivacyPolicy = lazy(() =>
  import('./pages/PrivacyPolicy').then((m) => ({ default: m.PrivacyPolicy }))
);
const Contact = lazy(() => import('./pages/Contact').then((m) => ({ default: m.Contact })));
const NotFound = lazy(() => import('./pages/NotFound').then((m) => ({ default: m.NotFound })));

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <BookmarkProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <div className="tp-app-shell">
              <SiteVideoBackdrop />
              <div className="tp-app-content">
                <ScrollProgressBar />
                <OfflineNotice />
                <Header />
                <EmergencyAlertBanner />
                <ScrollToTop />
                <div id="main-content" className="flex flex-1 flex-col">
                  <PageTransition>
                    <Suspense
                      fallback={<LoadingSpinner className="py-24" message="Loading TownPulse..." />}
                    >
                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/map" element={<MapView />} />
                        <Route path="/listings/:id" element={<ListingDetail />} />
                        <Route path="/submit" element={<SubmitListing />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/accessibility" element={<AccessibilityStatement />} />
                        <Route path="/privacy" element={<PrivacyPolicy />} />
                        <Route path="/contact" element={<Contact />} />

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

                        {/* 404 Catch-all */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </PageTransition>
                </div>
                <Footer />
              </div>
            </div>
          </ErrorBoundary>
        </BrowserRouter>
      </BookmarkProvider>
    </ThemeProvider>
  );
};
export default App;
