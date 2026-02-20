import { useState, useCallback, useRef } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { BarChart3, Network, Clock, LayoutDashboard, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";
import { TopBar } from "./TopBar";
import { IncidentFeed } from "./IncidentFeed";
import { RightPanel } from "./RightPanel";
import {
  incidents as initialIncidents,
  hypotheses,
  recommendedActions as initialActions,
  Incident,
  RecommendedAction,
} from "@/data/mockData";

const navItems = [
  { path: "/", label: "Overview", icon: LayoutDashboard },
  { path: "/evidence", label: "Evidence", icon: BarChart3 },
  { path: "/blast-radius", label: "Impact Map", icon: Network },
  { path: "/timeline", label: "Timeline", icon: Clock },
] as const;

export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [incidents, setIncidents] = useState<Incident[]>(initialIncidents);
  const [activeId, setActiveId] = useState(initialIncidents[0].id);
  const [currentStage, setCurrentStage] = useState(5);
  const [actions, setActions] = useState<RecommendedAction[]>(initialActions);
  const [isSimulating, setIsSimulating] = useState(false);
  const [bannerFlash, setBannerFlash] = useState(false);
  const [trustScore, setTrustScore] = useState(92);
  const [feedOpen, setFeedOpen] = useState(true);
  const [assistantOpen, setAssistantOpen] = useState(true);
  const simCounter = useRef(0);

  const activeIncident = incidents.find((i) => i.id === activeId) || incidents[0];

  const handleActionUpdate = useCallback((id: number, status: "approved" | "dismissed") => {
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  }, []);

  const handleSimulateAlert = useCallback(() => {
    if (isSimulating) return;
    setIsSimulating(true);
    setBannerFlash(true);
    simCounter.current += 1;
    const count = simCounter.current;

    const newIncident: Incident = {
      id: `INC-SIM-${count}`,
      severity: "critical",
      service: `api-gateway-${count}`,
      description: "Simulated: Connection timeout spike",
      timestamp: new Date().toISOString().slice(11, 16) + " UTC",
      status: "investigating",
      relativeTime: "just now",
    };

    setIncidents((prev) => [newIncident, ...prev]);
    setActiveId(newIncident.id);
    navigate("/");
    setCurrentStage(-1);
    setTrustScore(0);
    setActions(initialActions.map((a) => ({ ...a, status: "awaiting" as const })));

    setTimeout(() => setBannerFlash(false), 1500);

    const stageDelays = [600, 1800, 3000, 4200, 5400, 6600];
    const trustStages = [15, 38, 62, 82, 88, 92];
    stageDelays.forEach((delay, i) => {
      setTimeout(() => {
        setCurrentStage(i);
        setTrustScore(trustStages[i]);
      }, delay);
    });

    setTimeout(() => setIsSimulating(false), 7000);
  }, [isSimulating, navigate]);

  const topBarHeight = activeIncident && activeIncident.status !== "resolved" ? "pt-[84px]" : "pt-12";

  const severityLabels = { critical: "Critical", warning: "Warning", info: "Resolved" };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <TopBar
        activeIncident={activeIncident}
        onSimulateAlert={handleSimulateAlert}
        isSimulating={isSimulating}
        bannerFlash={bannerFlash}
        trustScore={trustScore}
      />

      <div className={`flex flex-1 ${topBarHeight} min-h-0`}>
        {feedOpen && (
          <IncidentFeed incidents={incidents} activeId={activeId} onSelect={setActiveId} />
        )}

        <div className="flex-1 flex flex-col min-w-0">
          {/* Page header */}
          <div className="px-6 pt-5 pb-3 border-b border-border bg-card flex items-start justify-between">
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                {activeIncident.service}
                <span className={`ml-3 text-xs font-medium px-2 py-0.5 rounded-md ${
                  activeIncident.severity === "critical"
                    ? "bg-severity-critical/10 text-severity-critical"
                    : activeIncident.severity === "warning"
                    ? "bg-severity-warning/10 text-severity-warning"
                    : "bg-severity-healthy/10 text-severity-healthy"
                }`}>
                  {severityLabels[activeIncident.severity]}
                </span>
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">{activeIncident.description}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-4">
              <button
                onClick={() => setFeedOpen((v) => !v)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title={feedOpen ? "Hide incidents" : "Show incidents"}
              >
                {feedOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setAssistantOpen((v) => !v)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title={assistantOpen ? "Hide assistant" : "Show assistant"}
              >
                {assistantOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <nav className="flex border-b border-border shrink-0 bg-card px-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    isActive
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex-1 min-h-0">
            <Outlet
              context={{
                currentStage,
                hypotheses,
                actions,
                onActionUpdate: handleActionUpdate,
                trustScore,
              }}
            />
          </div>
        </div>

        {assistantOpen && <RightPanel />}
      </div>
    </div>
  );
}
