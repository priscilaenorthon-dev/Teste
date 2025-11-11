import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Tools from "@/pages/tools";
import Loans from "@/pages/loans";
import Returns from "@/pages/returns";
import Inventory from "@/pages/inventory";
import Calibration from "@/pages/calibration";
import Reports from "@/pages/reports";
import Users from "@/pages/users";
import Classes from "@/pages/classes";
import Models from "@/pages/models";
import ImprovementIdeas from "@/pages/improvement-ideas";

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Switch>
          <Route path="/" component={Login} />
          <Route component={Login} />
        </Switch>
        <Toaster />
      </>
    );
  }

  return (
    <>
      <SidebarProvider style={sidebarStyle as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <header className="flex items-center justify-between px-4 py-3 border-b bg-card">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sistema JOMAGA</span>
              </div>
            </header>
            <main className="flex-1 overflow-y-auto">
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/tools" component={Tools} />
                <Route path="/loans" component={Loans} />
                <Route path="/returns" component={Returns} />
                <Route path="/inventory" component={Inventory} />
                <Route path="/calibration" component={Calibration} />
                <Route path="/reports" component={Reports} />
                <Route path="/users" component={Users} />
                <Route path="/classes" component={Classes} />
                <Route path="/models" component={Models} />
                <Route path="/improvement-ideas" component={ImprovementIdeas} />
                <Route component={NotFound} />
              </Switch>
            </main>
          </div>
        </div>
      </SidebarProvider>
      <Toaster />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
