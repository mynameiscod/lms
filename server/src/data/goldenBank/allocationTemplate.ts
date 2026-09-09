/**
 * The fifteen-family allocation shape, applied by position.
 *
 * WHY A TEMPLATE AND NOT FIFTEEN HAND-WRITTEN ARRAYS PER SKILL. The constraint is the same every
 * time — ten questions at each of five levels, fifty in all — and satisfying it by hand for
 * twenty-three skills would be three hundred and forty-five numbers, every one of them a chance
 * to be quietly wrong. The shape below is stated once, applied by position, and then checked
 * against each family's own declared difficulty range. A design that does not fit the shape fails
 * validation rather than being bent to fit it.
 *
 * THE SHAPE IS NOT AN EQUAL SPLIT. Recognition families carry four, three and three D1 questions
 * because there are that many distinct things worth recognising; the middle carries one or two
 * each across D2 to D4; and three closing families carry the D5 weight because transfer questions
 * are few and expensive. Fifty spread evenly over fifteen families would be three of everything,
 * which is precisely the pressure that produces wording variants.
 *
 * AUTHORING ORDER THEREFORE MATTERS. A skill's families are written in the order the template
 * expects: three recognition, then application, then diagnosis, then transfer. That order also
 * happens to be how the material is taught, so the file reads as a progression rather than as a
 * list sorted to satisfy a spreadsheet.
 *
 * A SKILL MAY DEPART FROM IT. Batch 1 does — its skills were authored before the rule existed and
 * carry fourteen to seventeen families with their own explicit allocations. The template is a
 * convenience for skills designed against it, not a requirement of the format.
 */

/** [D1, D2, D3, D4, D5] for one family. */
export type Allocation = [number, number, number, number, number];

/** Position → [D1, D2, D3, D4, D5]. Totals: 10 per level, 50 per skill. */
export const TEMPLATE_15: Allocation[] = [
  [4, 1, 0, 0, 0],   // 1  recognition, the widest entry point
  [3, 1, 0, 0, 0],   // 2  recognition
  [3, 1, 0, 0, 0],   // 3  recognition
  [0, 1, 1, 0, 0],   // 4  interpretation
  [0, 1, 1, 0, 0],   // 5  interpretation
  [0, 1, 1, 1, 0],   // 6  application reaching diagnosis
  [0, 1, 1, 1, 0],   // 7
  [0, 1, 1, 1, 0],   // 8
  [0, 1, 1, 1, 0],   // 9
  [0, 1, 1, 1, 0],   // 10
  [0, 0, 1, 1, 0],   // 11 application/diagnosis only
  [0, 0, 1, 1, 0],   // 12
  [0, 0, 1, 1, 3],   // 13 diagnosis reaching transfer
  [0, 0, 0, 1, 4],   // 14 transfer-weighted
  [0, 0, 0, 1, 3],   // 15 transfer
];

/**
 * The difficulty range each template position needs its family to declare.
 *
 * Stated so a design error is caught at authoring rather than at validation: a family placed at
 * position 14 must genuinely be a D4-D5 measurement, and if it is not, it belongs somewhere else
 * in the order.
 */
export const TEMPLATE_15_RANGES: Array<['D1' | 'D2' | 'D3' | 'D4', 'D2' | 'D3' | 'D4' | 'D5']> = [
  ['D1', 'D2'], ['D1', 'D2'], ['D1', 'D2'],
  ['D2', 'D3'], ['D2', 'D3'],
  ['D2', 'D4'], ['D2', 'D4'], ['D2', 'D4'], ['D2', 'D4'], ['D2', 'D4'],
  ['D3', 'D4'], ['D3', 'D4'],
  ['D3', 'D5'],
  ['D4', 'D5'], ['D4', 'D5'],
];

/** Apply the template to one skill's families, in the order they were authored. */
export function allocateByTemplate(familyIds: string[]): Record<string, Allocation> {
  if (familyIds.length !== TEMPLATE_15.length) {
    throw new Error(`Template expects ${TEMPLATE_15.length} families, got ${familyIds.length}: `
      + familyIds.join(', '));
  }
  return Object.fromEntries(familyIds.map((id, i) => [id, TEMPLATE_15[i]]));
}
