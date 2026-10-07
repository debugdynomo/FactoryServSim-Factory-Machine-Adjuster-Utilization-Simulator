/**
 * FactoryServSim API Client
 * 
 * Connects to Person 3's FastAPI backend endpoints.
 * Falls back to mock data when the backend is unavailable.
 *
 * Includes retry logic with timeout to handle Render cold-start delays.
 */

const API_BASE = 'https://factoryservsim-factory-machine-adjuster.onrender.com';

// ---------------------------------------------------------------------------
// Retry-aware fetch wrapper
// ---------------------------------------------------------------------------

async function fetchWithRetry(url, options = {}, { retries = 2, timeoutMs = 30000, retryDelayMs = 1000 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return response;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, retryDelayMs * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

/**
 * Run a simulation with the given factory configuration.
 * @param {Object} config - Factory configuration matching the FactoryConfigInput schema
 * @returns {Promise<Object>} Simulation results matching SimulationResultOutput schema
 */
export async function runSimulation(config) {
  try {
    const response = await fetchWithRetry(`${API_BASE}/api/simulation/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('Backend unavailable, using mock simulation data:', error.message);
    return getMockSimulationResults(config);
  }
}

/**
 * Run optimization to find the optimum adjuster count.
 * @param {Object} config - Factory configuration
 * @returns {Promise<Object>} Optimization results matching OptimizationResultOutput schema
 */
export async function runOptimization(config) {
  try {
    const response = await fetchWithRetry(`${API_BASE}/api/simulation/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('Backend unavailable, using mock optimization data:', error.message);
    return getMockOptimizationResults(config);
  }
}

/**
 * Fetch preset factory configurations.
 * @returns {Promise<Array>} Array of preset configurations
 */
export async function fetchPresets() {
  try {
    const response = await fetchWithRetry(`${API_BASE}/api/simulation/presets`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('Backend unavailable, using mock presets:', error.message);
    return [];
  }
}

/** Mock simulation results following the data contract from guide.md */
export function getMockSimulationResults(config) {
  if (!config) {
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
        { category: 'Drilling', utilization_pct: 85.3, total_failures: 2640 },
      ],
      adjuster_metrics: [
        { id: 1, name: 'Adjuster 1', busy_time_pct: 94.2, repairs_completed: 4210 },
      ],
    };
  }

  // Generate dynamic mock data based on actual config
  const category_metrics = config.machine_categories.map((cat, i) => ({
    category: cat.name,
    utilization_pct: 85 + (i * 2.1) % 10,
    total_failures: cat.count * 10,
  }));

  const adjuster_metrics = config.adjusters.map((adj, i) => ({
    id: adj.id,
    name: adj.name,
    busy_time_pct: 88 + (i * 1.5) % 10,
    repairs_completed: 100 + i * 50,
  }));

  return {
    summary: {
      total_simulation_time: config.simulation_time,
      overall_machine_utilization_pct: 88.42,
      overall_adjuster_utilization_pct: 93.15,
      avg_queue_wait_time: 3.84,
      total_failures_handled: category_metrics.reduce((acc, curr) => acc + curr.total_failures, 0),
    },
    category_metrics,
    adjuster_metrics,
  };
}

/** Mock optimization results following the data contract from guide.md */
export function getMockOptimizationResults(config) {
  if (!config) {
    return {
      optimum_adjuster_count: 6,
      tradeoff_curve: [
        { adjuster_count: 1, machine_utilization: 42.1, adjuster_utilization: 99.9 },
        { adjuster_count: 2, machine_utilization: 64.2, adjuster_utilization: 99.8 },
      ],
      recommendation_reason: 'Fallback mock data',
      per_category_adjusters: {
        Lathe: 3,
        Turning: 1,
      },
      per_adjuster_counts: {
        'Adjuster 1': 2,
      },
      coverage_gaps: null,
      recommended_new_profiles: null,
      adjuster_expertise_map: {
        'Adjuster 1': ['Lathe', 'Turning'],
      },
    };
  }

  // Generate dynamic counts based on actual categories
  const per_category_adjusters = {};
  config.machine_categories.forEach((cat) => {
    // arbitrary logic to recommend 1 adjuster per 50 machines
    per_category_adjusters[cat.name] = Math.max(1, Math.ceil(cat.count / 50));
  });

  const per_adjuster_counts = {};
  const adjuster_expertise_map = {};
  config.adjusters.forEach((adj) => {
    per_adjuster_counts[adj.name] = 1;
    adjuster_expertise_map[adj.name] = adj.expertise;
  });

  const total_optimum = Object.values(per_category_adjusters).reduce((a, b) => a + b, 0);

  return {
    optimum_adjuster_count: total_optimum,
    tradeoff_curve: [
      { adjuster_count: Math.max(1, total_optimum - 2), machine_utilization: 64.2, adjuster_utilization: 99.8 },
      { adjuster_count: Math.max(2, total_optimum - 1), machine_utilization: 74.8, adjuster_utilization: 98.5 },
      { adjuster_count: total_optimum, machine_utilization: 93.8, adjuster_utilization: 82.1 },
      { adjuster_count: total_optimum + 1, machine_utilization: 94.6, adjuster_utilization: 73.5 },
    ],
    recommendation_reason: `${total_optimum} adjusters provides 93.8% machine uptime.`,
    per_category_adjusters,
    per_adjuster_counts,
    coverage_gaps: null,
    recommended_new_profiles: null,
    adjuster_expertise_map,
  };
}
