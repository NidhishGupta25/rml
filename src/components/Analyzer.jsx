import React, { useState, useMemo, useEffect, useRef } from "react";
import MapComponent from "../components/MapComponent";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "../styles/Analyzer.css";

export default function Analyzer() {
  const [polygonData, setPolygonData] = useState(null);
  const [results, setResults] = useState(null);
  const [bill, setBill] = useState("");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const suggestionsRef = useRef(null);
  const reportRef = useRef(null);
  const mapRef = useRef(null); // map capture ref

  const LOCATIONIQ_KEY = "pk.e1514b47e8b69435823694ca09ba66e2";

  const handlePolygonComplete = (latlngs, area) => {
    setPolygonData({ latlngs, area });
    calculateSolarPotential(area);
  };

  const calculateSolarPotential = (area) => {
    const solarIrradiance = 5;
    const performanceRatio = 0.75;
    const costPerKW = 50000;
    const electricityRate = 8;

    const systemSizeKW = area / 10;
    const annualOutput = systemSizeKW * solarIrradiance * 365 * performanceRatio;
    const systemCost = systemSizeKW * costPerKW;
    const annualSavingsPotential = annualOutput * electricityRate;
    const paybackPeriodPotential = systemCost / annualSavingsPotential;

    const CO2_PER_KWH = 0.82;
    const KG_PER_TREE = 20;
    const co2Kg = annualOutput * CO2_PER_KWH;
    const co2Tonnes = co2Kg / 1000;
    const trees = Math.round(co2Kg / KG_PER_TREE);

    const monthlyFactor = [
      1.1, 1.05, 1.0, 0.95, 0.9, 0.85,
      0.85, 0.9, 0.95, 1.0, 1.05, 1.1,
    ];
    const monthlyGeneration = monthlyFactor.map((f) => (annualOutput / 12) * f);

    setResults({
      systemSizeKW: systemSizeKW.toFixed(2),
      annualOutput: annualOutput.toFixed(0),
      systemCost: systemCost.toFixed(0),
      annualSavingsPotential: annualSavingsPotential.toFixed(0),
      paybackPeriodPotential: paybackPeriodPotential.toFixed(1),
      monthlyGeneration,
      electricityRate,
      co2SavingsKg: co2Kg.toFixed(0),
      co2SavingsTonnes: co2Tonnes.toFixed(2),
      trees,
    });
  };

  // Location suggestions
  useEffect(() => {
    if (query.length < 3) { setSuggestions([]); return; }
    const fetchSuggestions = async () => {
      try {
        const res = await fetch(`https://api.locationiq.com/v1/autocomplete?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(query)}&limit=5`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setSuggestions(data);
      } catch (err) { console.error("Error fetching location suggestions:", err); }
    };
    const delayDebounce = setTimeout(fetchSuggestions, 400);
    return () => clearTimeout(delayDebounce);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const energyData = useMemo(() => {
    if (!results) return [];
    return results.monthlyGeneration.map((kWh, i) => ({
      month: new Date(0, i).toLocaleString("default", { month: "short" }),
      kWh: parseFloat(kWh.toFixed(0)),
    }));
  }, [results]);

  const comparisonData = useMemo(() => {
    if (!results) return [];
    const yearlyBill = parseFloat(bill) || 0;
    const { monthlyGeneration, electricityRate } = results;
    const monthlySavingsPotential = monthlyGeneration.map(e => e * electricityRate);
    const monthlyActualSavings = monthlySavingsPotential.map(s => Math.min(s, yearlyBill / 12));
    const annualActualSavings = monthlyActualSavings.reduce((sum, s) => sum + s, 0);
    const yearlyWithSolar = yearlyBill - annualActualSavings;
    return [{ period: "Annual", withoutSolar: yearlyBill.toFixed(0), withSolar: yearlyWithSolar.toFixed(0), savings: annualActualSavings.toFixed(0) }];
  }, [bill, results]);

  useEffect(() => {
    if (comparisonData.length > 0 && results) {
      const annualActualSavings = parseFloat(comparisonData[0].savings);
      const systemCost = parseFloat(results.systemCost);
      const newPaybackPeriod = annualActualSavings > 0 ? (systemCost / annualActualSavings).toFixed(1) : "0";
      if (results.annualSavings !== annualActualSavings.toFixed(0) || results.paybackPeriod !== newPaybackPeriod) {
        setResults(prev => ({ ...prev, annualSavings: annualActualSavings.toFixed(0), paybackPeriod: newPaybackPeriod }));
      }
    }
  }, [comparisonData, results]);

  // PDF generation including map
  const generatePDF = async () => {
    const doc = new jsPDF("p", "mm", "a4");

    doc.setFontSize(22);
    doc.text("Rooftop Solar Analysis Report", 105, 50, { align: "center" });

    const locationText = `Location: ${query || "N/A"}`;
    const splitLocation = doc.splitTextToSize(locationText, 180); // 180 mm width
    doc.setFontSize(14);
    doc.text(splitLocation, 105, 70, { align: "center" });

    doc.text(`Date: ${new Date().toLocaleDateString()}`, 105, 90, { align: "center" });


    // Capture map with polygon
    if (mapRef.current) {
      const canvasMap = await html2canvas(mapRef.current, { scale: 2 });
      const imgDataMap = canvasMap.toDataURL("image/png");
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvasMap.height * imgWidth) / canvasMap.width;
      let heightLeft = imgHeight;
      let position = 0;
      doc.addImage(imgDataMap, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        doc.addPage();
        doc.addImage(imgDataMap, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      doc.addPage();
    }

    // Capture results
    if (reportRef.current) {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      doc.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        doc.addPage();
        doc.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
    }

    doc.save("Solar_Analysis_Report.pdf");
  };

  return (
    <div className="analyzer-container">
      <p className="subtitle">Draw your rooftop and enter your yearly bill to discover solar savings</p>

      <div className="input-section">
        <input type="number" placeholder="Enter yearly electricity bill (₹)" value={bill} onChange={e => setBill(e.target.value)} />
      </div>

      <div className="input-section" ref={suggestionsRef}>
        <input type="text" placeholder="Enter your location" value={query} onChange={e => setQuery(e.target.value)} />
        {suggestions.length > 0 && (
          <ul className="suggestions-list">
            {suggestions.map(s => (
              <li key={s.place_id} onClick={() => { setSelectedLocation([s.lat, s.lon]); setQuery(s.display_name); setSuggestions([]); }}>
                {s.display_name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="map-card" ref={mapRef}>
        <MapComponent onPolygonComplete={handlePolygonComplete} selectedLocation={selectedLocation} />
      </div>

      <div ref={reportRef}>
        {/* Results & Charts */}
        <div className="results-card">
          <h2>📊 Rooftop Solar Analysis</h2>
          {polygonData ? (
            <div>
              <p><strong>Rooftop Area:</strong> {polygonData.area} m²</p>
              {results && (
                <div className="solar-results">
                  <p><strong>System Size:</strong> {results.systemSizeKW} kW</p>
                  <p><strong>Annual Output:</strong> {results.annualOutput} kWh</p>
                  <p><strong>System Cost:</strong> ₹{results.systemCost}</p>
                  <p><strong>Annual Savings:</strong> ₹{results.annualSavings || results.annualSavingsPotential}</p>
                  <p><strong>Payback Period:</strong> {results.paybackPeriod || results.paybackPeriodPotential} years</p>
                </div>
              )}
            </div>
          ) : (<p>🏠 Draw your rooftop on the map to get a detailed analysis</p>)}
        </div>

        <div className="bottom-charts">
          {energyData.length > 0 && (
            <div className="chart-card">
              <h2>📅 Monthly Energy Output</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={energyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="kWh" fill="#5db6ff" name="Energy (kWh)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {comparisonData.length > 0 && (
            <div className="chart-card">
              <h2>💰 Annual Bill Comparison</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="withoutSolar" fill="#fd4339ff" name="Without Solar (₹)" />
                  <Bar dataKey="withSolar" fill="#009a05ff" name="With Solar (₹)" />
                </BarChart>
              </ResponsiveContainer>
              <p style={{ textAlign: "center", marginTop: "10px", fontSize: "14px" }}>
                With solar, your yearly bills drop 🌞. Money saved: ₹{comparisonData[0]?.savings || 0}
              </p>
            </div>
          )}

          {results && (
            <div className="chart-card">
              <h2>🌍 CO₂ Savings</h2>
              <p>Your solar system reduces approx. <strong>{results.co2SavingsKg} kg</strong> of CO₂ per year 🌱</p>
              <p>That equals <strong>{results.co2SavingsTonnes} tonnes</strong> CO₂ avoided — like planting <strong>{results.trees}</strong> trees! 🌳</p>
            </div>
          )}
        </div>
      </div>

      {results && (
        <div style={{ textAlign: "center", margin: "20px" }}>
          <button onClick={generatePDF} className="download-btn">📥 Download Report (PDF)</button>
        </div>
      )}
    </div>
  );
}
