import type DrawData from '@/drawData'
import type Map from '@/map'
import type Tile from '@/tiles/tile'
import SpriteDrawData from '@/spriteDrawData'
import { loadJson } from '@/utils/load'
import { updateVisiblesSignal } from '@/utils/signal'

/**
 * Abstract class representing a sprite in the game.
 */
export default abstract class Sprite {
  protected static id: string

  private _position: [number, number]
  private _pathTo?: [number, number]
  private _velocity: [number, number] = [0, 0]
  private _isDead: boolean = false
  private _isOnHill: boolean = false
  private _regNumber: number
  private static uuid: number = 0

  protected _drawData: SpriteDrawData
  protected _jsonData!: SpriteJson
  protected _visibleTiles: Tile[]
  protected _visibleSprites: Sprite[]
  protected _restingTime: number
  protected _lastTile?: Tile

  /**
   * Gets the current grid position of the sprite.
   *
   * @returns A tuple representing the `[x, y]` position.
   */
  public get position(): [number, number] {
    return this._position
  }

  /**
   * Sets the position of the sprite.
   *
   * @param value - A tuple `[x, y]` representing the new position.
   */
  public set position(value: [number, number]) {
    this._position = value
  }

  /**
   * Gets the size of the sprite.
   *
   * @returns the size of the sprite
   */
  public get size(): number {
    return this._jsonData.size
  }

  /**
   * Gets the path to which the sprite is moving.
   *
   * @returns A tuple representing the `[x, y]` position of the path, or `undefined` if not set.
   */
  public get pathTo(): [number, number] | undefined {
    return this._pathTo
  }

  /**
   * Sets the path to which the sprite is moving.
   *
   * @param value - A tuple `[x, y]` representing the new path position, or `undefined` if not set.
   */
  public set pathTo(value: [number, number] | undefined) {
    this._pathTo = value
  }

  /**
   * Gets the velocity vector of the sprite.
   *
   * @returns A tuple `[vx, vy]` representing velocity in x and y directions.
   */
  public get velocity(): [number, number] {
    return this._velocity
  }

  /**
   * Sets the velocity vector of the sprite.
   *
   * @param value - A tuple `[vx, vy]` representing velocity in x and y directions.
   */
  public set velocity(value: [number, number]) {
    this._velocity = value
  }

  /**
   * Gets the speed of the sprite
   *
   * @returns the speed of the sprite
   */
  public get speed(): number {
    return this._jsonData.speed
  }

  /**
   * Indicates whether the sprite is marked as dead.
   *
   * @returns `true` if dead, `false` otherwise.
   */
  public get isDead(): boolean {
    return this._isDead
  }

  /**
   * Gets the buy price of the sprite.
   *
   * @returns the price to buy the animal
   */
  public get buyPrice(): number {
    return this._jsonData.buyPrice
  }

  /**
   * Gets the view distance of the sprite.
   *
   * @returns the view distance in number format
   */
  public get viewDistance(): number {
    const baseViewDistance = this._jsonData.viewDistance
    return this._isOnHill ? baseViewDistance * 1.5 : baseViewDistance
  }

  /**
   * Gets the `SpriteDrawData` object containing drawing and rendering information.
   *
   * @returns The sprite's draw data.
   */
  public get drawData(): SpriteDrawData {
    this._drawData.position = this.position
    return this._drawData
  }

  /**
   * Selects the sprite by setting its drawData isSelected property to true.
   */
  public select(): void {
    this._drawData.isSelected = true
  }

  /**
   * Deselects the sprite by setting its drawData isSelected property to false.
   */
  public deselect(): void {
    this._drawData.isSelected = false
  }

  /**
   * Deselects all sprites in the game.
   * @param map - The game map containing all sprites.
   */
  public static deselectAll(map: Map): void {
    map.getAllDrawData(false).forEach((drawData: DrawData) => {
      if (drawData instanceof SpriteDrawData) {
        drawData.isSelected = false
      }
    })
  }

  /**
   * Gets the sprite's registration number.
   *
   * @return The registration number of the sprite.
   */
  public get regNumber(): number {
    return this._regNumber
  }

  /**
   * Creates an instance of Sprite.
   * @param x - The initial x position on the grid.
   * @param y - The initial y position on the grid.
   */
  constructor(x: number, y: number) {
    this._position = [x, y]
    this._drawData = new SpriteDrawData(this.toString(), ...this._position)
    this._visibleTiles = []
    this._visibleSprites = []
    this._restingTime = 0
    this._regNumber = Sprite.uuid++
  }

  /**
   * Updates the sprite's visibile tiles and sprites.
   *
   * @param visibleTiles The tiles that are visible to the sprite.
   * @param visibleSprites The sprites that are visible to the sprite.
   */
  public updateVisibles = (visibleTiles: Tile[], visibleSprites: Sprite[]) => {
    this._visibleTiles = visibleTiles
    this._visibleSprites = visibleSprites
  }

