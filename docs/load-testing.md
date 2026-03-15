# Load Testing & Capacity Checklist

This guide helps validate whether the portal can handle large concurrent audience traffic.

## 1) Quick Start

Run local smoke test (with app running):

npm run dev
npm run load-test:smoke

Run stronger local stress test:

npm run load-test:stress

Run against production:

node scripts/load-test.mjs --baseUrl https://jobfare-potal.vercel.app --concurrency 80 --duration 90 --routes /,/login,/register,/admin/login,/dashboard

## 2) Baseline Targets

Use these as practical baseline thresholds for event-readiness:

- Error rate: < 1%
- p95 latency: < 800 ms
- p99 latency: < 1500 ms
- No sustained 5xx spikes

If thresholds fail, do not scale audience size yet.

## 3) What to Monitor During Tests

### Vercel

- Function invocations and duration
- 4xx/5xx trend
- Cold starts (if serverless routes used)

### Firebase Authentication

- Login/sign-up error rates
- Suspicious auth spikes

### Cloud Firestore

- Read operations/sec
- Write operations/sec
- Latency and error metrics
- Quota usage

## 4) Capacity Test Plan (Recommended)

Run in stages and compare metrics:

1. 25 concurrent users, 2 minutes
2. 50 concurrent users, 3 minutes
3. 100 concurrent users, 5 minutes
4. Peak target (e.g., 200), 5-10 minutes

Stop when:

- Error rate > 1%
- p95 > 800 ms for more than 2 minutes
- Firestore quota alarms trigger

## 5) High-Impact Optimizations if Needed

- Reduce heavy realtime listeners on dashboard pages
- Add pagination for large lists
- Avoid broad list queries where possible
- Add caching for low-change pages
- Ensure required Firestore indexes exist

## 6) Security During Load Tests

- Keep App Check in monitor mode first, then enforce
- Keep Firestore rules deployed from latest main
- Avoid running tests from unknown/public IP pools against production

## 7) Go/No-Go Decision

Go live for large audience when all are true:

- Two consecutive test runs pass thresholds
- No permission/auth anomalies in logs
- Firestore usage remains within budget/limits
- Admin critical actions (approvals, break control, scanner) remain responsive under load
