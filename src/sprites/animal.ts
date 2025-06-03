import type SpriteDrawData from '@/spriteDrawData'
import type Shooter from '@/sprites/shooter'
import type Tile from '@/tiles/tile'
import Sprite from '@/sprites/sprite'
import { NeedStatus } from '@/types/needStatus'
import { animalDeadSignal, updateVisiblesSignal } from '@/utils/signal'

/**
 * Abstract class representing an animal in the game.
 *
 * It extends the `Sprite` class and implements the `Shootable`, `Mortal`, `Buyable` and `Sellable` interfaces.
 */
export default abstract class Animal extends Sprite implements Shootable, Buyable, Sellable {
  private _age: number
  private _isCaptured: boolean
  private _group: number
  private _hasChip: boolean
  private _isWandering: boolean
  private _targetNeed: NeedStatus
  protected _foodLevel: number
  protected _hydrationLevel: number
  protected _seenFoodPositions: Set<[number, number]>
  protected _seenWaterPositions: Set<[number, number]>
  declare protected _jsonData: AnimalJson

  /**
   * Gets the current age of the animal.
   *
   * @returns The current age
   */
  public get age(): number {
    return this._age
  }

  /**
   * Gets the group of the animal.
   *
   * @returns The group number.
   */
  public get group(): number {
    return this._group
  }

  /**
   * Sets the group of the animal.
   *
   * @param value - The new group number.
   */
  public set group(value: number) {
    this._group = value
  }

  /**
   * Indicates whether the animal has a tracking chip.
   *
   * @return `true` if chipped, `false` otherwise.
   */
  public get hasChip(): boolean {
    return this._hasChip
  }

  /**
   * Sets the animal's chip status.
   *
   * @param value - `true` if chipped, `false` otherwise.
   */
  public set hasChip(value: boolean) {
    this._hasChip = value
  }

  /**
   * Gets the animal's buy price.
   *
   * @returns The price to buy the animal.
   */
  public get buyPrice(): number {
    return this._jsonData.buyPrice
  }

  /**
   * Gets the animal's sell price.
   *
   * @returns The price to sell the animal.
   */
  public get sellPrice(): number {
    return this._jsonData.buyPrice * 0.5
  }

  /**
   * Gets the animal's chip price.
   *
   * @returns The price to chip the animal.
   */
  public get chipPrice(): number {
    return this._jsonData.chipPrice
  }

  /**
   * Indicates whether the animal is hungry.
   *
   * @return `true` if hungry, `false` otherwise.
   */
  public get isHungry(): boolean {
    return this._foodLevel < 85
  }

  /**
   * Indicates whether the animal is thirsty.
   *
   * @return `true` if thirsty, `false` otherwise.
   */
  public get isThirsty(): boolean {
    return this._hydrationLevel < 80
  }

  /**
   * Indicates whether the animal is an adult.
   *
   * @return `true` if adult, `false` otherwise.
   */
  public get isAdult(): boolean {
    return this._age >= 18
  }

  /**
   * Indicates whether the animal is currently being captured.
   *
   * @return `true` if being captured, `false` otherwise.
   */
  public get isBeingCaptured(): boolean {
    return this._isCaptured
  }

  /**
   * Gets the animal's draw data.
   *
   * @returns The draw data for the animal.
   */
  public get drawData(): SpriteDrawData {
    this._drawData.position = this.position
    this._drawData.isChipped = this._hasChip
    return this._drawData
  }

  /**
   * Creates an instance of Animal.
   *
   * @param x - The x grid position of the animal.
   * @param y - The y grid position of the animal.
   * @param group - The group ID of the animal.
   */
  constructor(x: number, y: number, group: number) {
    super(x, y)
    this._age = 0
    this._isCaptured = false
    this._foodLevel = 100
    this._hydrationLevel = 100
    this._group = group
    this._hasChip = false
    this._isWandering = false
    this._seenFoodPositions = new Set()
    this._seenWaterPositions = new Set()
    this._targetNeed = NeedStatus.None
  }

  public act = (dt: number) => {
    this.updateState()
    this._age += dt / 1440
    if (!this._isCaptured) {
      this.updateHungerAndThirst(dt)
    }

    if (this._foodLevel <= 0 || this._hydrationLevel <= 0) {
      animalDeadSignal.emit(this)
      return
    }

    if (this.isHungry || this.isThirsty) {
      updateVisiblesSignal.emit(this)
      this.updateMemory()
      this._restingTime = 0
    }

    if (!this.isResting(dt)) {
      this.decideAction(dt)
    }
  }

