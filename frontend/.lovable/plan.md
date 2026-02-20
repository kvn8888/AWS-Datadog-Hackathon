

# IncidentGraph — Incident Command Center

## Overview
A real-time incident command center dashboard that simulates an autonomous incident response system. Dark-themed, dense, professional — designed to look like enterprise-grade SRE tooling (Datadog/Grafana inspired).

## Design System
- **Dark theme**: Near-black backgrounds (#0a0a0f, #12121a, #1a1a2e) with vibrant severity accent colors (red/orange/green/blue/purple)
- **Typography**: JetBrains Mono for metrics/logs/code, Inter for UI labels
- **Style**: Sharp corners (2-4px radius), thin borders, subtle glassmorphism, glow effects on critical alerts
- **Dense, information-rich layout** — Bloomberg Terminal meets modern SRE

## Layout (Single Page Dashboard)

### Top Bar
- IncidentGraph logo/wordmark with graph icon
- Active incident banner with pulsing red dot, title, severity badge, and live elapsed time counter
- "Simulate Alert" button and mock connection status indicators (Datadog, Neo4j, Bedrock)

### Left Sidebar (~280px) — Incident Feed
- Scrollable list of 5-6 pre-populated mock incidents
- Each with severity badge, service name, description, relative timestamp, and status pill
- Active incident highlighted with accent border
- Clickable to "select" an incident

### Center Column — Tabbed Workspace
**Tab 1: Overview**
- Agent pipeline stepper (Alert Received → Evidence Gathering → Graph Traversal → Root Cause Analysis → Response Drafted → Awaiting Approval) with animated states
- Root Cause Hypotheses card with ranked hypotheses, confidence bars, and evidence tags
- Recommended Actions card with approve/dismiss buttons that update status on click

**Tab 2: Evidence**
- Terminal-styled log/evidence view with sections for Datadog Metrics, Traces, Recent Deploys, Historical Incidents
- Monospace text with highlighted keywords

**Tab 3: Blast Radius**
- Custom SVG network graph showing service dependency blast radius
- Color-coded nodes (red=down, orange=affected, yellow=at-risk, gray=healthy) with labeled edges
- Impact summary line below

**Tab 4: Timeline**
- Vertical timeline of incident events with timestamps, icons, and descriptions
- Alternating row backgrounds for readability

### Right Sidebar (~320px)
- **Drafted Runbook** — scrollable markdown-style incident response document with "Copy to Clipboard" button
- **Agent Chat Panel** — mock chat interface with pre-populated conversation and input field

## Interactive Behavior
- **Simulate Alert**: Triggers animated sequence — banner flash, new incident added, agent pipeline animates through stages with delays, populates overview data
- **Approve/Dismiss actions**: Status updates with green checkmark animation
- **Incident selection**: Clicking sidebar incidents updates center content
- **Tab switching**: Smooth content transitions

## Technical Approach
- React + TypeScript + Tailwind CSS + shadcn/ui components
- Custom SVG for blast radius graph (no external graph library needed)
- All data mocked/hardcoded — no backend
- Optimized for 1440px+ laptop screens

