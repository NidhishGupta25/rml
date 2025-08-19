import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Analyzer from "./components/Analyzer";

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Hero />} />
        <Route path="/hero" element={<Hero />} />
        <Route path="/analyzer" element={<Analyzer />} />
      </Routes>
    </Router>
  );
}

export default App;
