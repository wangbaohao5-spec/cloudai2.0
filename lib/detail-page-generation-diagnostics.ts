import { maskDiagnosticId } from "@/lib/ai/provider-observability";
import type {
  DetailPageGenerationEventType,
  DetailPageGenerationPagePhase,
  DetailPageNavigationType,
} from "@/lib/detail-page-project";

export function logDetailPageGenerationTrigger({
  event,
  eventType,
  intentId,
  moduleType,
  navigationType,
  pagePhase,
  projectRevision,
  requestId,
  sectionId,
}: {
  event: "intent-created" | "intent-consumed" | "intent-rejected";
  eventType: DetailPageGenerationEventType;
  intentId: string;
  moduleType: string;
  navigationType: DetailPageNavigationType;
  pagePhase: DetailPageGenerationPagePhase;
  projectRevision: number;
  requestId?: string | null;
  sectionId: string;
}) {
  console.info("[detail-page-generation-trigger]", {
    event,
    eventType,
    intentId: maskDiagnosticId(intentId),
    moduleType,
    navigationType,
    pagePhase,
    projectRevision,
    requestId: maskDiagnosticId(requestId),
    sectionId,
    timestamp: new Date().toISOString(),
  });
}
