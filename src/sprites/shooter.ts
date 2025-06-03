import Sprite from '@/sprites/sprite'

/**
 * Abstract class representing a shooter in the game.
 *
 * It extends the `Sprite` class and implements the `Shootable` interface.
 */
export default abstract class Shooter extends Sprite implements Shootable {
  protected _shootingAt?: Shootable
  protected _bulletTimer: number

  /**
   * Creates a new instance of `Shooter`.
   * @param x - The x grid position of the shooter.
   * @param y - The y grid position of the shooter.
   */
  constructor(x: number, y: number) {
    super(x, y)
    this._bulletTimer = 1
  }

  /**
   * Sets the shooting target for the shooter.
   * @param sprite - The target sprite to shoot at.
   */
  public shootAt = (sprite: Shootable) => {
    this._shootingAt = sprite
  }

  /**
   * Chooses a random target position within the bounds of the area.
   * @param bounds - The bounds of the area to wander in.
   * @param bounds.minX - The minimum x coordinate of the area.
   * @param bounds.minY - The minimum y coordinate of the area.
   * @param bounds.maxX - The maximum x coordinate of the area.
   * @param bounds.maxY - The maximum y coordinate of the area.
   * @returns The position of the random target, or `undefined` if none found.
   */
  protected chooseRandomTarget = (bounds: { minX: number, minY: number, maxX: number, maxY: number }): [number, number] | undefined => {
    const nonObstacleTiles = this._visibleTiles.filter(tile => !tile.isObstacle)

    if (nonObstacleTiles.length === 0) {
      return undefined
    }

    const randomTileIndex = Math.floor(Math.random() * nonObstacleTiles.length)
    const randomTile = nonObstacleTiles[randomTileIndex]
    const pathTo = [
      Math.max(bounds.minX, Math.min(bounds.maxX, randomTile.position[0])),
      Math.max(bounds.minY, Math.min(bounds.maxY, randomTile.position[1])),
    ]

    return pathTo as [number, number]
  }

  public abstract getShotBy: (shooter: Shooter) => boolean
}
