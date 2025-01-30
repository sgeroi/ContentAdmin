import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import { useUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";
import Dashboard from "@/pages/dashboard";
import Questions from "@/pages/questions";
import QuestionEditor from "@/pages/questions/editor";
import Packages from "@/pages/packages";
import Tags from "@/pages/tags";
import Layout from "@/components/layout";
import GenerateQuestions from "@/pages/questions/generate";

function Router() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/questions" component={Questions} />
        <Route path="/questions/new" component={QuestionEditor} />
        <Route path="/questions/generate" component={GenerateQuestions} />
        <Route path="/questions/:id">
          {(params) => <QuestionEditor id={params.id} />}
        </Route>
        <Route path="/packages" component={Packages} />
        <Route path="/tags" component={Tags} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;