import type DrawData from '@/drawData'
import type Goal from '@/goals/goal'
import Normal from '@/goals/normal'
import Map from '@/map'
import Animal from '@/sprites/animal'
import Carnivore from '@/sprites/carnivore'
import Herbivore from '@/sprites/herbivore'
import Jeep from '@/sprites/jeep'
import Poacher from '@/sprites/poacher'
import Ranger from '@/sprites/ranger'
import Sprite from '@/sprites/sprite'
import Entrance from '@/tiles/entrance'
import Exit from '@/tiles/exit'
import Road from '@/tiles/road'
import {
  createCarnivore,
  createGoal,
  createHerbivore,
  createTile,
} from '@/utils/registry'
import {
  bountySignal,
  goalMetSignal,
  losingSignal,
  tourRatingsSignal,
  tourStartSignal,
} from '@/utils/signal'
import Visitor from '@/visitor'

/**
 * Overarching model class for managing the game state and logic.
 */
export default class SafariModel {
  private readonly _map: Map
  private readonly _goal: Goal
  private _rating: number
  private _speed: number
  private _balance: number
  private _entryFee: number
  private _isOpen: boolean
  private _time: number
  private _timer: number
  private _daysGoalMet: number
  private _lastGoalCheckDay: number
  private _selectedRanger?: Ranger

  /**
   * Gets the goal of the game.
   *
   * @returns The goal object.
   */
  public get goal(): Goal {
    return this._goal
  }

  /**
   * Gets the width of the map.
   *
   * @returns The width of the map.
   */
  public get width(): number {
    return this._map.width
  }

  /**
   * Gets the height of the map.
   *
   * @returns The height of the map.
   */
  public get height(): number {
    return this._map.height
  }

  /**
   * Gets the number of herbivores on the map.
   *
   * @returns The number of herbivores on the map.
   */
  public get herbivoreCount(): number {
    return this._map.getHerbivoreCount()
  }

  /**
   * Gets the number of carnivores on the map.
   *
   * @returns The number of carnivores on the map.
   */
  public get carnivoreCount(): number {
    return this._map.getCarnivoreCount()
  }

  /**
   * Gets the current rating of the safari.
   *
   * @returns The current rating of the safari.
   */
  public get rating(): number {
    return this._rating
  }

  /**
   * Gets the balance of the player.
   *
   * @returns The current balance of the player.
   */
  public get balance(): number {
    return this._balance
  }

  /**
   * Gets the speed of the game
   *
   * @returns The speed value
   */
  public get speed(): number {
    return this._speed
  }

  /**
   * Sets the speed of the game.
   *
   * @param value - The new speed value.
   */
  public set speed(value: number) {
    this._speed = value
  }

  /**
   * Gets the entry fee for the game.
   *
   * @returns The entry fee value.
   */
  public get entryFee(): number {
    return this._entryFee
  }

  /**
   * Sets the entry fee for the game.
   *
   * @param value - The new entry fee value.
   */
  public set entryFee(value: number) {
    this._entryFee = value
  }

  /**
   * Gets whether the safari is open.
   *
   * @returns True if the safari is open, false otherwise.
   */
  public get isOpen(): boolean {
    return this._isOpen
  }

  /**
   * Opens or closes the safari.
   *
   * @param value - The new open status.
   */
  public set isOpen(value: boolean) {
    if (value === true && !this._map.planRoads())
      return
    this._isOpen = value
  }

  /**
   * Gets the current "time" in the game.
   *
   * @returns The time in number format.
   */
  public get time(): number {
    return this._time
  }

  /**
   * Gets whether it is night in the game.
   *
   * @returns True if it is night, false otherwise.
   */
  public get isNight(): boolean {
    return this._time % 1440 > 720 && this._time % 1440 <= 1440
  }

  /**
   * Gets the number of days passed in the game.
   *
   * @returns The number of days passed.
   */
  public get daysPassed(): number {
    return Math.floor(this._time / 1440)
  }

  /**
   * Gets the number of days when goals were met.
   *
   * @returns The number of days when goals were met.
   */
  public get daysGoalMet(): number {
    return this._daysGoalMet
  }

  /**
   * Gets the number of waiting jeeps.
   *
   * @returns The number of waiting jeeps.
   */
  public get waitingJeepCount() {
    return this._map.waitingJeepCount
  }

  /**
   * Creates an instance of the SafariModel class.
   */
  constructor(difficulty: string = 'safari:difficulty/normal') {
    this._map = new Map(48, 27)
    this._goal = createGoal(difficulty) ?? new Normal()
    this._rating = 3
    this._balance = 10000
    this._speed = 1
    this._entryFee = 1000
    this._isOpen = false
    this._timer = 0
    this._time = 0
    this._daysGoalMet = 0
    this._lastGoalCheckDay = -1

    tourStartSignal.connect(() => {
      this._balance += this._entryFee * 4
    })

    tourRatingsSignal.connect((ratings: number[]) => {
      const averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      this._rating = Math.round((this._rating + averageRating) / 2)
    })

    bountySignal.connect((bounty: number) => {
      this._balance += bounty
    })
  }

