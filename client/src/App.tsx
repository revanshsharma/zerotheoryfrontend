import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { lazy, Suspense } from "react";
import { useLocation } from "wouter";
import Home from "./pages/Home";

// Channel Green lives under /channel-green and loads on demand; every other address shows Home as before.
const ChannelGreenPage = lazy(() => import("./channel-green-site/ChannelGreenPage"));

function Routes() {
  const [location] = useLocation();
  if (location === "/channel-green" || location.startsWith("/channel-green/")) {
    return (
      <Suspense fallback={<div style={{ minHeight: "100dvh", background: "#0b1f15" }} aria-busy="true" />}>
        <ChannelGreenPage />
      </Suspense>
    );
  }
  return <Home />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Routes />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
