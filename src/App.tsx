import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { EdgeCaseHandler } from "./components/EdgeCaseHandler";
import QuoteScreen from "./pages/QuoteScreen";
import ConfirmScreen from "./pages/ConfirmScreen";
import StatusScreen from "./pages/StatusScreen";

function App() {
  return (
    <AppProvider>
      <Router>
        <EdgeCaseHandler>
          <Routes>
            <Route path="/" element={<QuoteScreen />} />
            <Route path="/confirm" element={<ConfirmScreen />} />
            <Route path="/status" element={<StatusScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </EdgeCaseHandler>
      </Router>
    </AppProvider>
  );
}

export default App;
