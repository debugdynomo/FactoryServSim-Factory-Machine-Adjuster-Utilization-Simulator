import React, { useMemo, useCallback } from 'react';

/**
 * ExportPanel — Person 6, Analytics Module
 *
 * Provides data export functionality for simulation and optimization results.
 *
 * Export formats:
 *   1. CSV — Tabular data export for spreadsheet applications
 *   2. JSON — Full structured data export
 *   3. Print-ready Summary — Opens a formatted print dialog
 *
 * Props:
 *   - simulationResults: SimulationResultOutput (from guide.md contract)
 *   - optimizationResults: OptimizationResultOutput (from guide.md contract)
 */

/**
 * Convert simulation results to CSV format.
 * Produces three CSV sections: Summary, Category Metrics, Adjuster Metrics.
 */
function simulationToCSV(results) {
  if (!results) return '';

  const lines = [];

  // Summary section
  lines.push('=== Simulation Summary ===');
  lines.push('Metric,Value');
  const summary = results.summary || {};
  lines.push(`Total Simulation Time,${summary.total_simulation_time ?? ''}`);
  lines.push(`Overall Machine Utilization (%),${summary.overall_machine_utilization_pct ?? ''}`);
  lines.push(`Overall Adjuster Utilization (%),${summary.overall_adjuster_utilization_pct ?? ''}`);
  lines.push(`Average Queue Wait Time,${summary.avg_queue_wait_time ?? ''}`);
  lines.push(`Total Failures Handled,${summary.total_failures_handled ?? ''}`);
  lines.push('');

  // Category Metrics section
  if (results.category_metrics && results.category_metrics.length > 0) {
    lines.push('=== Category Metrics ===');
    lines.push('Category,Utilization (%),Total Failures');
    results.category_metrics.forEach((cat) => {
      lines.push(`${cat.category},${cat.utilization_pct},${cat.total_failures}`);
    });
    lines.push('');
  }

  // Adjuster Metrics section
  if (results.adjuster_metrics && results.adjuster_metrics.length > 0) {
    lines.push('=== Adjuster Metrics ===');
    lines.push('ID,Name,Busy Time (%),Repairs Completed');
    results.adjuster_metrics.forEach((adj) => {
      lines.push(`${adj.id},${adj.name},${adj.busy_time_pct},${adj.repairs_completed}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Convert optimization results to CSV format.
 */
function optimizationToCSV(results) {
  if (!results) return '';

  const lines = [];

  lines.push('=== Optimization Results ===');
  lines.push(`Optimum Adjuster Count,${results.optimum_adjuster_count ?? ''}`);
  lines.push(`Recommendation,"${results.recommendation_reason ?? ''}"`);
  lines.push('');

  if (results.tradeoff_curve && results.tradeoff_curve.length > 0) {
    lines.push('=== Tradeoff Curve ===');
    lines.push('Adjuster Count,Machine Utilization (%),Adjuster Utilization (%)');
    results.tradeoff_curve.forEach((point) => {
      lines.push(
        `${point.adjuster_count},${point.machine_utilization},${point.adjuster_utilization}`
      );
    });
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Trigger a file download in the browser.
 */
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate a formatted timestamp string for filenames.
 */
function getTimestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

/**
 * Generate a printable HTML summary report.
 */
function generatePrintableReport(simulationResults, optimizationResults) {
  const summary = simulationResults?.summary || {};
  const categories = simulationResults?.category_metrics || [];
  const adjusters = simulationResults?.adjuster_metrics || [];
  const optResults = optimizationResults || {};

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>FactoryServSim — Simulation Report</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
        h1 { color: #1a1a2e; border-bottom: 2px solid #e94560; padding-bottom: 8px; }
        h2 { color: #0f3460; margin-top: 24px; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: 600; }
        .kpi { display: inline-block; border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin: 8px; text-align: center; min-width: 180px; }
        .kpi-value { font-size: 28px; font-weight: bold; color: #0f3460; }
        .kpi-label { font-size: 12px; color: #666; margin-top: 4px; }
        .highlight { background-color: #fff3f3; border-left: 4px solid #e94560; padding: 12px; margin: 16px 0; }
        .timestamp { color: #999; font-size: 12px; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h1>🏭 FactoryServSim — Simulation Report</h1>
      <p class="timestamp">Generated: ${new Date().toLocaleString()}</p>

      <h2>Key Performance Indicators</h2>
      <div>
        <div class="kpi">
          <div class="kpi-value">${summary.overall_machine_utilization_pct?.toFixed(1) ?? '—'}%</div>
          <div class="kpi-label">Machine Utilization</div>
        </div>
        <div class="kpi">
          <div class="kpi-value">${summary.overall_adjuster_utilization_pct?.toFixed(1) ?? '—'}%</div>
          <div class="kpi-label">Adjuster Utilization</div>
        </div>
        <div class="kpi">
          <div class="kpi-value">${summary.avg_queue_wait_time?.toFixed(2) ?? '—'}</div>
          <div class="kpi-label">Avg Queue Wait Time</div>
        </div>
        <div class="kpi">
          <div class="kpi-value">${summary.total_failures_handled?.toLocaleString() ?? '—'}</div>
          <div class="kpi-label">Failures Handled</div>
        </div>
      </div>

      ${categories.length > 0 ? `
      <h2>Category Metrics</h2>
      <table>
        <thead><tr><th>Category</th><th>Utilization (%)</th><th>Total Failures</th></tr></thead>
        <tbody>
          ${categories.map((c) => `<tr><td>${c.category}</td><td>${c.utilization_pct}%</td><td>${c.total_failures.toLocaleString()}</td></tr>`).join('')}
        </tbody>
      </table>
      ` : ''}

      ${adjusters.length > 0 ? `
      <h2>Adjuster Metrics</h2>
      <table>
        <thead><tr><th>ID</th><th>Name</th><th>Busy Time (%)</th><th>Repairs Completed</th></tr></thead>
        <tbody>
          ${adjusters.map((a) => `<tr><td>${a.id}</td><td>${a.name}</td><td>${a.busy_time_pct}%</td><td>${a.repairs_completed.toLocaleString()}</td></tr>`).join('')}
        </tbody>
      </table>
      ` : ''}

      ${optResults.optimum_adjuster_count ? `
      <h2>Staffing Optimization</h2>
      <div class="highlight">
        <strong>Recommended: ${optResults.optimum_adjuster_count} Adjusters</strong><br>
        ${optResults.recommendation_reason || ''}
      </div>
      ${optResults.tradeoff_curve?.length > 0 ? `
      <table>
        <thead><tr><th>Adjusters</th><th>Machine Util. (%)</th><th>Adjuster Util. (%)</th></tr></thead>
        <tbody>
          ${optResults.tradeoff_curve.map((p) => `<tr ${p.adjuster_count === optResults.optimum_adjuster_count ? 'style="background-color:#fff3f3;font-weight:bold"' : ''}><td>${p.adjuster_count}</td><td>${p.machine_utilization}%</td><td>${p.adjuster_utilization}%</td></tr>`).join('')}
        </tbody>
      </table>
      ` : ''}
      ` : ''}

      <hr style="margin-top:32px">
      <p class="timestamp">FactoryServSim — Factory Machine-Adjuster Utilization Simulator</p>
    </body>
    </html>
  `;
}

export default function ExportPanel({ simulationResults, optimizationResults }) {
  const hasSimulation = Boolean(simulationResults?.summary);
  const hasOptimization = Boolean(optimizationResults?.optimum_adjuster_count);
  const hasData = hasSimulation || hasOptimization;

  const handleExportCSV = useCallback(() => {
    const timestamp = getTimestamp();
    let csvContent = '';

    if (hasSimulation) {
      csvContent += simulationToCSV(simulationResults);
    }
    if (hasOptimization) {
      csvContent += optimizationToCSV(optimizationResults);
    }

    downloadFile(csvContent, `factoryservsim-report-${timestamp}.csv`, 'text/csv;charset=utf-8;');
  }, [simulationResults, optimizationResults, hasSimulation, hasOptimization]);

  const handleExportJSON = useCallback(() => {
    const timestamp = getTimestamp();
    const exportData = {};

    if (hasSimulation) {
      exportData.simulation = simulationResults;
    }
    if (hasOptimization) {
      exportData.optimization = optimizationResults;
    }

    exportData.exported_at = new Date().toISOString();

    const jsonContent = JSON.stringify(exportData, null, 2);
    downloadFile(
      jsonContent,
      `factoryservsim-report-${timestamp}.json`,
      'application/json;charset=utf-8;'
    );
  }, [simulationResults, optimizationResults, hasSimulation, hasOptimization]);

  const handlePrintReport = useCallback(() => {
    const html = generatePrintableReport(simulationResults, optimizationResults);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      // Small delay to let styles load before printing
      setTimeout(() => printWindow.print(), 300);
    }
  }, [simulationResults, optimizationResults]);

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">📥 Export Results</h3>
      <p className="text-sm text-gray-500 mb-4">
        Download simulation and optimization results in your preferred format.
      </p>

      <div className="flex flex-wrap gap-3">
        {/* CSV Export */}
        <button
          onClick={handleExportCSV}
          disabled={!hasData}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            hasData
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
          title={hasData ? 'Export results as CSV file' : 'Run a simulation first'}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Export CSV
        </button>

        {/* JSON Export */}
        <button
          onClick={handleExportJSON}
          disabled={!hasData}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            hasData
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
          title={hasData ? 'Export results as JSON file' : 'Run a simulation first'}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
          Export JSON
        </button>

        {/* Print Report */}
        <button
          onClick={handlePrintReport}
          disabled={!hasData}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            hasData
              ? 'bg-gray-700 hover:bg-gray-800 text-white shadow-sm'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
          title={hasData ? 'Open printable summary report' : 'Run a simulation first'}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          Print Report
        </button>
      </div>

      {/* Data availability indicators */}
      <div className="mt-4 flex gap-4 text-xs text-gray-400">
        <span className={hasSimulation ? 'text-emerald-500' : ''}>
          {hasSimulation ? '✓' : '○'} Simulation data
        </span>
        <span className={hasOptimization ? 'text-indigo-500' : ''}>
          {hasOptimization ? '✓' : '○'} Optimization data
        </span>
      </div>
    </div>
  );
}
