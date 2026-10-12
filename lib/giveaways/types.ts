/**
 * Shared giveaway types. Isomorphic, no imports: the DB schema, the server,
 * and the public browser verifier all use these.
 */

export type RulesSection = {
  id: string;
  heading: string;
  paragraphs: string[];
};

/** The rendered Official Rules, frozen at go-live. Later template edits can
 *  never change a live giveaway's Rules because the sections are stored,
 *  not re-rendered from settings. */
export type RulesDocument = {
  version: string;
  title: string;
  /** Rendered in normal case; the page uppercases the headline with CSS. */
  headline: string[];
  sections: RulesSection[];
};

export type PoolEntry = { entryId: string; entrantId: string };

export type DrawResult = {
  /** 0 = winner, 1..ALTERNATES = alternates in order. */
  rank: number;
  entryId: string;
  entrantId: string;
  ticket: string;
};

export type Beacon = {
  round: number;
  randomness: string;
  signature: string;
};

/** Everything a member of the public needs to recompute a draw. */
export type PublishedDraw = {
  algorithm: string;
  seedCommit: string;
  poolHash: string;
  poolSize: number;
  entrantCount: number;
  chainHash: string;
  latestRoundAtLock: number;
  targetRound: number;
  lockedAt: string;
  beacon: Beacon;
  serverSeed: string;
  finalSeed: string;
  results: DrawResult[];
};

export type VerifyCheck = {
  name: string;
  pass: boolean | "skipped";
  detail?: string;
};

export type VerifyReport = { ok: boolean; checks: VerifyCheck[] };

/** Derived from stored status + the clock; no cron needed. */
export type GiveawayPhase =
  | "draft"
  | "scheduled"
  | "open"
  | "closed"
  | "ready_to_draw"
  | "drawing"
  | "drawn"
  | "completed"
  | "canceled";