  /**
   * Updates the animal's memory of water positions.
   */
  protected updateWaterMemory = () => {
    const nearWaterPositions = new Set<string>()

    this._visibleTiles.forEach((tile) => {
      const key = tile.position.toString()

      if (tile.isWater) {
        this._seenWaterPositions.add(tile.position)
        nearWaterPositions.add(key)
      }
    })

    for (const pos of this._seenWaterPositions) {
      const key = pos.toString()
      const isNear = this._visibleTiles.some(tile => tile.position[0] === pos[0] && tile.position[1] === pos[1])
      if (!nearWaterPositions.has(key) && isNear) {
        this._seenWaterPositions.delete(pos)
      }
    }
  }

  /**
   * Decides the animal's action based on its needs and surroundings.
   * @param dt - The delta time since the last frame.
   */
  private decideAction = (dt: number) => {
    const bounds = this.computeBounds(this._visibleTiles)
    const target = this.chooseNeedTarget()

    if ((this.isHungry || this.isThirsty) && !this._isCaptured) {
      if (target) {
        this.pathTo = target
        this._isWandering = false
      }
      else if (!this._isWandering) {
        this.pathTo = this.chooseRandomTarget(bounds)
        this._isWandering = true
        this._targetNeed = NeedStatus.None
      }
      else {
        this._targetNeed = NeedStatus.None
      }
    }
    else if (!this.pathTo && !this._isCaptured) {
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
   * Handles the animal's arrival at its destination.
   */
  private handleArrival = () => {
    if (!this.pathTo)
      return

    this.velocity = [0, 0]
    this.pathTo = undefined
    this._isWandering = false
    this._targetNeed = NeedStatus.None

    if (this._isCaptured) {
      animalDeadSignal.emit(this)
      return
    }

    this._restingTime = 50 + Math.random() * 16

    const nearTiles = this.getNearTiles()

    nearTiles?.forEach((tile) => {
      if (tile.isWater) {
        this._hydrationLevel = 100
      }
    })

    this.fillFoodLevel(this._visibleTiles, this._visibleSprites)
  }

  /**
   * Gets the tiles near the animal's current position.
   * @returns The tiles near the animal's position, or `undefined` if none found.
   */
  protected getNearTiles = (): Tile[] | undefined => {
    return this._visibleTiles.filter(t => Math.abs(t.position[0] - this.position[0]) <= 0.5 && Math.abs(t.position[1] - this.position[1]) < 0.5)
  }

  /**
   * Chooses the target need for the animal based on its hunger and thirst levels.
   * @returns The position of the target need, or `undefined` if none found.
   */
  private chooseNeedTarget = () => {
    let needPosition

    if (this.isThirsty && this._targetNeed !== NeedStatus.Food) {
      this._targetNeed = NeedStatus.Drink
      needPosition = this.findClosest(this._seenWaterPositions)
    }
    if ((this.isHungry && this._targetNeed !== NeedStatus.Drink) || (this.isHungry && !needPosition)) {
      this._targetNeed = NeedStatus.Food
      needPosition = this.findClosest(this._seenFoodPositions)
    }
    return needPosition
  }

  /**
   * Chooses a random target position for the animal to wander to.
   * @param bounds - The bounds of the area to wander in.
   * @param bounds.minX - The minimum x coordinate of the area.
   * @param bounds.minY - The minimum y coordinate of the area.
   * @param bounds.maxX - The maximum x coordinate of the area.
   * @param bounds.maxY - The maximum y coordinate of the area.
   * @returns The position of the random target, or `undefined` if none found.
   */
  private chooseRandomTarget = (bounds: { minX: number, minY: number, maxX: number, maxY: number }): [number, number] | undefined => {
    const nonObstacleTiles = this._visibleTiles.filter(tile => !tile.isObstacle)

    if (nonObstacleTiles.length === 0) {
      return undefined
    }

    let pathTo: [number, number] | undefined
    const groupmates = this._visibleSprites.filter(
      sprite => sprite instanceof Animal && sprite.group === this.group,
    )

    if (groupmates.length === 0) {
      const randomTileIndex = Math.floor(Math.random() * nonObstacleTiles.length)
      const randomTile = nonObstacleTiles[randomTileIndex]
      pathTo = [
        Math.max(bounds.minX, Math.min(bounds.maxX, randomTile.position[0])),
        Math.max(bounds.minY, Math.min(bounds.maxY, randomTile.position[1])),
      ]
    }
    else {
      const sum = groupmates.reduce(
        (acc, mate) => {
          acc[0] += mate.position[0]
          acc[1] += mate.position[1]
          return acc
        },
        [0, 0],
      )
      const avg: [number, number] = [sum[0] / groupmates.length, sum[1] / groupmates.length]

      for (let attempts = 0; attempts < 10; attempts++) {
        const radius = 1 + Math.random() * 2.5
        const angle = Math.random() * 2 * Math.PI
        const offset: [number, number] = [
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
        ]

        const targetX = Math.max(bounds.minX, Math.min(bounds.maxX, avg[0] + offset[0]))
        const targetY = Math.max(bounds.minY, Math.min(bounds.maxY, avg[1] + offset[1]))

        const tileX = Math.floor(targetX)
        const tileY = Math.floor(targetY)

        const tileAtPosition = this._visibleTiles.find(tile =>
          Math.floor(tile.position[0]) === tileX
          && Math.floor(tile.position[1]) === tileY,
        )

        if (!tileAtPosition || !tileAtPosition.isObstacle) {
          pathTo = [targetX, targetY]
          break
        }
      }

      if (!pathTo) {
        const randomTileIndex = Math.floor(Math.random() * nonObstacleTiles.length)
        const randomTile = nonObstacleTiles[randomTileIndex]
        pathTo = [
          Math.max(bounds.minX, Math.min(bounds.maxX, randomTile.position[0])),
          Math.max(bounds.minY, Math.min(bounds.maxY, randomTile.position[1])),
        ]
      }
    }

    return pathTo
  }

  /**
   * Updates the animal's hunger and thirst levels based on its age and random factors.
   * @param dt - The delta time since the last frame.
   */
  private updateHungerAndThirst = (dt: number) => {
    const normalizedAge = Math.min(this._age / 30, 1)

    const hydrationMinDuration = 30
    const hydrationMaxDuration = 180

    const hydrationDuration = this.interpolateRange(
      hydrationMaxDuration,
      hydrationMinDuration,
      normalizedAge,
    )

    const hydrationRandomFactor = 0.85 + Math.random() * 0.3
    const hydrationFinalDuration = hydrationDuration * hydrationRandomFactor

    const hydrationDecayAmount = 3
    const hydrationRate = hydrationDecayAmount / hydrationFinalDuration

    this._hydrationLevel = Math.max(0, this._hydrationLevel - hydrationRate * dt)

    const foodMinDuration = 60
    const foodMaxDuration = 200

    const foodDuration = this.interpolateRange(
      foodMaxDuration,
      foodMinDuration,
      normalizedAge * 0.7,
    )

    const foodRandomFactor = 0.9 + Math.random() * 0.2
    const foodFinalDuration = foodDuration * foodRandomFactor

    const foodDecayAmount = 2
    const foodRate = foodDecayAmount / foodFinalDuration

    this._foodLevel = Math.max(0, this._foodLevel - foodRate * dt)
  }

  /**
   * Interpolates a value between two ranges based on a factor `t`.
   * @param from - The starting value.
   * @param to - The ending value.
   * @param t - The interpolation factor (0 to 1).
   * @returns The interpolated value.
   */
  private interpolateRange = (from: number, to: number, t: number): number => {
    return from + (to - from) * t
  }

  /**
   * Finds the closest position from a set of positions to the animal's current position.
   * @param positions - The set of positions to search.
   * @returns The closest position, or `undefined` if none found.
   */
  private findClosest = (positions: Set<[number, number]>): [number, number] | undefined => {
    let best
    let bestDist = Infinity
    positions.forEach((pos) => {
      const dx = pos[0] - this.position[0]
      const dy = pos[1] - this.position[1]
      const d = dx * dx + dy * dy
      if (d < bestDist) {
        bestDist = d
        best = pos
      }
    })
    return best
  }

  /**
   * Checks if the animal is currently resting.
   * @param dt - The delta time since the last frame.
   * @returns `true` if resting, `false` otherwise.
   */
  private isResting = (dt: number): boolean => {
    if (this._restingTime > 0) {
      this._restingTime = Math.max(0, this._restingTime - dt)
      return true
    }
    return false
  }

  public getShotBy = (_shooter: Shooter): boolean => {
    this.velocity = [0, 0]
    this.pathTo = undefined
    const chance = Math.random()
    if (chance < 0.8) {
      animalDeadSignal.emit(this)
      return true
    }
    return false
  }

  /**
   * Captures the animal, setting its state to captured and resetting its food and hydration levels.
   * @param pathTo - The target position to move to after capture.
   */
  public capture = (pathTo: [number, number]) => {
    this._isCaptured = true
    this._foodLevel = 100
    this._hydrationLevel = 100
    this._restingTime = 0
    this.pathTo = pathTo
  }

  /**
   * Updates the animal's memory of food positions.
   */
  protected abstract updateFoodMemory(): void

  /**
   * Fills the animal's food level based on its surroundings.
   * @param visibleTiles - The tiles currently visible to the animal.
   * @param visibleSprites - The sprites currently visible to the animal.
   */
  protected abstract fillFoodLevel(visibleTiles: Tile[], visibleSprites: Sprite[]): void

  /**
   * Updates the animal's memory of food and water positions.
   */
  protected abstract updateMemory(): void

  public abstract isEnganged(): boolean
}
