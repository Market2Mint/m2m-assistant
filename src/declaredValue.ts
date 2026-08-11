/**
 * THE DECLARED-VALUE CAP, AND THE ONE RULE FOR NOT SHOWING IT.
 *
 * Every service carries `maxInsuredValue`, the grading tier's maximum declared value.
 * Some services have no cap at all, and the generated menu writes that as the literal
 * string `NA` — a data sentinel, never a thing to print. It leaked to customers twice:
 * the tier chooser guarded it while the results detail tile and the cart line chip did
 * not, so a Pregrading line read "MAX DECLARED VALUE / NA" on a live kiosk.
 *
 * The sentinel was a magic string repeated at three render sites with no test anywhere,
 * which fails OPEN: add a fourth site, or regenerate the menu with a different spelling,
 * and "NA" is back in front of a customer with nothing erroring. One predicate, one
 * constant, and `declaredValue.test.ts` pins both against the live menu.
 *
 * The rule when there is no cap is OMIT THE WHOLE FIELD — never "NA", never "N/A",
 * never an em dash. A placeholder in a value slot reads as a fault, not as a fact.
 */

import { SERVICE_MENU } from './serviceMenu';

/** What the generated menu writes when a service has no declared-value cap. */
export const NO_DECLARED_VALUE_CAP = 'NA';

/**
 * Should this service show a declared-value figure at all?
 *
 * Guards every customer-facing render of `maxValue`. Deliberately also refuses empty
 * and whitespace-only values: those would render as a labelled blank box, which is the
 * same defect wearing a different hat.
 */
export const hasDeclaredValueCap = (maxValue: string | null | undefined): boolean =>
  typeof maxValue === 'string' &&
  maxValue.trim() !== '' &&
  maxValue.trim().toUpperCase() !== NO_DECLARED_VALUE_CAP;

/** Active services with no cap — the population this rule exists for. */
export const uncappedActiveServiceNames = (): string[] => [
  ...new Set(
    SERVICE_MENU.filter((s) => s.active && !hasDeclaredValueCap(s.maxInsuredValue)).map(
      (s) => s.name,
    ),
  ),
];
