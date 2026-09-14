/* export.js — turns a benchmark run object into a downloadable file.
   A "run" looks like:
   {
     timestamp: ISOString,
     systemPrompt: string,
     testDataset: string,
     results: [
       { modelKey, label, latencyMs, inputTokensEst, outputTokensEst,
         costUsd, responseText, error, judge: { score, critique } | null }
     ]
   }
*/

function csvEscape(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function runToCsv(run) {
  const headers = [
    "Timestamp", "System Prompt", "Test Dataset", "Model", "Latency (ms)",
    "Est. Input Tokens", "Est. Output Tokens", "Est. Cost (USD)",
    "Judge Score", "Judge Critique", "Response", "Error"
  ];
  const rows = run.results.map(r => [
    run.timestamp,
    run.systemPrompt,
    run.testDataset,
    r.label,
    r.latencyMs ?? "",
    r.inputTokensEst ?? "",
    r.outputTokensEst ?? "",
    r.costUsd != null ? r.costUsd.toFixed(6) : "",
    r.judge ? r.judge.score : "",
    r.judge ? r.judge.critique : "",
    r.responseText ?? "",
    r.error ?? ""
  ]);
  const lines = [headers, ...rows].map(row => row.map(csvEscape).join(","));
  return lines.join("\n");
}

function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  // iOS Safari needs the anchor in the DOM to reliably trigger the save sheet.
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function exportRunAsCsv(run) {
  const stamp = new Date(run.timestamp).toISOString().replace(/[:.]/g, "-");
  downloadBlob(runToCsv(run), `benchmark-${stamp}.csv`, "text/csv");
}

function exportRunAsJson(run) {
  const stamp = new Date(run.timestamp).toISOString().replace(/[:.]/g, "-");
  downloadBlob(JSON.stringify(run, null, 2), `benchmark-${stamp}.json`, "application/json");
}

window.BenchExport = { exportRunAsCsv, exportRunAsJson, runToCsv };
