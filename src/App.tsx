import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import Index from "./pages/Index";
import FindPlacements from "./pages/FindPlacements";
import ForCompanies from "./pages/ForCompanies";
import About from "./pages/About";
import SignIn from "./pages/SignIn";
import StudentProfile from "./pages/StudentProfile";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import NotificationsPage from "./pages/Notifications";
import NotificationPreferences from "./pages/NotificationPreferences";
import AdminAnalytics from "./pages/AdminAnalytics";
import FeedbackPage from "./pages/Feedback";
import LearningHub from "./pages/LearningHub";
import JobFeed from "./pages/JobFeed";
import CareerExplorer from "./pages/CareerExplorer";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
