import { loadJson } from '@/utils/load'

/**
 * Abstract class representing draw data.
 */
export default abstract class DrawData {
  private readonly _id: string
  private readonly _position: [x: number, y: number]
  private _jsonData!: DrawDataJson

  /**
   * Creates an instance of DrawData.
   *
   * @param id - The ID of the drawable object, which is used to load the correct JSON file.
   * @param x - The x position of the drawable object.
   * @param y - The y position of the drawable object.
   */
  constructor(id: string, x: number, y: number) {
    this._id = id
    this._position = [x, y]
  }

  /**
   * Loads the JSON data for the drawable object.
   *
   * @returns A promise that resolves when the JSON data has been loaded.
   */
  public loadJsonData = async (): Promise<void> => {
    const fileName = this._id.split(':')[1]
    const jsonData = await loadJson(`resources/${fileName}`)
    this._jsonData = jsonData
  }

  /**
   * Gets the ID of the drawable object.
   *
   * @returns The ID of the drawable object.
   */
  public get id(): string {
    return this._id
  }

  /**
   * Gets the position of the drawable object.
   *
   * @returns A tuple containing the x and y position of the drawable object.
   */
  public get position(): [x: number, y: number] {
    return this._position
  }

  /**
   * Sets the position of the drawable object.
   *
   * @param value - A tuple containing the new x and y position of the drawable object.
   */
  public set position(value: [x: number, y: number]) {
    this.position[0] = value[0]
    this.position[1] = value[1]
  }

  /**
   * Gets the texture image path of the sprite object.
   *
   * @returns The path to the texture image of the sprite object.
   * @example "/src/resources/textures/texture.webp"
   */
  public get image(): string {
    return `/resources/textures/${this._jsonData.texture}`
  }

  /**
   * Gets the z-index of the drawable object.
   *
   * @returns The z-index of the drawable object.
   */
  public get zIndex(): number {
    return this._jsonData.zIndex
  }

  /**
   * Gets the scale of the drawable object.
   *
   * @returns The scale of the drawable object.
   */
  protected get scale(): number {
    return this._jsonData.scale
  }

  /**
   * Gets the size of the drawable object in pixels.
   *
   * @param unit - The unit size from the view model.
   * @returns The size of the drawable object in pixels.
   */
  public getSize = (unit: number): number => {
    return this._jsonData.scale * unit
  }

  /**
   * Gets the screen position of the drawable object.
   *
   * @param unit - The unit size from the view model.
   * @returns A tuple containing the x and y screen position of the drawable object.
   */
  public abstract getScreenPosition(unit: number): [x: number, y: number]
}
