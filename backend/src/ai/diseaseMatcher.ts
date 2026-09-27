// Maps a free-text AI label onto a Disease catalogue row for the given crop.
// exact → containment → token-overlap (fuzzy). Unmatched labels force expert review.
export interface MatchCandidate {
  id: string;
  name: string;
}

export interface MatchResult {
  diseaseId: string | null;
  matchedBy: 'exact' | 'contains' | 'fuzzy' | 'none';
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(s: string): Set<string> {
  return new Set(normalize(s).split(' ').filter((w) => w.length > 2));
}

export function matchDiseaseLabel(label: string, candidates: MatchCandidate[]): MatchResult {
  const norm = normalize(label);
  if (!norm || norm === 'healthy' || norm === 'no disease' || norm === 'none') {
    return { diseaseId: null, matchedBy: 'none' };
  }

  // 1. exact
  const exact = candidates.find((c) => normalize(c.name) === norm);
  if (exact) return { diseaseId: exact.id, matchedBy: 'exact' };

  // 2. containment (either direction)
  const contains = candidates.find(
    (c) => normalize(c.name).includes(norm) || norm.includes(normalize(c.name)),
  );
  if (contains) return { diseaseId: contains.id, matchedBy: 'contains' };

  // 3. fuzzy token overlap (Jaccard ≥ 0.5)
  const labelTokens = tokens(label);
  let best: MatchCandidate | null = null;
  let bestScore = 0;
  for (const c of candidates) {
    const cTokens = tokens(c.name);
    const union = new Set([...labelTokens, ...cTokens]);
    const intersection = [...labelTokens].filter((t) => cTokens.has(t)).length;
    const score = union.size ? intersection / union.size : 0;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  if (best && bestScore >= 0.5) return { diseaseId: best.id, matchedBy: 'fuzzy' };

  return { diseaseId: null, matchedBy: 'none' };
}
