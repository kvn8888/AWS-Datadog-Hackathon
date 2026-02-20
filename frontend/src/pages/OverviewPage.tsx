import { useOutletContext } from "react-router-dom";
import { OverviewTab } from "@/components/incident/OverviewTab";
import { Hypothesis, RecommendedAction } from "@/data/mockData";

interface OverviewContext {
  currentStage: number;
  hypotheses: Hypothesis[];
  actions: RecommendedAction[];
  onActionUpdate: (id: number, status: "approved" | "dismissed") => void;
  trustScore: number;
}

export default function OverviewPage() {
  const { currentStage, hypotheses, actions, onActionUpdate, trustScore } =
    useOutletContext<OverviewContext>();

  return (
    <OverviewTab
      currentStage={currentStage}
      hypotheses={hypotheses}
      actions={actions}
      onActionUpdate={onActionUpdate}
      trustScore={trustScore}
    />
  );
}
