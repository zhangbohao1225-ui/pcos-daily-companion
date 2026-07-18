import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import CalendarPage from "./pages/CalendarPage";
import ProfilePage from "./pages/ProfilePage";
import InsightsPage from "./pages/InsightsPage";
import CheckinPage from "./pages/CheckinPage";
import TeamPage from "./pages/TeamPage";
import ForumPage from "./pages/ForumPage";
import GrowthPage from "./pages/GrowthPage";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/checkin"} component={CheckinPage} />
      <Route path={"/team"} component={TeamPage} />
      <Route path={"/forum"} component={ForumPage} />
      <Route path={"/growth"} component={GrowthPage} />
      <Route path={"/calendar"} component={CalendarPage} />
      <Route path={"/profile"} component={ProfilePage} />
      <Route path={"/insights"} component={InsightsPage} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
