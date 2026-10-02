import React, { useMemo, useCallback } from 'react';
import { Download, FileText, FileJson, Printer, CheckCircle2, Circle } from 'lucide-react';

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
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 800px; margin: 0 auto; padding: 30px; color: #1e293b; line-height: 1.5; }
        h1 { color: #0f172a; border-bottom: 2px solid #1e3a5f; padding-bottom: 12px; margin-bottom: 8px; }
        h2 { color: #1e3a5f; margin-top: 32px; font-size: 1.25rem; text-transform: uppercase; letter-spacing: 0.05em; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th, td { border: 1px solid #cbd5e1; padding: 10px 14px; text-align: left; }
        th { background-color: #f1f5f9; font-weight: 600; color: #475569; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; }
        td { font-size: 0.875rem; }
        .kpi-container { display: flex; flex-wrap: wrap; gap: 16px; margin: 20px 0; }
        .kpi { border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; flex: 1; min-width: 150px; background-color: #f8fafc; border-left: 4px solid #1e3a5f; }
        .kpi-value { font-size: 24px; font-weight: bold; color: #0f172a; }
        .kpi-label { font-size: 11px; color: #64748b; margin-top: 4px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; }
        .highlight { background-color: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #d97706; padding: 20px; margin: 20px 0; border-radius: 4px; }
        .timestamp { color: #94a3b8; font-size: 12px; }
        @media print { body { padding: 0; } .kpi-container { display: block; } .kpi { margin-bottom: 10px; } }
      </style>
    </head>
    <body>
      <h1>FactoryServSim — Engineering Report</h1>
      <p class="timestamp">Generated: ${new Date().toLocaleString()}</p>

      <h2>Key Performance Indicators</h2>
      <div class="kpi-container">
        <div class="kpi" style="border-left-color: #059669;">
          <div class="kpi-value">${summary.overall_machine_utilization_pct?.toFixed(1) ?? '—'}%</div>
          <div class="kpi-label">Machine Utilization</div>
        </div>
        <div class="kpi" style="border-left-color: #4f46e5;">
          <div class="kpi-value">${summary.overall_adjuster_utilization_pct?.toFixed(1) ?? '—'}%</div>
          <div class="kpi-label">Adjuster Utilization</div>
        </div>
        <div class="kpi" style="border-left-color: #d97706;">
          <div class="kpi-value">${summary.avg_queue_wait_time?.toFixed(2) ?? '—'}</div>
          <div class="kpi-label">Avg Queue Wait Time</div>
        </div>
        <div class="kpi" style="border-left-color: #e11d48;">
          <div class="kpi-value">${summary.total_failures_handled?.toLocaleString() ?? '—'}</div>
          <div class="kpi-label">Failures Handled</div>
        </div>
      </div>

      ${categories.length > 0 ? `
      <h2>Category Metrics</h2>
      <table>
        <thead><tr><th>Category</th><th>Utilization (%)</th><th>Total Failures</th></tr></thead>
        <tbody>
          ${categories.map((c) => `<tr><td>${c.category}</td><td style="font-family: monospace;">${c.utilization_pct}%</td><td style="font-family: monospace;">${c.total_failures.toLocaleString()}</td></tr>`).join('')}
        </tbody>
      </table>
      ` : ''}

      ${adjusters.length > 0 ? `
      <h2>Adjuster Metrics</h2>
      <table>
        <thead><tr><th>ID</th><th>Name</th><th>Busy Time (%)</th><th>Repairs Completed</th></tr></thead>
        <tbody>
          ${adjusters.map((a) => `<tr><td style="font-family: monospace;">${a.id}</td><td>${a.name}</td><td style="font-family: monospace;">${a.busy_time_pct}%</td><td style="font-family: monospace;">${a.repairs_completed.toLocaleString()}</td></tr>`).join('')}
        </tbody>
      </table>
      ` : ''}

      ${optResults.optimum_adjuster_count ? `
      <h2>Staffing Optimization</h2>
      <div class="highlight">
        <strong style="color: #b45309; font-size: 1.1em; display: block; margin-bottom: 8px;">Recommended: ${optResults.optimum_adjuster_count} Adjusters</strong>
        <p style="margin: 0; color: #78350f; font-size: 0.9em;">${optResults.recommendation_reason || ''}</p>
      </div>
      ${optResults.tradeoff_curve?.length > 0 ? `
      <table>
        <thead><tr><th>Adjusters</th><th>Machine Util. (%)</th><th>Adjuster Util. (%)</th></tr></thead>
        <tbody>
          ${optResults.tradeoff_curve.map((p) => `<tr ${p.adjuster_count === optResults.optimum_adjuster_count ? 'style="background-color:#fffbeb;font-weight:bold"' : ''}><td style="font-family: monospace;">${p.adjuster_count}</td><td style="font-family: monospace; color: #059669;">${p.machine_utilization}%</td><td style="font-family: monospace; color: #4f46e5;">${p.adjuster_utilization}%</td></tr>`).join('')}
        </tbody>
      </table>
      ` : ''}
      ` : ''}

      <hr style="margin-top:40px; border: 0; border-top: 1px solid #e2e8f0;">
      <p class="timestamp" style="text-align: center;">FactoryServSim — Factory Machine-Adjuster Utilization Simulator</p>
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
    <div className="bg-slate-50 rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-2">
        <Download className="text-slate-800" size={20} />
        <h3 className="text-lg font-semibold text-slate-900">Export Results</h3>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Download simulation and optimization results in your preferred format for further analysis or reporting.
      </p>

      <div className="flex flex-wrap gap-3">
        {/* CSV Export */}
        <button
          onClick={handleExportCSV}
          disabled={!hasData}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            hasData
              ? 'bg-white border border-slate-300 hover:border-emerald-500 hover:text-emerald-700 text-slate-700 shadow-sm'
              : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
          }`}
          title={hasData ? 'Export results as CSV file' : 'Run a simulation first'}
        >
          <FileText size={18} className={hasData ? 'text-emerald-600' : ''} />
          Export CSV
        </button>

        {/* JSON Export */}
        <button
          onClick={handleExportJSON}
          disabled={!hasData}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            hasData
              ? 'bg-white border border-slate-300 hover:border-indigo-500 hover:text-indigo-700 text-slate-700 shadow-sm'
              : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
          }`}
          title={hasData ? 'Export results as JSON file' : 'Run a simulation first'}
        >
          <FileJson size={18} className={hasData ? 'text-indigo-600' : ''} />
          Export JSON
        </button>

        {/* Print Report */}
        <button
          onClick={handlePrintReport}
          disabled={!hasData}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            hasData
              ? 'bg-slate-800 hover:bg-slate-900 text-white shadow-sm'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
          title={hasData ? 'Open printable summary report' : 'Run a simulation first'}
        >
          <Printer size={18} />
          Print Report
        </button>
      </div>

      {/* Data availability indicators */}
      <div className="mt-6 flex gap-6 text-xs font-medium uppercase tracking-wider">
        <div className={`flex items-center gap-1.5 ${hasSimulation ? 'text-emerald-700' : 'text-slate-400'}`}>
          {hasSimulation ? <CheckCircle2 size={14} /> : <Circle size={14} />}
          Simulation Data
        </div>
        <div className={`flex items-center gap-1.5 ${hasOptimization ? 'text-indigo-700' : 'text-slate-400'}`}>
          {hasOptimization ? <CheckCircle2 size={14} /> : <Circle size={14} />}
          Optimization Data
        </div>
      </div>
    </div>
  );
}