  /**
   * Moves the animal towards its target position.
   * @param dt - The delta time since the last frame.
   * @param minX - The minimum x coordinate of the area.
   * @param minY - The minimum y coordinate of the area.
   * @param maxX - The maximum x coordinate of the area.
   * @param maxY - The maximum y coordinate of the area.
   */
  protected move = (dt: number, minX: number, minY: number, maxX: number, maxY: number) => {
    if (!this.pathTo)
      return
    const dx = this.pathTo[0] - this.position[0]
    const dy = this.pathTo[1] - this.position[1]
    const dist = Math.sqrt(dx * dx + dy * dy)
    const speed = this.speed

    if (dist > 0) {
      this.velocity = [dx / dist * speed, dy / dist * speed]
      let moveX: number
      let moveY: number
      const currentTile = this._visibleTiles.find(
        (tile: Tile) =>
          Math.abs(tile.position[0] - this.position[0]) < 0.5
          && Math.abs(tile.position[1] - this.position[1]) < 0.5,
      )
      if (currentTile !== this._lastTile) {
        this._lastTile = currentTile
        updateVisiblesSignal.emit(this)
      }
      if (currentTile && currentTile.isObstacle) {
        moveX = this.velocity[0] * dt / 30
        moveY = this.velocity[1] * dt / 30
      }
      else {
        moveX = this.velocity[0] * dt / 10
        moveY = this.velocity[1] * dt / 10
      }

      if (Math.abs(moveX) >= Math.abs(dx) && Math.abs(moveY) >= Math.abs(dy)) {
        this.position[0] = this.pathTo[0]
        this.position[1] = this.pathTo[1]
      }
      else {
        const nextX = this.position[0] + moveX
        const nextY = this.position[1] + moveY
        this.position[0] = Math.max(minX, Math.min(maxX, nextX))
        this.position[1] = Math.max(minY, Math.min(maxY, nextY))
      }
    }
  }

  /**
   * Computes the bounds of a set of tiles.
   * @param tiles - The tiles to compute bounds for.
   * @returns The bounds of the tiles, including min and max x and y coordinates.
   */
  protected computeBounds = (tiles: Tile[]) => {
    const xs = tiles.map(t => t.position[0])
    const ys = tiles.map(t => t.position[1])
    return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) }
  }

  /**
   * Determines whether the animal has reached its destination.
   * @returns `true` if at destination, `false` otherwise.
   */
  protected isAtDestination = (threshold: number = 0.5): boolean | undefined => {
    return this.pathTo
      && Math.abs(this.position[0] - this.pathTo[0]) <= threshold
      && Math.abs(this.position[1] - this.pathTo[1]) <= threshold
  }

  /**
   * Called every game tick to determine the sprite's behavior.
   *
   * @param dt - Delta time since last update.
   */
  public abstract act: (dt: number) => void

  /**
   * Updates the sprite's state based on the tiles it can see.
   * This should be called at the start of the act method in derived classes.
   */
  protected updateState = () => {
    const [x, y] = this.position
    const tileX = Math.floor(x)
    const tileY = Math.floor(y)

    this._isOnHill = this._visibleTiles.some(tile =>
      tile.position[0] === tileX
      && tile.position[1] === tileY
      && tile.toString() === 'safari:hill',
    )
  }

  /**
   * Returns the grid cells occupied by the sprite.
   *
   * @returns An array of `[x, y]` tuples representing occupied grid cells.
   */
  public onCells = (): [number, number][] => {
    return [[0, 0]]
  }

  /**
   * Loads external JSON data into the sprite's draw data.
   *
   * @returns A promise that resolves with the loaded `SpriteDrawData`.
   */
  private loadDrawData = async (): Promise<SpriteDrawData> => {
    await this._drawData.loadJsonData()
    return this._drawData
  }

  /**
   * Loads the JSON data for the sprite.
   *
   * @returns A promise that resolves when the JSON data has been loaded.
   */
  private loadJsonData = async (): Promise<void> => {
    const fileName = this.toString().split(':')[1]
    const jsonData = await loadJson(`data/${fileName}`)
    this._jsonData = jsonData
  }

  /**
   * Loads the sprite's data, including draw data and JSON data.
   *
   * @returns A promise that resolves when all data has been loaded.
   */
  public load = async (): Promise<void> => {
    await Promise.all([
      this.loadDrawData(),
      this.loadJsonData(),
    ])
    updateVisiblesSignal.emit(this)
  }

  /**
   * Gets the ID of the sprite.
   *
   * @returns The ID of the sprite.
   */
  public toString = (): string => {
    return (this.constructor as typeof Sprite).id
  }
}
