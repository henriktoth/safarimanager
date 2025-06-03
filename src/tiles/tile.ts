import TileDrawData from '@/tileDrawData.js'
import { loadJson } from '@/utils/load'

/**
 * Abstract class representing a tile in the game.
 */
export default abstract class Tile implements Buyable {
  private static id: string

  private _position: [number, number]
  private _drawData: TileDrawData
  private _jsonData!: TileJson

  /**
   * Gets the x and y position of the tile.
   *
   * @returns A tuple containing the x and y position of the tile.
   */
  public get position(): [number, number] {
    return this._position
  }

  /**
   * Gets the draw data for the tile.
   *
   * @returns The draw data for the tile.
   */
  public get drawData(): TileDrawData {
    return this._drawData
  }

  /**
   * Gets the price of the tile the player has to pay to buy it.
   *
   * @returns The price of the tile.
   */
  public get buyPrice(): number {
    return this._jsonData.buyPrice
  }

  /**
   * Gets wether the tile is an obstacle or not.
   *
   * @returns a boolean deciding if the tile is an obstacle or not.
   */
  public get isObstacle(): boolean {
    return this._jsonData.isObstacle
  }

  /**
   * Gets wether the tile is edible or not.
   *
   * @returns a boolean deciding if the tile is edible or not.
   */
  public get isEdible(): boolean {
    return this._jsonData.isEdible
  }

  /**
   * Gets wheter the tile is a water tile or not.
   *
   * @returns a boolean deciding if the tile is a water tile or not.
   */
  public get isWater(): boolean {
    return this._jsonData.isWater
  }

  /**
   * Gets wether the tile is a visible at night or not.
   *
   * @returns a boolean deciding if the tile is visible at night or not.
   */
  public get isAlwaysVisible(): boolean {
    return this._jsonData.isAlwaysVisible
  }

  /**
   * Gets the tile's fallback tile when it is consumed.
   *
   * @returns the id of the fallback tile.
   */
  public get fallbackTile(): string {
    return this._jsonData.fallbackTile
  }

  /**
   * Creates an instance of Tile.
   *
   * @param x - The x grid position of the tile.
   * @param y - The y grid position of the tile.
   */
  constructor(x: number, y: number) {
    this._position = [x, y]
    this._drawData = new TileDrawData(this.toString(), ...this._position)
  }

  /**
   * Loads the draw data for the tile.
   *
   * @returns A promise that resolves to the loaded draw data for the tile.
   */
  private loadDrawData = async (): Promise<TileDrawData> => {
    await this._drawData.loadJsonData()
    return this._drawData
  }

  /**
   * Loads the JSON data for the tile object.
   *
   * @returns A promise that resolves when the JSON data has been loaded.
   */
  private loadJsonData = async (): Promise<void> => {
    const fileName = this.toString().split(':')[1]
    const jsonData = await loadJson(`data/${fileName}`)
    this._jsonData = jsonData
  }

  /**
   * Loads both draw data and JSON data for the tile.
   *
   * @returns A promise that resolves when all data is loaded.
   */
  public load = async (): Promise<void> => {
    await Promise.all([
      this.loadDrawData(),
      this.loadJsonData(),
    ])
  }

  /**
   * Gets the ID of the tile.
   *
   * @returns The ID of the tile.
   */
  public toString = (): string => {
    return (this.constructor as typeof Tile).id
  }
}
