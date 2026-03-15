import process from 'node:process';

const defaultRoutes = ['/', '/login', '/register', '/admin/login', '/dashboard'];

function getArg(flag, fallback) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] ?? fallback;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function parseRoutes(value) {
  if (!value) return defaultRoutes;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((route) => (route.startsWith('/') ? route : `/${route}`));
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

if (hasFlag('--help')) {
  console.log(`\nUsage: node scripts/load-test.mjs --baseUrl <url> [options]\n\nOptions:\n  --baseUrl <url>       Target base URL (required)\n  --concurrency <n>     Number of parallel workers (default: 20)\n  --duration <sec>      Test duration in seconds (default: 30)\n  --routes <csv>        Comma-separated routes (default: ${defaultRoutes.join(',')})\n\nExample:\n  node scripts/load-test.mjs --baseUrl https://jobfare-potal.vercel.app --concurrency 40 --duration 60\n`);
  process.exit(0);
}

const baseUrl = getArg('--baseUrl', '').replace(/\/$/, '');
const concurrency = Number.parseInt(getArg('--concurrency', '20'), 10);
const durationSeconds = Number.parseInt(getArg('--duration', '30'), 10);
const routes = parseRoutes(getArg('--routes', ''));

if (!baseUrl) {
  console.error('Missing --baseUrl');
  process.exit(1);
}

if (!Number.isFinite(concurrency) || concurrency <= 0) {
  console.error('--concurrency must be a positive integer');
  process.exit(1);
}

if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
  console.error('--duration must be a positive integer');
  process.exit(1);
}

const latencies = [];
const statusCount = new Map();
const routeStats = new Map(routes.map((route) => [route, { count: 0, errors: 0 }]));
let totalRequests = 0;
let totalErrors = 0;

const endTime = Date.now() + durationSeconds * 1000;

async function worker(id) {
  while (Date.now() < endTime) {
    const route = routes[(totalRequests + id) % routes.length];
    const url = `${baseUrl}${route}`;
    const start = performance.now();

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'cache-control': 'no-cache',
        },
      });

      const elapsed = performance.now() - start;
      latencies.push(elapsed);
      totalRequests += 1;

      const key = String(response.status);
      statusCount.set(key, (statusCount.get(key) || 0) + 1);

      const stats = routeStats.get(route);
      if (stats) stats.count += 1;

      if (!response.ok) {
        totalErrors += 1;
        if (stats) stats.errors += 1;
      }
    } catch {
      const elapsed = performance.now() - start;
      latencies.push(elapsed);
      totalRequests += 1;
      totalErrors += 1;
      statusCount.set('network_error', (statusCount.get('network_error') || 0) + 1);

      const stats = routeStats.get(route);
      if (stats) {
        stats.count += 1;
        stats.errors += 1;
      }
    }
  }
}

console.log(`\nStarting load test`);
console.log(`Target      : ${baseUrl}`);
console.log(`Concurrency : ${concurrency}`);
console.log(`Duration    : ${durationSeconds}s`);
console.log(`Routes      : ${routes.join(', ')}`);

const startTime = Date.now();
await Promise.all(Array.from({ length: concurrency }, (_, index) => worker(index + 1)));
const elapsedSeconds = (Date.now() - startTime) / 1000;

const sortedLatencies = [...latencies].sort((a, b) => a - b);
const p50 = percentile(sortedLatencies, 50);
const p95 = percentile(sortedLatencies, 95);
const p99 = percentile(sortedLatencies, 99);
const avgLatency = sortedLatencies.length
  ? sortedLatencies.reduce((sum, value) => sum + value, 0) / sortedLatencies.length
  : 0;
const rps = elapsedSeconds > 0 ? totalRequests / elapsedSeconds : 0;
const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

console.log(`\nSummary`);
console.log(`Requests           : ${totalRequests}`);
console.log(`Errors             : ${totalErrors} (${errorRate.toFixed(2)}%)`);
console.log(`Throughput (req/s) : ${rps.toFixed(2)}`);
console.log(`Latency avg        : ${avgLatency.toFixed(2)} ms`);
console.log(`Latency p50        : ${p50.toFixed(2)} ms`);
console.log(`Latency p95        : ${p95.toFixed(2)} ms`);
console.log(`Latency p99        : ${p99.toFixed(2)} ms`);

console.log(`\nStatus Distribution`);
for (const [status, count] of [...statusCount.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`  ${status.padEnd(14)} ${count}`);
}

console.log(`\nRoute Breakdown`);
for (const [route, stats] of routeStats.entries()) {
  const routeErrorRate = stats.count > 0 ? (stats.errors / stats.count) * 100 : 0;
  console.log(`  ${route.padEnd(24)} count=${String(stats.count).padEnd(6)} errors=${String(stats.errors).padEnd(6)} (${routeErrorRate.toFixed(2)}%)`);
}

const healthy = errorRate < 1 && p95 < 800;
console.log(`\nAssessment`);
console.log(
  healthy
    ? 'PASS: Error rate and p95 latency are within baseline targets.'
    : 'ATTENTION: Error rate >= 1% or p95 >= 800ms. Investigate bottlenecks before large event traffic.'
);
