import mongoose from 'mongoose';

/**
 * Whether this process is alive, and whether it can actually serve traffic.
 *
 * THE OLD ANSWER WAS A LITERAL. `GET /api/health` returned `{ status: 'OK' }` without
 * touching anything, and `connectDB` caught a failed connection, logged "continuing anyway"
 * and carried on. So a blue/green cutover to an instance that could not reach MongoDB
 * looked like a successful deploy — and kept looking like one while every request 500'd.
 *
 * LIVENESS AND READINESS ARE DIFFERENT QUESTIONS. Liveness asks "is this process wedged,
 * should the supervisor restart it". Readiness asks "should traffic go here". Conflating
 * them is how a transient database blip turns into a restart loop that guarantees the
 * outage instead of riding it out.
 *
 * OPTIONAL DEPENDENCIES ARE NEVER PART OF EITHER. An absent AI provider means resume
 * analysis returns "temporarily unavailable"; it does not mean the dashboard, the roadmap
 * or a student's progress should stop being served. They are reported for the admin's
 * benefit and never gate the verdict.
 */

export type DependencyState = 'up' | 'down' | 'not_configured';

export interface DependencyReport {
  name: string;
  state: DependencyState;
  /** Whether traffic should be withheld when this one is down. */
  required: boolean;
  detail: string;
}

export interface ReadinessReport {
  ready: boolean;
  checkedAt: string;
  dependencies: DependencyReport[];
}

/**
 * Mongoose's own view of the connection, which costs nothing to read.
 *
 *   0 disconnected · 1 connected · 2 connecting · 3 disconnecting
 *
 * A ping would be more thorough and would also make the endpoint a way to generate load
 * against the database. The state is what the driver believes about a pool it maintains
 * continuously, and it is enough to tell a broken instance from a working one.
 */
export function databaseState(): DependencyReport {
  const s = mongoose.connection.readyState;
  return {
    name: 'mongodb',
    required: true,
    state: s === 1 ? 'up' : 'down',
    detail: ['disconnected', 'connected', 'connecting', 'disconnecting'][s] ?? String(s),
  };
}

/**
 * Redis, which backs the AI call queue.
 *
 * Reported, never required. If it is down, queued AI work waits; everything a student reads
 * still serves, and taking the instance out of rotation would turn a degraded feature into
 * a total outage.
 */
export function queueState(): DependencyReport {
  const configured = !!(process.env.REDIS_HOST || process.env.REDIS_URL);
  return {
    name: 'redis',
    required: false,
    state: configured ? 'up' : 'not_configured',
    detail: configured ? 'configured' : 'no REDIS_HOST or REDIS_URL set',
  };
}

/**
 * Whether an AI provider is configured at all — PRESENCE ONLY.
 *
 * Never a call. Reaching out to OpenAI on every health check would bill the product for
 * being monitored, and would make a provider's outage look like ours.
 */
export function aiProviderState(): DependencyReport {
  const configured = !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
  return {
    name: 'ai_provider',
    required: false,
    state: configured ? 'up' : 'not_configured',
    detail: configured ? 'a provider key is present' : 'no OPENAI_API_KEY or ANTHROPIC_API_KEY',
  };
}

/** Payment configuration presence. Reported, never required to serve traffic. */
export function paymentState(): DependencyReport {
  const configured = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  return {
    name: 'razorpay',
    required: false,
    state: configured ? 'up' : 'not_configured',
    detail: configured ? 'keys present' : 'no Razorpay keys set',
  };
}

export function readiness(): ReadinessReport {
  const dependencies = [databaseState(), queueState(), aiProviderState(), paymentState()];
  return {
    // Only a REQUIRED dependency can withhold traffic. Everything else is information.
    ready: dependencies.every(d => !d.required || d.state === 'up'),
    checkedAt: new Date().toISOString(),
    dependencies,
  };
}
