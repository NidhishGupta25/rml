import React from "react";
import { useNavigate } from "react-router-dom";
import solarImg from "../assets/solarimg.jpg";
import "../styles/Hero.css";

export default function Hero() {
  const navigate = useNavigate();

  return (
    <section 
      id="hero"
      className="hero-section"
      style={{
        backgroundImage: `url(${solarImg})`,
      }}
    >
      <h1>Real Time Solar Estimate</h1>
      <p>Measure your solar potential and maximize your savings</p>
      <button onClick={() => navigate("/analyzer")}>Start Analysis</button>
    </section>
  );
}
