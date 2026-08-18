import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { lazy, Suspense, useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
const LoginPage = lazy(() => import("./pages/LoginPage"));
const ReceptionPage = lazy(() => import("./pages/ReceptionPage"));
const UserManagementPage = lazy(() => import("./pages/UserManagementPage"));

function PageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex items-center gap-3 rounded-2xl border bg-card px-5 py-4 text-sm text-muted-foreground shadow-sm">
        <Loader2 className="size-4 animate-spin text-primary" />
        Carregando ambiente seguro…
      </div>
    </div>
  );
}

function ProtectedPage({ children, requiredLevel = 2 }: { children: React.ReactNode; requiredLevel?: 1 | 2 }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) setLocation("/login");
    if (!loading && user && user.level > requiredLevel) setLocation("/");
  }, [loading, requiredLevel, setLocation, user]);

  if (loading || !user || user.level > requiredLevel) return <PageLoading />;
  return <DashboardLayout>{children}</DashboardLayout>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/usuarios">
        <ProtectedPage requiredLevel={1}>
          <UserManagementPage />
        </ProtectedPage>
      </Route>
      <Route path="/bases/programacao">
        <ProtectedPage>
          <ReceptionPage mode="agenda" />
        </ProtectedPage>
      </Route>
      <Route path="/">
        <ProtectedPage>
          <ReceptionPage mode="dashboard" />
        </ProtectedPage>
      </Route>
      <Route>
        <ProtectedPage>
          <ReceptionPage mode="dashboard" />
        </ProtectedPage>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Suspense fallback={<PageLoading />}><Router /></Suspense>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
