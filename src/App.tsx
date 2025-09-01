import { BrowserRouter, Routes, Route, Link, NavLink } from "react-router-dom";
//import Home from "./pages/Home";
import DataEntry from "./pages/DataEntry";
//import Coasters from "./pages/Coasters";     // if you haven't created these yet, you can comment these two lines
import Rankings from "./pages/Rankings";     // or add placeholder pages
import Settings from "./pages/Settings";
import Stats from "./pages/Stats";

export default function App() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-2 py-1 rounded ${isActive ? "underline" : "hover:bg-gray-100"}`;

  return (
    <BrowserRouter>
      <div className="min-h-screen">
        <header className="border-b bg-white sticky top-0">
          <nav className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
            <Link to="/" className="font-bold text-lg">🎢 Coasterbook</Link>
            <NavLink to="/" className={linkClass} end>Home</NavLink>
            <NavLink to="/data" className={linkClass}>Data Entry</NavLink>
            <NavLink to="/coasters" className={linkClass}>Coasters</NavLink>
            <NavLink to="/rankings" className={linkClass}>Rankings</NavLink>
            <NavLink to="/stats" className={linkClass}>Stats</NavLink>
            <NavLink to="/settings" className={linkClass}>Settings</NavLink>
          </nav>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-6">
          <Routes>
            {/* <Route path="/" element={<Home />} /> */}
            <Route path="/data" element={<DataEntry />} />
            {/* <Route path="/coasters" element={<Coasters />} /> */}
            <Route path="/rankings" element={<Rankings />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/stats" element={<Stats />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
