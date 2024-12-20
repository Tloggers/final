import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Alerts from "./pages/Alerts";
import Analytics from "./pages/Analytics";
import RemoteControl from "./pages/RemoteControl";
import WaterFlowPage from "./pages/WaterFlowPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/remote-control" element={<RemoteControl />} />
        <Route path="/water-flow" element={<WaterFlowPage />} /> {/* Add this line */}
      </Routes>
    </Router>
  );
}

export default App;