  /**
   * Loads the game.
   *
   * @param animals - The number of animals to load.
   * @param tiles - The number of tiles to load.
   *
   * @returns A promise that resolves when the game is loaded.
   */
  public loadGame = async (animals: number = 5, tiles: number = 10): Promise<void> => {
    await this._goal?.loadData()
    await this._map.loadMap(animals, tiles)
  }

  /**
   * Updates the game state by one tick.
   *
   * @param dt - The time delta since the last update.
   */
  public tick = (dt: number) => {
    const n = this._speed === 168 ? 7 : 1
    const speed = this._speed === 1 ? 1 : 24
    const ndt = dt * speed
    for (let i = 0; i < n; i++) {
      this._map.tick(ndt, this._isOpen)
      this._time += ndt
      this._timer += ndt
      if (this._timer >= 1) {
        this._timer = 0
        if (Math.random() < 0.01) {
          const visitor = new Visitor()
          if (visitor.willVisit(this._entryFee, this._rating)) {
            this._map.queueVisitor(visitor)
          }
        }
        this._map.spawnGroupOffspring()
      }
      this.checkGoalsMet()
      this.checkLosing()
    }
  }

  public checkLosing = () => {
    if (this._balance <= 0 && this._map.getHerbivoreCount() + this._map.getCarnivoreCount() === 0) {
      this._balance = 0
      losingSignal.emit()
    }
  }

  /**
   * Checks if a day has passed and if all goals are met.
   * Emits the goalMetSignal if conditions are satisfied.
   */
  public checkGoalsMet = () => {
    const currentDay = Math.floor(this._time / 1440)
    if (this._time >= 1440 && this._lastGoalCheckDay !== currentDay) {
      const totalSalary = this._map.getRangerSalary()
      this._balance = Math.max(this._balance - totalSalary, 0)

      if (
        this.balance >= this.goal.balance
        && this._map.getHerbivoreCount() >= this.goal.herbivores
        && this._map.getCarnivoreCount() >= this.goal.carnivores
        && this._map.totalVisitorCount >= this.goal.visitors
      ) {
        this._daysGoalMet++
        if (this._daysGoalMet >= this.goal.forDays) {
          goalMetSignal.emit()
        }
      }
      else {
        this._daysGoalMet = 0
      }
      this._lastGoalCheckDay = currentDay
    }
  }

  /**
   * Gets the draw data for all the tiles on the map.
   *
   * @returns An array of draw data for all the tiles on the map.
   */
  public getAllDrawData = (): DrawData[] => {
    return this._map.getAllDrawData(this.isNight)
  }

  /**
   * Places a tile on the map at the specified coordinates.
   *
   * WIP: Implementation for updating the balance of the player and checking if the tile can be placed.
   *
   * @param tileId - The ID of the tile to be placed.
   * @param x - The x grid position where the tile should be placed.
   * @param y - The y grid position where the tile should be placed.
   * @returns A promise that resolves when the tile is placed.
   */
  public buyTile = async (
    tileId: string,
    x: number,
    y: number,
  ): Promise<void> => {
    const tile = createTile(tileId, x, y)
    if (!tile || tile instanceof Entrance || tile instanceof Exit)
      return
    if (tile instanceof Road && this._isOpen)
      return

    const oldTile = this._map.getTileAt(x, y)
    await tile.load()
    if (oldTile instanceof Entrance || oldTile instanceof Exit)
      return
    if (oldTile instanceof Road && this._isOpen)
      return

    if (oldTile.toString() !== tile.toString() && this.buy(tile)) {
      this._map.placeTile(tile)
    }
  }

  /**
   * Buys a carnivore on the map at the specified coordinates.
   *
   * @param id - The ID of the carnivore to be bought.
   * @param x - The x grid position where the carnivore should be placed.
   * @param y - The y grid position where the carnivore should be placed.
   * @returns A promise that resolves when the carnivore is placed.
   */
  public buyCarnivore = async (
    id: string,
    x: number,
    y: number,
  ): Promise<void> => {
    const animal = createCarnivore(id, x, y)
    if (!animal)
      return
    await animal.load()

    if (this.buy(animal)) {
      const visibleSprites = this._map.getVisibleSprites(animal)
      const sameIdSprite = visibleSprites.find(s => s instanceof Animal && s.toString() === animal.toString()) as Animal | undefined

      let groupID: number
      if (sameIdSprite) {
        groupID = sameIdSprite.group
      }
      else {
        do {
          groupID = Math.floor(Math.random() * 1000000)
        } while (this._map.groups.some(groupObj => groupID in groupObj))
      }
      animal.group = groupID
      this._map.addGroup(groupID, id)

      this._map.addSprite(animal)
    }
  }

