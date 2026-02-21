import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { type ReactNode } from "react";
import { TopBar } from "@/components/learnforge/TopBar";
import HomePage from "./pages/HomePage";
import GeneratePage from "./pages/GeneratePage";
import CoursePage from "./pages/CoursePage";
import MonitorPage from "./pages/MonitorPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const BACKEND_URL = "http://localhost:8000";

function Layout() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <TopBar />
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}

function HomeLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <TopBar />
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}

function CourseLayoutWithCopilot() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <TopBar />
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}

function MaybeCopilotKit({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <MaybeCopilotKit>
        <BrowserRouter>
          <Routes>
            <Route element={<HomeLayout />}>
              <Route path="/" element={<HomePage />} />
            </Route>
            <Route element={<Layout />}>
              <Route path="/generate" element={<GeneratePage />} />
              <Route path="/monitor" element={<MonitorPage />} />
            </Route>
            <Route element={<CourseLayoutWithCopilot />}>
              <Route path="/course" element={<CoursePage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </MaybeCopilotKit>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
