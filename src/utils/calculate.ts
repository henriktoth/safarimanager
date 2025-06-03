/**
 * Calculates the grid position based on the x and y coordinates and the unit size.
 *
 * @param x - The x mouse position on the view.
 * @param y - The y mouse position on the view.
 * @param unit - The size of the grid unit on the screen.
 * @returns The grid position as a tuple of [x, y] coordinates.
 */
export function calcGridPos(x: number, y: number, unit: number): [number, number] {
  return [Math.floor(x / unit), Math.floor(y / unit)]
}

/**
 * Calculates the coordinates based on the x and y coordinates and the unit size.
 *
 * @param x - The x mouse position on the view.
 * @param y - The y mouse position on the view.
 * @param unit - The size of the grid unit on the screen.
 * @returns The coordinates as a tuple of [x, y].
 */
export function calcCoords(x: number, y: number, unit: number): [number, number] {
  return [x / unit, y / unit]
}
