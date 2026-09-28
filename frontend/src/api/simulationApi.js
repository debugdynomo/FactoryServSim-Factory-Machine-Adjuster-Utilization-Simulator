/**
 * FactoryServSim API Client
 * 
 * Connects to Person 3's FastAPI backend endpoints.
 * Falls back to mock data when the backend is unavailable.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Run a simulation with the given factory configuration.
 * @param {Object} config - Factory configuration matching the FactoryConfigInput schema
 * @returns {Promise<Object>} Simulation results matching SimulationResultOutput schema
 */
export async function runSimulation(config) {
  try {
    const response = await fetch(`${API_BASE}/api/simulation/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('Backend unavailable, using mock simulation data:', error.message);
    return getMockSimulationResults();
  }
}

/**
 * Run optimization to find the optimum adjuster count.
 * @param {Object} config - Factory configuration
 * @returns {Promise<Object>} Optimization results matching OptimizationResultOutput schema
 */
export async function runOptimization(config) {
  try {
    const response = await fetch(`${API_BASE}/api/simulation/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('Backend unavailable, using mock optimization data:', error.message);
    return getMockOptimizationResults();
  }
}

/**
 * Fetch preset factory configurations.
 * @returns {Promise<Array>} Array of preset configurations
 */
export async function fetchPresets() {
  try {
    const response = await fetch(`${API_BASE}/api/simulation/presets`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('Backend unavailable, using mock presets:', error.message);
    return [];
  }
}

/** Mock simulation results following the data contract from guide.md */
export function getMockSimulationResults() {
  return {
    summary: {
      total_simulation_time: 10000,
      overall_machine_utilization_pct: 88.42,
      overall_adjuster_utilization_pct: 93.15,
      avg_queue_wait_time: 3.84,
      total_failures_handled: 12430,
    },
    category_metrics: [
      { category: 'Lathe', utilization_pct: 87.1, total_failures: 7200 },
      { category: 'Turning', utilization_pct: 91.5, total_failures: 1410 },
      { category: 'Drilling', utilization_pct: 85.3, total_failures: 2640 },
      { category: 'Soldering', utilization_pct: 93.8, total_failures: 1180 },
    ],
    adjuster_metrics: [
      { id: 1, name: 'Adjuster 1', busy_time_pct: 94.2, repairs_completed: 4210 },
      { id: 2, name: 'Adjuster 2', busy_time_pct: 92.1, repairs_completed: 3980 },
      { id: 3, name: 'Adjuster 3', busy_time_pct: 88.7, repairs_completed: 4240 },
    ],
  };
}

/** Mock optimization results following the data contract from guide.md */
export function getMockOptimizationResults() {
  return {
    optimum_adjuster_count: 6,
    tradeoff_curve: [
      { adjuster_count: 1, machine_utilization: 42.1, adjuster_utilization: 99.9 },
      { adjuster_count: 2, machine_utilization: 64.2, adjuster_utilization: 99.8 },
      { adjuster_count: 3, machine_utilization: 74.8, adjuster_utilization: 98.5 },
      { adjuster_count: 4, machine_utilization: 83.5, adjuster_utilization: 94.2 },
      { adjuster_count: 5, machine_utilization: 89.7, adjuster_utilization: 88.6 },
      { adjuster_count: 6, machine_utilization: 93.8, adjuster_utilization: 82.1 },
      { adjuster_count: 7, machine_utilization: 94.6, adjuster_utilization: 73.5 },
      { adjuster_count: 8, machine_utilization: 95.1, adjuster_utilization: 64.0 },
      { adjuster_count: 9, machine_utilization: 95.4, adjuster_utilization: 56.2 },
      { adjuster_count: 10, machine_utilization: 95.6, adjuster_utilization: 49.8 },
    ],
    recommendation_reason:
      '6 adjusters provides 93.8% machine uptime. Adding 2 more adjusters yields only +1.3% uptime at 64% worker utilization.',
  };
}
