const { performance } = require('node:perf_hooks');

const baseUrl = (process.env.PERF_BASE_URL || 'http://localhost:4000/api/v1').replace(/\/$/, '');
const requests = Number(process.env.PERF_REQUESTS || 100);
const concurrency = Number(process.env.PERF_CONCURRENCY || 10);
const p95Limit = Number(process.env.PERF_P95_MS || 500);
const target = `${baseUrl}${process.env.PERF_PATH || '/heartbeat'}`;

function percentile(values, value) {
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.min(ordered.length - 1, Math.ceil(value * ordered.length) - 1)] || 0;
}

async function measure() {
  const started = performance.now();
  try {
    const response = await fetch(target, { signal: AbortSignal.timeout(5000) });
    await response.arrayBuffer();
    return { duration: performance.now() - started, ok: response.ok };
  } catch {
    return { duration: performance.now() - started, ok: false };
  }
}

async function main() {
  const results = [];
  for (let offset = 0; offset < requests; offset += concurrency) {
    const batchSize = Math.min(concurrency, requests - offset);
    results.push(...await Promise.all(Array.from({ length: batchSize }, measure)));
  }
  const durations = results.map(result => result.duration);
  const failures = results.filter(result => !result.ok).length;
  const report = {
    target, requests, concurrency, failures,
    p50Ms: Number(percentile(durations, 0.50).toFixed(2)),
    p95Ms: Number(percentile(durations, 0.95).toFixed(2)),
    p99Ms: Number(percentile(durations, 0.99).toFixed(2)),
  };
  console.log(JSON.stringify(report, null, 2));
  if (failures > 0 || report.p95Ms > p95Limit) process.exitCode = 1;
}

main();
