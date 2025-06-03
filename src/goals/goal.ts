import { loadJson } from '@/utils/load'

/**
 * Abstract class representing a goal in the game.
 */
export default abstract class Goal {
  private _balance: number
  private _herbivores: number
  private _carnivores: number
  private _visitors: number
  private _forDays: number

  /**
   * Gets the balance condition required for the goal.
   *
   * @returns The minimum required balance.
   */
  public get balance(): number {
    return this._balance
  }

  /**
   * Gets the required number of herbivores for the goal.
   *
   * @returns The required herbivore count.
   */
  public get herbivores(): number {
    return this._herbivores
  }

  /**
   * Gets the required number of carnivores for the goal.
   *
   * @returns The required carnivore count.
   */
  public get carnivores(): number {
    return this._carnivores
  }

  /**
   * Gets the required number of visitors for the goal.
   *
   * @returns The required visitor count.
   */
  public get visitors(): number {
    return this._visitors
  }

  /**
   * Gets the number of days the goal conditions must be met.
   *
   * @returns Duration in days.
   */
  public get forDays(): number {
    return this._forDays
  }

  constructor() {
    this._balance = 0
    this._herbivores = 0
    this._carnivores = 0
    this._visitors = 0
    this._forDays = 0
  }

  /**
   * Loads the goal data from a JSON file.
   *
   * @returns A promise that resolves when the data is loaded.
   */
  public loadData = async (): Promise<void> => {
    const fileName = this.toString().split(':')[1]
    const jsonData = await loadJson(`data/${fileName}`)
    this._balance = jsonData.balance
    this._herbivores = jsonData.herbivores
    this._carnivores = jsonData.carnivores
    this._visitors = jsonData.visitors
    this._forDays = jsonData.forDays
  }

  /**
   * Gets the ID of the goal.
   *
   * @returns A string representing the goal.
   */
  public abstract toString(): string
}
