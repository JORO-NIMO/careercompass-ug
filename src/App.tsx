import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { AuthProvider } from "./hooks/AuthProvider";
import { LocaleProvider } from "./hooks/LocaleProvider";
import { useAuth } from "./hooks/useAuth";
import { usePageTracking } from "./hooks/usePageTracking";
import ErrorBoundary from "./components/common/ErrorBoundary";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AccessBlocked from "./pages/AccessBlocked";
import { checkAccess } from "./services/accessControl";

// Eager load critical pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Lazy load other pages for better performance
const FindPlacements = lazy(() => import("./pages/FindPlacements"));
const ForCompanies = lazy(() => import("./pages/ForCompanies"));
const About = lazy(() => import("./pages/About"));
const SignIn = lazy(() => import("./pages/SignIn"));
const StudentProfile = lazy(() => import("./pages/StudentProfile"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminListingsReview = lazy(() => import("./pages/AdminListingsReview"));
const NotificationsPage = lazy(() => import("./pages/Notifications"));
const NotificationPreferences = lazy(() => import("./pages/NotificationPreferences"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const AdminWorkflowAnalytics = lazy(() => import("./pages/AdminWorkflowAnalytics"));
const AdminAIUsage = lazy(() => import("./pages/AdminAIUsage"));
const AdminSecurity = lazy(() => import("./pages/AdminSecurity"));
const FeedbackPage = lazy(() => import("./pages/Feedback"));
const LearningHub = lazy(() => import("./pages/LearningHub"));
const JobFeed = lazy(() => import("./pages/JobFeed"));
const CVBuilder = lazy(() => import("./pages/CVBuilder"));
const FindTalent = lazy(() => import("./pages/FindTalent"));
const Updates = lazy(() => import("./pages/Updates"));
const PlacementDetails = lazy(() => import("./pages/PlacementDetails"));

const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Support = lazy(() => import("./pages/Support"));
const UserDashboard = lazy(() => import("./pages/UserDashboard"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
const HowToWriteACV = lazy(() => import("./pages/HowToWriteACV"));
const InterviewTipsUganda = lazy(() => import("./pages/InterviewTipsUganda"));
const InterviewTips = lazy(() => import("./pages/InterviewTips"));
const TopInternships = lazy(() => import("./pages/TopInternships"));
const CareerTrendsBlog = lazy(() => import("./pages/CareerTrendsBlog"));
const UpdateDetails = lazy(() => import("./pages/UpdateDetails"));
const ApplicationTips = lazy(() => import("./pages/ApplicationTips"));
const PublicDataView = lazy(() => import("./pages/PublicDataView"));
const OpportunitiesChat = lazy(() => import("./pages/OpportunitiesChat"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    <p className="text-muted-foreground font-medium animate-pulse">Thinking...</p>
  </div>
);

// Lazy load ChatWidget
const ChatWidget = lazy(() => import("./components/ChatWidget"));

// Layout component to handle Header/Footer visibility
import { useState } from "react";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { user } = useAuth();
  const [blocked, setBlocked] = useState<{ blocked: boolean; message?: string; terms?: string }>({ blocked: false });

  useEffect(() => {
    void (async () => {
      const res = await checkAccess();
      if (!res.allowed) setBlocked({ blocked: true, message: res.message, terms: res.terms });
      else setBlocked({ blocked: false });
    })();
  }, [location.pathname]);
  // Define routes where Header/Footer might be optional or different if needed
  // For now, per user request, we include specific Header items globally.
  // We exclude purely auth flow pages if they need a cleaner look, but "all pages" was the request.
  // However, Admin Dashboard has its own layout, so we exclude it.
  const isAdmin = location.pathname.startsWith("/admin");

  if (blocked.blocked) {
    return <AccessBlocked message={blocked.message} terms={blocked.terms} />;
  }

  if (isAdmin) {
    return (
      <main>
        {children}
      </main>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main id="main-content" className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
};

// Clean up hash from URL on navigation and scroll to top
function ScrollToTop() {
  const location = useLocation();
  
  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo(0, 0);
    
    // Remove hash from URL if it's just #main-content (accessibility skip link)
    if (window.location.hash === '#main-content') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, [location.pathname]);
  
  return null;
}

// Router component with analytics
function AppRouter() {
  usePageTracking();

  return (
    <>
      <ScrollToTop />
      <AppLayout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/find-placements" element={<FindPlacements />} />
            <Route path="/for-companies" element={<ForCompanies />} />
            <Route path="/about" element={<About />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/profile" element={<StudentProfile />} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/listings-review" element={<AdminRoute><AdminListingsReview /></AdminRoute>} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/notification-preferences" element={<NotificationPreferences />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/admin/analytics" element={<AdminRoute><AdminAnalytics /></AdminRoute>} />
          <Route path="/admin/ai-usage" element={<AdminRoute><AdminAIUsage /></AdminRoute>} />
          <Route path="/admin/security" element={<AdminRoute><AdminSecurity /></AdminRoute>} />
          <Route path="/learning" element={<LearningHub />} />
          <Route path="/jobs" element={<JobFeed />} />
          <Route path="/cv-builder" element={<CVBuilder />} />
          <Route path="/find-talent" element={<FindTalent />} />
          <Route path="/updates" element={<Updates />} />

          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/support" element={<Support />} />
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/oauth/consent" element={<OAuthConsent />} />
          <Route path="/guides/how-to-write-a-cv" element={<HowToWriteACV />} />
          <Route path="/guides/interview-tips-uganda" element={<InterviewTipsUganda />} />
          <Route path="/guides/interview-tips" element={<InterviewTips />} />
          <Route path="/insights/top-internships/:industry" element={<TopInternships />} />
          <Route path="/insights/career-trends" element={<CareerTrendsBlog />} />
          <Route path="/updates/:id" element={<UpdateDetails />} />
           <Route path="/placements/:id" element={<PlacementDetails />} />
          <Route path="/application-tips" element={<ApplicationTips />} />
          <Route path="/opportunities-chat" element={<ProtectedRoute><OpportunitiesChat /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AppLayout>
    </>
  );
}

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/signin" state={{ from: location }} replace />;

  return <>{children}</>;
};

// Admin-only Route Component
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/signin" state={{ from: location }} replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LocaleProvider>
          <TooltipProvider>
            <Toaster />
            <BrowserRouter>
            <AppLayout>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/find-placements" element={<FindPlacements />} />
                  <Route path="/for-companies" element={<ForCompanies />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/signin" element={<SignIn />} />
                  <Route path="/profile" element={<StudentProfile />} />
                  <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                  <Route path="/admin/listings-review" element={<AdminRoute><AdminListingsReview /></AdminRoute>} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/notification-preferences" element={<NotificationPreferences />} />
                  <Route path="/feedback" element={<FeedbackPage />} />
                  <Route path="/admin/analytics" element={<AdminRoute><AdminAnalytics /></AdminRoute>} />
                  <Route path="/admin/ai-usage" element={<AdminRoute><AdminAIUsage /></AdminRoute>} />
                  <Route path="/admin/workflows" element={<AdminRoute><AdminWorkflowAnalytics /></AdminRoute>} />
                  <Route path="/admin/security" element={<AdminRoute><AdminSecurity /></AdminRoute>} />
                  <Route path="/learning" element={<LearningHub />} />
                  <Route path="/jobs" element={<JobFeed />} />
                  <Route path="/cv-builder" element={<CVBuilder />} />
                  <Route
                    path="/find-talent"
                    element={
                      <ProtectedRoute>
                        <FindTalent />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/updates" element={<Updates />} />

                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/support" element={<Support />} />
                  <Route path="/dashboard" element={<UserDashboard />} />
                  <Route path="/oauth/consent" element={<OAuthConsent />} />
                  <Route path="/guides/how-to-write-a-cv" element={<HowToWriteACV />} />
                  <Route path="/guides/interview-tips-uganda" element={<InterviewTipsUganda />} />
                  <Route path="/guides/interview-tips" element={<InterviewTips />} />
                  <Route path="/insights/top-internships/:industry" element={<TopInternships />} />
                  <Route path="/insights/career-trends" element={<CareerTrendsBlog />} />
                  <Route path="/updates/:id" element={<UpdateDetails />} />
                    <Route path="/placements/:id" element={<PlacementDetails />} />
                  <Route path="/application-tips" element={<ApplicationTips />} />
                  <Route path="/data/:id" element={<PublicDataView />} />
                  <Route path="/opportunities-chat" element={<OpportunitiesChat />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AppLayout>
            </BrowserRouter>
          </TooltipProvider>
        </LocaleProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
