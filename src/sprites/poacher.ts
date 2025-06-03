import Animal from '@/sprites/animal'
import Jeep from '@/sprites/jeep'
import Ranger from '@/sprites/ranger'
import Shooter from '@/sprites/shooter'
import { shooterDeadSignal, updateVisiblesSignal } from '@/utils/signal'

/**
 * Class representing a poacher in the game.
 *
 * It extends the `Shooter` class and implements the `Shootable` interface.
 */
export default class Poacher extends Shooter {
  protected static id = 'safari:poacher'
  private _robbing?: Animal
  private _chasing?: Animal
  private _exit: [number, number]
  private _isVisible: boolean

  /**
   * Determines whether the poacher is currently visible.
   *
   * @returns `true` if the poacher is visible, `false` otherwise.
   */
  public get isVisible(): boolean {
    return this._isVisible
  }

  /**
   * Creates a new instance of `Poacher`.
   *
   * @param x - The x grid position of the poacher.
   * @param y - The y grid position of the poacher.
   * @param exit - The exit position of the map.
   */
  constructor(x: number, y: number, exit: [number, number]) {
    super(x, y)
    this._exit = exit
    this._isVisible = false
  }

  public act = (dt: number) => {
    updateVisiblesSignal.emit(this)
    this.movement(dt)
    this.setVisibility()

    if (Math.random() < 0.5) {
      if (!this._shootingAt && !this._robbing && !this._chasing) {
        this._shootingAt = this.closeAnimals()[Math.floor(Math.random() * this.closeAnimals().length)]
      }
    }
    else {
      if (!this._chasing && !this._shootingAt && !this._robbing) {
        this._chasing = this.closeAnimals()[Math.floor(Math.random() * this.closeAnimals().length)]
        if (this._chasing) {
          this.pathTo = this._chasing.position
        }
      }
    }

    if (this._shootingAt) {
      this._bulletTimer -= dt

      if (this._bulletTimer <= 0) {
        this._bulletTimer = 1

        if (this._shootingAt.getShotBy(this)) {
          this._shootingAt = undefined
          updateVisiblesSignal.emit(this, true)
        }
      }
    }
  }

  public getShotBy = (shooter: Shooter): boolean => {
    this._shootingAt = shooter
    const chance = Math.random()
    if (chance < 0.5) {
      shooterDeadSignal.emit(this)
      return true
    }
    return false
  }

  /**
   * Gets the list of animals that are close to the poacher and is not being captured.
   * @returns An array of `Animal` objects.
   */
  private closeAnimals = (): Animal[] => {
    return this._visibleSprites.filter(sprite => sprite instanceof Animal && !sprite.isBeingCaptured) as Animal[]
  }

  /**
   * Sets the poacher's visible state.
   */
  private setVisibility = () => {
    this._isVisible = this._visibleSprites.some(x => x instanceof Jeep || x instanceof Ranger)
  }

  /**
   * Decides the movement of the poacher.
   * @param dt - The delta time since the last frame.
   */
  private movement = (dt: number) => {
    const bounds = this.computeBounds(this._visibleTiles)
    if (!this.pathTo) {
      this.pathTo = this.chooseRandomTarget(bounds)
    }

    if (this.pathTo && this.isAtDestination()) {
      this.handleArrival()
    }
    else {
      this.move(dt, bounds.minX, bounds.minY, bounds.maxX, bounds.maxY)
    }
  }

  /**
   * Handles the poacher's arrival at its destination.
   */
  private handleArrival = () => {
    if (!this.pathTo)
      return

    this.velocity = [0, 0]
    this.pathTo = undefined

    if (this._robbing) {
      this._robbing = undefined
    }

    if (this._chasing) {
      updateVisiblesSignal.emit(this, true)
      this._robbing = this._visibleSprites.find(sprite => sprite === this._chasing) as Animal
      if (this._robbing) {
        this._robbing.capture(this._exit)
        this.pathTo = this._exit
      }
      this._chasing = undefined
    }

    this._restingTime = 5 + Math.random() * 4
  }
}
