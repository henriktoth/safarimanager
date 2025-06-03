import type Tile from '@/tiles/tile'
import type Visitor from '@/visitor'
import Animal from '@/sprites/animal'
import Sprite from '@/sprites/sprite'
import { tourFinishedSignal, updateVisiblesSignal } from '@/utils/signal'

export default class Jeep extends Sprite implements Buyable {
  protected static id = 'safari:jeep'

  private _passengers: Visitor[]
  private _path: Tile[]

  declare protected _jsonData: JeepJson

  /**
   * The price of the jeep.
   *
   * @returns The price of the jeep.
   */
  public get buyPrice(): number {
    return this._jsonData.buyPrice
  }

  /**
   * The next tile to which the jeep is heading.
   *
   * @returns The coordinates of the next tile to which the jeep is heading.
   */
  public get pathTo(): [number, number] | undefined {
    return this._path.length > 0
      ? [...this._path[0].position]
      : undefined
  }

  /**
   * Constructs a new instance of with no passengers and no path.
   */
  constructor() {
    super(0, 0)
    this._passengers = []
    this._path = []
  }

  /**
   * Adds a passenger to the jeep.
   *
   * @param passenger The passenger to add to the jeep.
   */
  public addPassenger(passenger: Visitor) {
    this._passengers.push(passenger)
  }

  /**
   * Chooses a path from the given paths and saves it to the jeep.
   *
   * @param paths The paths to choose from.
   */
  public choosePath(paths: Tile[][]) {
    const n = paths.length
    const r = Math.floor(Math.random() * n)
    this._path = [...paths[r]]
  }

  public act = (dt: number) => {
    if (this.pathTo) {
      const dx = this.pathTo[0] - this.position[0]
      const dy = this.pathTo[1] - this.position[1]
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 0) {
        this.velocity = [dx / dist * this.speed, dy / dist * this.speed]
        const moveX = this.velocity[0] * dt / 10
        const moveY = this.velocity[1] * dt / 10
        if (Math.abs(moveX) >= Math.abs(dx) && Math.abs(moveY) >= Math.abs(dy)) {
          this.position = this.pathTo
          this._path.shift()
          updateVisiblesSignal.emit(this)
        }
        else {
          this.position[0] += moveX
          this.position[1] += moveY
        }
      }
      else {
        this._path.shift()
      }
    }
    else {
      this._passengers = []
      this.position = [0, 0]
      this.velocity = [0, 0]
      tourFinishedSignal.emit(this)
    }

    const animals = this._visibleSprites.filter(s => s instanceof Animal)
    for (const passenger of this._passengers)
      passenger.lookAt(animals)
  }

  /**
   * Gets the ratings from the passengers in the jeep.
   *
   * @returns The ratings from the passengers in the jeep.
   */
  public getRatings(): number[] {
    return this._passengers.map(passenger => passenger.rating)
  }
}
