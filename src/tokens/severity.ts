/**
 * The severity contract. SEVERITY in ./palette is the one vocabulary maps, charts and badges use for severity;
 * these are its keys, plus the bridge for a product that still speaks other vocabularies.
 */
import { SEVERITY, type SeverityKey } from './palette'

/** The canonical severity keys, in palette order. */
export const SEVERITY_KEYS = Object.keys(SEVERITY) as SeverityKey[]

/**
 * Every severity-like term arano-fibre uses, read from its sources on 2026-10-17:
 *  - src/frontend/src/types/api.ts: AlarmSeverity (critical, major, minor, warning, info, cleared),
 *    AnomalySeverity (critical, high, medium, low, info), EntityHealthStatus (healthy, warning, degraded, critical);
 *  - src/frontend/src/types/mirror.ts: Severity (critical, major, minor);
 *  - src/frontend/src/components/modules/fuse/types.ts: SimAlarmSeverity (critical, major, minor, drop_network).
 * RiskCategory (critical, high, medium, low, minimal) is a separate risk scale in both products, not severity.
 */
export const FIBRE_SEVERITY_TERMS = [
  'critical', 'major', 'minor', 'warning', 'info', 'cleared',
  'high', 'medium', 'low',
  'healthy', 'degraded',
  'drop_network',
] as const
export type FibreSeverity = (typeof FIBRE_SEVERITY_TERMS)[number]

/**
 * arano-fibre's terms mapped onto the canonical keys, for its migration (WP6). Total: the type rejects a missing
 * term, so a new Fibre term has to be decided here, not defaulted.
 */
export const FIBRE_SEVERITY_ALIASES: Readonly<Record<FibreSeverity, SeverityKey>> = {
  critical: 'critical',
  major: 'major',
  minor: 'minor',
  warning: 'warning',
  info: 'info',
  // An alarm whose condition has ended. ITU-T X.733 lists `cleared` as a perceived severity and NOC tooling
  // conventionally shows it green, so it reads as healthy, not as a muted fault.
  cleared: 'healthy',
  // AnomalySeverity is a five-step scale; its middle steps take the canonical step of the same rank. medium and
  // low share a colour (SEVERITY.moderate is SEVERITY.minor), so their labels must carry the difference.
  high: 'major',
  medium: 'moderate',
  low: 'minor',
  healthy: 'healthy',
  // EntityHealthStatus runs healthy < warning < degraded < critical. Degraded is the step below critical, so it
  // takes major. It must NOT become critical by accident: STATE.degraded happens to share critical's red, and an
  // entity that is degraded is not one that has failed.
  degraded: 'major',
  // A simulated network drop takes service down, so it is critical.
  drop_network: 'critical',
}
