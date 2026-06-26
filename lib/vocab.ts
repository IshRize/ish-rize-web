/**
 * Module: vocab
 * Layer:  lib (pure)
 * Context: See COPILOT_CONTEXT.md
 *
 * Purpose: Resolve a UI label from the org's configuration vocabulary, e.g.
 *          vocab(config, "activity") renders "Course" for a university or
 *          "Service" for a church. The same component tree serves any org by
 *          swapping config — never hardcode a noun here.
 */
import type { OrgConfig } from '@/types/scheduling';

export function vocab(config: OrgConfig | undefined | null, term: string): string {
  const fromConfig = config?.vocabulary[term];
  if (fromConfig) return fromConfig;
  return term.charAt(0).toUpperCase() + term.slice(1);
}
