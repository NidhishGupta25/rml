const DAYS_IN_MONTH = [31,28,31,30,31,30,31,31,30,31,30,31];

export function calculateMonthlyEnergy(irradianceData, area_m2, efficiency=0.18, losses=0.77) {
  const results = [];

  for (let month = 1; month <= 12; month++) {
    const irradiance = irradianceData[month]; // kWh/m²/day
    const days = DAYS_IN_MONTH[month-1];

    const energy = irradiance * area_m2 * efficiency * losses * days;

    results.push({
      month,
      irradiance,
      energy: energy.toFixed(1), // kWh
    });
  }

  return results;
}
