import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import LogWorkout from "@/pages/LogWorkout";
import ExerciseLibrary from "@/pages/ExerciseLibrary";
import Progress from "@/pages/Progress";
import History from "@/pages/History";

function App() {
  return (
    <div className="App min-h-screen bg-background">
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/log" element={<LogWorkout />} />
            <Route path="/exercises" element={<ExerciseLibrary />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </Layout>
      </BrowserRouter>
      <Toaster position="top-right" />
      <div className="noise-overlay" />
    </div>
  );
}

export default App;
