// ═══════════════════════════════════════════════════════════════
// AI provider contract — the ONLY surface the rest of the backend
// depends on. Replace/add providers without touching business logic.
// ═══════════════════════════════════════════════════════════════

export type SeverityLevel = 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface AIDiseaseContext {
  name: string;
  symptoms: string;
  visibleSigns?: string | null;
  pathogenType: string;
  defaultSeverity: SeverityLevel;
}

export interface AICropContext {
  cropName: string;
  scientificName?: string | null;
  diseases: AIDiseaseContext[];
}

export interface AIAnalysisInput {
  imageBuffer: Buffer;
  mimeType: string;
  crop: AICropContext;
  symptomsText?: string | null;
  locationText?: string | null;
}

export interface AIAnalysisOutput {
  provider: string;
  /** TRUE for the development mock — surfaced end-to-end, never hidden. */
  isMock: boolean;
  modelVersion?: string;
  predictedLabel: string;
  /** 0..1 */
  confidence: number;
  severity: SeverityLevel;
  healthy: boolean;
  /** Short visual findings (lesion coverage, discoloration, patterns…). */
  indicators: string[];
  reasoning?: string;
  raw?: string;
  processingTimeMs: number;
}

export interface AIProvider {
  readonly name: string;
  readonly isMock: boolean;
  analyze(input: AIAnalysisInput): Promise<AIAnalysisOutput>;
}

export class AIProviderError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'AIProviderError';
  }
}

/** Shape every real provider must return as strict JSON. */
export const AI_JSON_CONTRACT = `{
  "predictedLabel": string,     // disease name from the allowed list, or "Healthy"
  "confidence": number,         // 0..1
  "severity": "NONE"|"LOW"|"MODERATE"|"HIGH"|"CRITICAL",
  "healthy": boolean,
  "indicators": string[],       // 2-5 concrete visual findings
  "reasoning": string           // 2-3 sentences, agronomist tone
}`;
