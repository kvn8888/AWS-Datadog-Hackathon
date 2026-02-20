export type Severity = "critical" | "warning" | "info";
export type IncidentStatus = "investigating" | "identified" | "resolved";
export type ActionStatus = "awaiting" | "approved" | "executing" | "dismissed";

export interface Incident {
  id: string;
  severity: Severity;
  service: string;
  description: string;
  timestamp: string;
  status: IncidentStatus;
  relativeTime: string;
}

export interface Hypothesis {
  id: number;
  title: string;
  confidence: number;
  description: string;
  evidenceTags: string[];
}

export interface RecommendedAction {
  id: number;
  description: string;
  risk: "LOW" | "MEDIUM" | "HIGH";
  status: ActionStatus;
}

export interface TimelineEntry {
  time: string;
  icon: string;
  description: string;
}

export interface ChatMessage {
  role: "agent" | "user";
  content: string;
}

export const incidents: Incident[] = [
  {
    id: "INC-0847",
    severity: "critical",
    service: "payment-service",
    description: "Latency spike, p99 > 2000ms",
    timestamp: "14:23 UTC",
    status: "investigating",
    relativeTime: "2m ago",
  },
  {
    id: "INC-0846",
    severity: "warning",
    service: "auth-service",
    description: "Error rate elevated to 4.2%",
    timestamp: "14:18 UTC",
    status: "identified",
    relativeTime: "7m ago",
  },
  {
    id: "INC-0845",
    severity: "info",
    service: "search-api",
    description: "Timeout errors after deploy",
    timestamp: "13:10 UTC",
    status: "resolved",
    relativeTime: "1h ago",
  },
  {
    id: "INC-0844",
    severity: "warning",
    service: "notification-service",
    description: "Queue depth growing",
    timestamp: "13:45 UTC",
    status: "investigating",
    relativeTime: "40m ago",
  },
  {
    id: "INC-0843",
    severity: "info",
    service: "user-service",
    description: "Memory leak patched",
    timestamp: "11:30 UTC",
    status: "resolved",
    relativeTime: "3h ago",
  },
];

export const hypotheses: Hypothesis[] = [
  {
    id: 1,
    title: "Database Connection Pool Regression",
    confidence: 87,
    description:
      'Deploy payment-service@v2.4.1 introduced a database connection pool regression. The deploy at 14:23 UTC correlates with the latency spike onset. Connection pool exhaustion is causing cascading timeouts.',
    evidenceTags: ["Deploy Correlation", "Metric Spike", "Historical Pattern"],
  },
  {
    id: 2,
    title: "Upstream Retry Storm",
    confidence: 52,
    description:
      'Upstream auth-service error rate increase is causing retry storms on payment-service.',
    evidenceTags: ["Dependency Chain", "Error Correlation"],
  },
];

export const recommendedActions: RecommendedAction[] = [
  { id: 1, description: "Rollback payment-service to v2.3.9", risk: "MEDIUM", status: "awaiting" },
  { id: 2, description: "Scale up payment-service replicas to 8", risk: "LOW", status: "awaiting" },
  { id: 3, description: "Enable circuit breaker on auth-service → payment-service route", risk: "LOW", status: "awaiting" },
  { id: 4, description: "Page database on-call for connection pool investigation", risk: "LOW", status: "awaiting" },
];

export const timelineEntries: TimelineEntry[] = [
  { time: "14:22:00", icon: "deploy", description: "Deploy payment-service@v2.4.1 pushed by j.chen" },
  { time: "14:23:15", icon: "alert", description: "Alert: p99 latency > 2000ms on payment-service" },
  { time: "14:23:18", icon: "agent", description: "Agent activated — gathering evidence from Datadog" },
  { time: "14:23:22", icon: "agent", description: "Queried Datadog: 3 correlated traces found" },
  { time: "14:23:25", icon: "agent", description: "Queried Neo4j: blast radius computed (3 services, 2 hops)" },
  { time: "14:23:30", icon: "agent", description: "Root cause analysis complete — 2 hypotheses generated" },
  { time: "14:23:32", icon: "plan", description: "Response plan drafted — awaiting human approval" },
];

