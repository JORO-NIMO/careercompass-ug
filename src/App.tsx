import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { AuthProvider } from "./hooks/AuthProvider";
import { usePageTracking } from "./hooks/usePageTracking";
import ErrorBoundary from "./components/ErrorBoundary";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

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
const NotificationsPage = lazy(() => import("./pages/Notifications"));
const NotificationPreferences = lazy(() => import("./pages/NotificationPreferences"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const FeedbackPage = lazy(() => import("./pages/Feedback"));
const LearningHub = lazy(() => import("./pages/LearningHub"));
const JobFeed = lazy(() => import("./pages/JobFeed"));
const CareerExplorer = lazy(() => import("./pages/CareerExplorer"));
const ApplicationTips = lazy(() => import("./pages/ApplicationTips"));
const CVBuilder = lazy(() => import("./pages/CVBuilder"));
const FindTalent = lazy(() => import("./pages/FindTalent"));

const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Support = lazy(() => import("./pages/Support"));
const UserDashboard = lazy(() => import("./pages/UserDashboard"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
const HowToWriteACV = lazy(() => import("./pages/HowToWriteACV"));
const InterviewTipsUganda = lazy(() => import("./pages/InterviewTipsUganda"));
const TopInternships = lazy(() => import("./pages/TopInternships"));
const CareerTrendsBlog = lazy(() => import("./pages/CareerTrendsBlog"));
const UpdateDetails = lazy(() => import("./pages/UpdateDetails"));

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
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

// Layout component to handle Header/Footer visibility
const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  // Define routes where Header/Footer might be optional or different if needed
  // For now, per user request, we include specific Header items globally.
  // We exclude purely auth flow pages if they need a cleaner look, but "all pages" was the request.
  // However, Admin Dashboard has its own layout, so we exclude it.
  const isAdmin = location.pathname.startsWith("/admin");

  if (isAdmin) {
    return <main>{children}</main>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
};

// Router component with analytics
function AppRouter() {
  usePageTracking();

  return (
    <AppLayout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/find-placements" element={<FindPlacements />} />
          <Route path="/for-companies" element={<ForCompanies />} />
          <Route path="/about" element={<About />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/profile" element={<StudentProfile />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/notification-preferences" element={<NotificationPreferences />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/learning" element={<LearningHub />} />
          <Route path="/jobs" element={<JobFeed />} />
          <Route path="/career-explorer" element={<CareerExplorer />} />
          <Route path="/application-tips" element={<ApplicationTips />} />
          <Route path="/cv-builder" element={<CVBuilder />} />
          <Route path="/find-talent" element={<FindTalent />} />

          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/support" element={<Support />} />
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/oauth/consent" element={<OAuthConsent />} />
          <Route path="/guides/how-to-write-a-cv" element={<HowToWriteACV />} />
          <Route path="/guides/interview-tips-uganda" element={<InterviewTipsUganda />} />
          <Route path="/insights/top-internships/:industry" element={<TopInternships />} />
          <Route path="/insights/career-trends" element={<CareerTrendsBlog />} />
          <Route path="/updates/:id" element={<UpdateDetails />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <AppRouter />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
