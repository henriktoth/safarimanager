import Animal from '@/sprites/animal'
import { tileEatenSignal } from '@/utils/signal'

/**
 * Abstract class representing a herbivore in the game.
 */
export default abstract class Herbivore extends Animal {
  // private _runningFrom?: Carnivore

  /**
   * Creates a new instance of `Herbivore`.
   *
   * @param x - The x grid position of the carnivore.
   * @param y - The y grid position of the carnivore.
   * @param group - The group ID the carnivore belongs to.
   */
  constructor(x: number, y: number, group: number) {
    super(x, y, group)
  }

  /**
   * Determines whether the animal is currently fleeing.
   *
   * @returns `true` if the animal is fleeing, `false` otherwise.
   */
  public isEnganged = (): boolean => {
    return false
  }

  protected updateMemory = () => {
    this.updateWaterMemory()
    this.updateFoodMemory()
  }

  protected updateFoodMemory = () => {
    const nearEdiblePositions = new Set<string>()

    this._visibleTiles.forEach((tile) => {
      const key = tile.position.toString()

      if (tile.isEdible) {
        this._seenFoodPositions.add(tile.position)
        nearEdiblePositions.add(key)
      }
    })

    for (const pos of this._seenFoodPositions) {
      const key = pos.toString()
      const isNear = this._visibleTiles.some(tile => tile.position[0] === pos[0] && tile.position[1] === pos[1])
      if (!nearEdiblePositions.has(key) && isNear) {
        this._seenFoodPositions.delete(pos)
      }
    }
  }

  protected fillFoodLevel = (): void => {
    const nearTiles = this.getNearTiles()

    nearTiles?.forEach((tile) => {
      if (tile.isEdible) {
        this._foodLevel = 100
        tileEatenSignal.emit(tile)
        // this._restingTime = 25 + Math.random() * 20
      }
    })
  }
}
