import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { BookmarkProvider } from './context/BookmarkContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { EmergencyAlertBanner } from './components/EmergencyAlertBanner';
import { OfflineNotice } from './components/OfflineNotice';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ScrollToTop } from './components/ScrollToTop';
import { ScreenSkeleton } from './components/SkeletonScreen';
import { ScrollProgressBar } from './components/ScrollProgressBar';
import { PageTransition } from './components/PageTransition';
import { SmoothScroll } from './components/SmoothScroll';

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
const Emergency = lazy(() => import('./pages/Emergency').then((m) => ({ default: m.Emergency })));
const Categories = lazy(() =>
  import('./pages/Categories').then((m) => ({ default: m.Categories }))
);
const CategoryPage = lazy(() =>
  import('./pages/CategoryPage').then((m) => ({ default: m.CategoryPage }))
);
const Suggest = lazy(() => import('./pages/Suggest').then((m) => ({ default: m.Suggest })));
const Report = lazy(() => import('./pages/Report').then((m) => ({ default: m.Report })));
const NotFound = lazy(() => import('./pages/NotFound').then((m) => ({ default: m.NotFound })));
const SylvaExperience = lazy(() => import('./pages/SylvaExperience').then((m) => ({ default: m.SylvaExperience })));

const AppRoutes: React.FC = () => {
  const { pathname } = useLocation();
  const immersiveRoute = pathname === '/sylva';

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-[var(--tp-bg)] text-[var(--tp-text)] font-sans transition-colors duration-200">
        {!immersiveRoute && <ScrollProgressBar />}
        {!immersiveRoute && <OfflineNotice />}
        {!immersiveRoute && <Header />}
        {!immersiveRoute && <EmergencyAlertBanner />}
        <ScrollToTop />
        <div id="main-content" className="flex-1 flex flex-col">
          <PageTransition>
            <Suspense fallback={<ScreenSkeleton />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/emergency" element={<Emergency />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/c/:slug" element={<CategoryPage />} />
                <Route path="/map" element={<MapView />} />
                <Route path="/listings/:id" element={<ListingDetail />} />
                <Route path="/submit" element={<SubmitListing />} />
                <Route path="/suggest" element={<Suggest />} />
                <Route path="/report" element={<Report />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/about" element={<About />} />
                <Route path="/accessibility" element={<AccessibilityStatement />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/sylva" element={<SylvaExperience />} />

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

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </PageTransition>
        </div>
        {!immersiveRoute && <Footer />}
      </div>
    </ErrorBoundary>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <BookmarkProvider>
        <SmoothScroll>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </SmoothScroll>
      </BookmarkProvider>
    </ThemeProvider>
  );
};
export default App;
