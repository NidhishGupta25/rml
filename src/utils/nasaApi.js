export async function fetchMonthlyInsolation(lat, lon) {
  const params = new URLSearchParams({
    community: "RE",
    parameters: "ALLSKY_SFC_SW_DWN",
    latitude: lat,
    longitude: lon,
    format: "JSON",
  });

  const url = `https://power.larc.nasa.gov/api/temporal/climatology/point?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("NASA POWER request failed");
  const data = await res.json();

  console.log("NASA API response:", data); 
  console.log("NASA API URL:", url);

  const monthlyData = data?.properties?.parameter?.ALLSKY_SFC_SW_DWN || {};
  
  // if API fails, monthlyData will be {}
  if (!monthlyData || Object.keys(monthlyData).length === 0) {
    throw new Error("NASA POWER did not return monthly irradiance data");
  }

  const monthly = Object.entries(monthlyData).map(([month, val]) => {
    const irradiance = parseFloat(val);
    const daysInMonth = new Date(2024, month, 0).getDate();
    const rooftopArea = 1171.07;
    const efficiency = 0.18;

    const energy = irradiance * daysInMonth * rooftopArea * efficiency;

    return {
      month: parseInt(month),
      irradiance: isNaN(irradiance) ? 0 : irradiance,
      energy: isNaN(energy) ? 0 : energy.toFixed(2),
    };
  });

  return monthly;
}
