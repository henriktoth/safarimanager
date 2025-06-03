import { vol } from 'memfs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SafariModel from '@/safariModel'
import Jeep from '@/sprites/jeep'
import { clearJsonCache } from '@/utils/load'
import { tourRatingsSignal, tourStartSignal } from '@/utils/signal'
import mockFetch from './mocks/fetch'
import '@/goals'

vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  vol.reset()
  vi.resetModules()
  clearJsonCache()
})

describe('check valid returns', () => {
  it('should return a valid width and height', async () => {
  // Arrange
    const model = new SafariModel()

    // Act
    await model.loadGame()
    const width = model.width
    const height = model.height

    // Assert
    expect(width).not.toBeNull()
    expect(height).not.toBeNull()
  })

  it('should return valid draw data', async () => {
  // Arrange
    const model = new SafariModel()

    // Act
    await model.loadGame()
    const drawDatas = model.getAllDrawData()

    // Assert
    expect(drawDatas).not.toBeNull()
  })

  it.for([
    'safari:difficulty/easy',
    'safari:difficulty/normal',
    'safari:difficulty/hard',
  ])('should load the game with the right goal (goal = %s)', async (difficulty) => {
    // Arrange
    const model = new SafariModel(difficulty)

    // Act
    const goal = model.goal?.toString()

    // Assert
    expect(goal).toEqual(difficulty)
  })

  it('should load the correct goal datas', async () => {
  // Arrange
    const file = 'data/difficulty/easy'
    vol.fromJSON({
      [`/${file}.json`]: JSON.stringify({
        balance: 1,
        herbivores: 10,
        carnivores: 5,
        visitors: 50,
        forDays: 2,
      }),
    })
    const model = new SafariModel('safari:difficulty/easy')

    // Act
    await model.loadGame()

    // Assert
    expect(model.goal?.balance).toEqual(1)
    expect(model.goal?.herbivores).toEqual(10)
    expect(model.goal?.carnivores).toEqual(5)
    expect(model.goal?.visitors).toEqual(50)
    expect(model.goal?.forDays).toEqual(2)
  })

  it('should update time correctly when ticked', async () => {
    // Arrange
    const model = new SafariModel()

    // Act
    await model.loadGame()
    model.tick(1)

    // Assert
    expect(model.time).toBe(1)
  })

  it('should correctly identify day/night cycle', async () => {
    // Arrange
    const model = new SafariModel()

    // Act
    await model.loadGame()
    model.tick(720)

    // Assert
    expect(model.isNight).toBe(false)

    // Act
    model.tick(1)

    // Assert
    expect(model.isNight).toBe(true)
  })

  it('should update balance when buying items', async () => {
    // Arrange
    const model = new SafariModel()
    await model.loadGame()
    const initialBalance = model.balance
    const jeep = new Jeep()
    await jeep.load()

    // Act
    await model.buyJeep()

    // Assert
    expect(model.balance).toBe(initialBalance - jeep.buyPrice)
  })

  it('should update balance when tour starts', async () => {
    // Arrange
    const model = new SafariModel()
    await model.loadGame()
    const initialBalance = model.balance

    // Act
    tourStartSignal.emit()

    // Assert
    expect(model.balance).toBe(initialBalance + (model.entryFee * 4))
  })

  it('should update rating based on visitor ratings', async () => {
    // Arrange
    const model = new SafariModel()
    await model.loadGame()
    const initialRating = model.rating
    const newRatings = [4, 5]

    // Act
    tourRatingsSignal.emit(newRatings)

    // Assert
    expect(model.rating).not.toBe(initialRating)
  })

  it('should not open safari without valid roads', async () => {
    // Arrange
    const model = new SafariModel()
    await model.loadGame()

    // Act
    model.isOpen = true

    // Assert
    expect(model.isOpen).toBe(false)
  })
})
