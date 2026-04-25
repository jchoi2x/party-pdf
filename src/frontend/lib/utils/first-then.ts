/**
 * Returns a function that calls the first function if it has not been called yet, otherwise calls the second function.
 *
 * @export
 * @template A
 * @template R1
 * @template R2
 * @param {A} onFirst
 * @param {A} thereafter
 * @returns {(...args: A) => R1 | R2}
 */
export function firstThen<A extends readonly unknown[], R1, R2>(
  onFirst: (...args: A) => R1,
  thereafter: (...args: A) => R2,
): (...args: A) => R1 | R2 {
  let first = true;
  return (...args: A) => {
    if (first) {
      first = false;
      return onFirst(...args);
    }
    return thereafter(...args);
  };
}