  /**
   * Buys a herbivore on the map at the specified coordinates.
   * @param id - The ID of the herbivore to be bought.
   * @param x - The x grid position where the herbivore should be placed.
   * @param y - The y grid position where the herbivore should be placed.
   * @returns A promise that resolves when the herbivore is placed.
   */
  public buyHerbivore = async (
    id: string,
    x: number,
    y: number,
  ): Promise<void> => {
    const animal = createHerbivore(id, x, y)
    if (!animal)
      return
    await animal.load()

    if (this.buy(animal)) {
      const visibleSprites = this._map.getVisibleSprites(animal)
      const sameIdSprite = visibleSprites.find(s => s instanceof Animal && s.toString() === animal.toString()) as Animal | undefined

      let groupID: number
      if (sameIdSprite) {
        groupID = sameIdSprite.group
      }
      else {
        do {
          groupID = Math.floor(Math.random() * 1000000)
        } while (this._map.groups.some(groupObj => groupID in groupObj))
      }
      animal.group = groupID
      this._map.addGroup(groupID, id)

      this._map.addSprite(animal)
    }
  }

  /**
   * Buys a jeep and adds it to the map's jeep backlog.
   */
  public buyJeep = async () => {
    const jeep = new Jeep()
    await jeep.load()
    if (this.buy(jeep)) {
      this._map.addNewJeep(jeep)
    }
  }

  /**
   * Buys a ranger and adds it to the map at the specified coordinates.
   * @param x - The x grid position where the ranger should be placed.
   * @param y - The y grid position where the ranger should be placed.
   */
  public buyRanger = async (x: number, y: number) => {
    const ranger = new Ranger(x, y)
    await ranger.load()
    if (this.buy(ranger)) {
      this._map.addSprite(ranger)
    }
  }

  /**
   * Sells an animal at the specified coordinates on the map.
   *
   * @param x The x coordinate.
   * @param y The y coordinate.
   */
  public sellAnimalAt = (x: number, y: number) => {
    const sprites = this._map.getSpritesAt(x, y)
    if (sprites.length === 0)
      return
    const animal = this.getTopAnimal(sprites)
    if (!animal)
      return

    this.sell(animal)
    this._map.removeSprite(animal)
  }

  /**
   * Chips an animal at the specified coordinates on the map.
   */
  public chipAnimalAt = (x: number, y: number) => {
    const animal = this.getTopAnimal(this._map.getSpritesAt(x, y))
    if (
      !animal
      || animal.chipPrice > this._balance
      || animal.hasChip
    ) {
      return
    }

    this._balance -= animal.chipPrice
    animal.hasChip = true
  }

  /**
   * Gets the top animal from the list of sprites.
   *
   * @param sprites - The list of sprites to check.
   * @returns The top animal if found, otherwise null.
   */
  private getTopAnimal = (sprites: Sprite[]): Animal | null => {
    if (sprites.length === 0)
      return null
    return sprites.filter(s => s instanceof Animal)[sprites.length - 1]
  }

  /**
   * This method updates the balance for buying the specified item.
   *
   * @param item - The item to be bought.
   * @returns True if the item was successfully bought, false otherwise.
   */
  private buy = (item: Buyable): boolean => {
    if (item.buyPrice > this._balance)
      return false

    this._balance -= item.buyPrice
    return true
  }

  /**
   * This method updates the balance for selling the specified item.
   *
   * @param item - The item to be sold.
   */
  private sell = (item: Sellable) => {
    this._balance += item.sellPrice
  }

  /**
   * Selects a sprite at the given coordinates.
   * @param x - The x coordinate.
   * @param y - The y coordinate.
   */
  public selectSpriteAt = (x: number, y: number) => {
    Sprite.deselectAll(this._map)
    const sprites = this._map.getSpritesAt(x, y)
    if (sprites.length === 0) {
      this._selectedRanger = undefined
      return
    }

    const topSprite = sprites[sprites.length - 1]
    if (topSprite instanceof Ranger) {
      topSprite.select()
      this._selectedRanger = topSprite
    }
    if (this._selectedRanger) {
      if (topSprite instanceof Carnivore) {
        this._selectedRanger.chasing = topSprite
        this._selectedRanger = undefined
      }
      else if (topSprite instanceof Poacher) {
        this._selectedRanger.chasing = topSprite
        this._selectedRanger = undefined
      }
      else if (topSprite instanceof Herbivore) {
        this._selectedRanger = undefined
      }
    }
  }
}
