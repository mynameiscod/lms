/**
 * The one copyright line, so eight footers cannot disagree about who owns the product.
 *
 * They already did. Before this there were four wordings across eight files — "CodeBegun",
 * "CodeBegun · CareerPilot", "CodeBegun." and the full legal entity — and only one of them named
 * the company that actually holds the copyright. A footer is the one place a visitor looks to
 * find out who they are dealing with, so the wording is a legal statement, not decoration.
 *
 * THE YEAR IS COMPUTED, NOT WRITTEN. The line asked for was "© 2026 …", and one of the eight
 * footers did hard-code it. That renders identically today and silently becomes wrong on 1
 * January — a stale copyright year is the classic sign of an abandoned site, and nobody is
 * reminded to fix it because nothing breaks.
 */

export const LEGAL_ENTITY = 'Savas Tech Solution Pvt Ltd';

/** `© 2026 CodeBegun by Savas Tech Solution Pvt Ltd · All rights reserved` */
export const copyrightLine = (): string =>
  `© ${new Date().getFullYear()} CodeBegun by ${LEGAL_ENTITY} · All rights reserved`;
