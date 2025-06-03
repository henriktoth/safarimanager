import Carnivore from '@/sprites/carnivore'
import Poacher from '@/sprites/poacher'
import Shooter from '@/sprites/shooter'
import { bountySignal, shooterDeadSignal, updateVisiblesSignal } from '@/utils/signal'

/**
 * Class representing a ranger in the game.
 *
 * It extends the `Shooter` class and implements the `Buyable` interface.
 */
export default class Ranger extends Shooter implements Buyable {
  protected static id = 'safari:ranger'
  private _chasing?: Carnivore | Poacher
  declare protected _jsonData: RangerJson

  /**
   * Creates a new instance of `Ranger`.
   * @param x - The x grid position of the ranger.
   * @param y - The y grid position of the ranger.
   */
  constructor(x: number, y: number) {
    super(x, y)
  }

  /**
   * Gets the current target of the ranger.
   *
   * @returns The target of the ranger, which can be a `Carnivore` or `Poacher`, or `undefined` if no target is set.
   */
  public get chasing(): Carnivore | Poacher | undefined {
    return this._chasing
  }

  /**
   * Sets the target of the ranger.
   *
   * @param value - The target to set, which can be a `Carnivore` or `Poacher`.
   */
  public set chasing(value: Carnivore | Poacher) {
    this._chasing = value
    this.pathTo = value.position
  }

  /**
   * Gets the price of the ranger.
   *
   * @returns The price of the ranger.
   */
  public get buyPrice(): number {
    return this._jsonData.buyPrice
  }

  /**
   * Gets the salary of the ranger.
   *
   * @returns The salary of the ranger.
   */
  public get salary(): number {
    return this._jsonData.salary
  }

  public getShotBy = (_shooter: Shooter): boolean => {
    const chance = Math.random()
    if (chance < 0.5) {
      shooterDeadSignal.emit(this)
      return true
    }
    return false
  }

  public act = (dt: number) => {
    updateVisiblesSignal.emit(this)

    this.movement(dt)

    if (!this._shootingAt && !this._chasing) {
      this._shootingAt = this.closePoachers()[Math.floor(Math.random() * this.closePoachers().length)]
    }

    if (this._shootingAt) {
      this._bulletTimer -= dt

      if (this._bulletTimer <= 0) {
        this._bulletTimer = 1

        if (this._shootingAt.getShotBy(this)) {
          this.pathTo = undefined
          const multiplier = 0.8 + Math.random() * 0.7

          if (this._shootingAt instanceof Carnivore) {
            bountySignal.emit(Math.round(this._shootingAt.sellPrice * multiplier))
          }
          else if (this._shootingAt instanceof Poacher && this._chasing) {
            bountySignal.emit(Math.round(200 * multiplier))
          }

          this._shootingAt = undefined
          this._chasing = undefined
          updateVisiblesSignal.emit(this, true)
        }
      }
    }
  }

  /**
   * Gets the list of poachers that are close to the ranger.
   * @returns An array of `Poacher` objects that are close to the ranger.
   */
  private closePoachers = (): Poacher[] => {
    return this._visibleSprites.filter(sprite => sprite instanceof Poacher) as Poacher[]
  }

  /**
   * Decides the movement of the ranger.
   * @param dt - The delta time since the last frame.
   */
  private movement = (dt: number) => {
    const bounds = this.computeBounds(this._visibleTiles)
    if (!this.pathTo && !this._shootingAt) {
      this.pathTo = this.chooseRandomTarget(bounds)
    }

    if (this.chasing) {
      if (this.isAtDestination(this.viewDistance)) {
        this.handleArrival()
      }
    }
    else {
      if (this.isAtDestination()) {
        this.handleArrival()
      }
    }

    this.move(dt, bounds.minX, bounds.minY, bounds.maxX, bounds.maxY)
  }

  /**
   * Handles the poacher's arrival at its destination.
   */
  private handleArrival = () => {
    if (!this.pathTo)
      return

    this.velocity = [0, 0]
    this.pathTo = undefined

    if (this._chasing) {
      updateVisiblesSignal.emit(this, true)
      this._shootingAt = this._chasing
      if (this._shootingAt) {
        this.pathTo = this._chasing.position
      }
    }

    this._restingTime = 5 + Math.random() * 4
  }
}
