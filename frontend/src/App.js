import BrowseRouter from "./BrowseRouter";
import { ThemeProvider } from "./components/theme-provider";
import { ToastProvider } from "./context/ToastContext";

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <ToastProvider>
        <BrowseRouter />
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