export const chatMessages: ChatMessage[] = [
  {
    role: "agent",
    content:
      "I've identified a likely root cause. The deploy at 14:23 correlates with the latency spike. Want me to dig deeper into the connection pool metrics?",
  },
  { role: "user", content: "Show blast radius for auth-service" },
  {
    role: "agent",
    content:
      "Auth-service has 4 downstream dependents: payment-service, user-service, session-manager, and audit-log. Currently, payment-service shows degraded performance.",
  },
];

export const evidenceData = {
  metrics: [
    { time: "14:23:15", text: "p99 latency: 2,340ms (baseline: 180ms)", highlight: true },
    { time: "14:23:16", text: "error_rate: 12.4% (baseline: 0.3%)", highlight: true },
    { time: "14:23:16", text: "connection_pool_active: 48/50 (threshold: 45)", highlight: false },
  ],
  traces: [
    { time: "14:23:18", text: "trace_id: 7f3a2b1c — POST /api/charge — 2,341ms — db_query: 2,180ms", highlight: true },
    { time: "14:23:19", text: "trace_id: 8e4b3c2d — POST /api/charge — 1,892ms — db_query: 1,740ms", highlight: false },
    { time: "14:23:20", text: "trace_id: 9d5c4e3f — POST /api/refund — timeout after 3,000ms", highlight: true },
  ],
  deploys: [
    { time: "14:22:00", text: "payment-service@v2.4.1 — j.chen — 'Update connection pool config'", highlight: true },
    { time: "13:15:00", text: "auth-service@v3.1.0 — m.smith — 'Add rate limiting'", highlight: false },
  ],
  historical: [
    { time: "2024-01-15", text: "INC-0623: Similar connection pool issue on payment-service — resolved by rollback", highlight: true },
    { time: "2023-11-02", text: "INC-0489: DB connection exhaustion after config change — resolved in 12m", highlight: false },
  ],
};

export const blastRadiusNodes = [
  { id: "payment-service", x: 400, y: 250, status: "down" as const, label: "payment-service" },
  { id: "checkout-api", x: 200, y: 150, status: "affected" as const, label: "checkout-api" },
  { id: "order-service", x: 250, y: 370, status: "affected" as const, label: "order-service" },
  { id: "billing-service", x: 600, y: 150, status: "affected" as const, label: "billing-service" },
  { id: "frontend-web", x: 50, y: 280, status: "at-risk" as const, label: "frontend-web" },
  { id: "mobile-api", x: 100, y: 400, status: "at-risk" as const, label: "mobile-api" },
  { id: "search-api", x: 600, y: 370, status: "healthy" as const, label: "search-api" },
  { id: "notification-service", x: 700, y: 250, status: "healthy" as const, label: "notification-svc" },
];

export const blastRadiusEdges = [
  { from: "checkout-api", to: "payment-service", label: "CALLS" },
  { from: "order-service", to: "payment-service", label: "DEPENDS_ON" },
  { from: "billing-service", to: "payment-service", label: "CALLS" },
  { from: "frontend-web", to: "checkout-api", label: "CALLS" },
  { from: "mobile-api", to: "checkout-api", label: "CALLS" },
  { from: "payment-service", to: "notification-service", label: "CALLS" },
  { from: "payment-service", to: "search-api", label: "CALLS" },
];

export const runbookContent = `## INC-2024-0847: payment-service Latency Spike
**Severity:** Critical | **Started:** 14:23 UTC | **Status:** Investigating

### Summary
Payment service experiencing p99 latency >2000ms following deploy v2.4.1.
Root cause likely connection pool regression. 3 downstream services affected.

### Immediate Actions
1. Rollback to v2.3.9
2. Scale replicas to 8
3. Enable circuit breaker

### Communication
- Notify #incident-response Slack channel
- Update status page: "Payment processing delays"
- Escalate to database team if not resolved in 15m

### Rollback Procedure
\`\`\`
kubectl rollout undo deployment/payment-service --to-revision=42
kubectl get pods -l app=payment-service -w
\`\`\`

### Monitoring
- Watch p99 latency: should drop below 200ms within 2m
- Monitor error rate: target < 0.5%
- Check connection pool: active connections should normalize`;

export const pipelineStages = [
  "Alert Received",
  "Evidence Gathering",
  "Graph Traversal",
  "Root Cause Analysis",
  "Response Drafted",
  "Awaiting Approval",
];
