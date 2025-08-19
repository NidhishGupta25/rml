import React from "react";
import { Link } from "react-router-dom";
import "../styles/Navbar.css";

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="logo">
            <Link to="/hero" className="logo-link">Solar Analyzer</Link>
      </div>
      <ul className="nav-links">
        <li><Link to="/hero">Home</Link></li>
        <li><Link to="/about">About Us</Link></li>
        <li><Link to="/faq">FAQ</Link></li>
        <li><Link to="/guide">Guide</Link></li>
      </ul>
    </nav>
  );
}
