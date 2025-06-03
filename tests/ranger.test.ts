import { vol } from 'memfs'
import { beforeEach, expect, it, vi } from 'vitest'
import Map from '@/map'
import SafariModel from '@/safariModel'
import Lion from '@/sprites/lion'
import Poacher from '@/sprites/poacher'
import Ranger from '@/sprites/ranger'
import { updateVisiblesSignal } from '@/utils/signal'
import mockFetch from './mocks/fetch'

vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  vol.reset()

  vol.fromJSON({
    '/data/poacher.json': JSON.stringify({
      buyPrice: 100,
      viewDistance: 10,
      speed: 10,
      size: 1,
    }),
    '/data/ranger.json': JSON.stringify({
      buyPrice: 100,
      viewDistance: 10,
      speed: 10,
      size: 1,
    }),
    '/data/lion.json': JSON.stringify({
      buyPrice: 100,
      viewDistance: 5,
      speed: 10,
      size: 1,
    }),
  })
})

it('should shot the poacher when he is close', async () => {
  // Arrange
  const map = new Map(10, 10)
  await map.loadMap(0)
  const poacher = new Poacher(0, 0, [1, 1])
  await poacher.load()
  const ranger = new Ranger(1, 1)
  await ranger.load()
  map.addSprite(ranger)
  map.addSprite(poacher)
  updateVisiblesSignal.emit(ranger, true)
  updateVisiblesSignal.emit(poacher, true)

  ;(ranger as any)._bulletTimer = 0
  ;(poacher as any)._bulletTimer = 0

  const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.6)

  // Act
  ranger.act(0)

  mathRandomSpy.mockRestore()

  // Assert
  expect((poacher as any)._shootingAt).toBe(ranger)
})

it('should set pathTo to the chased carnivore', async () => {
  // Arrange
  const map = new Map(10, 10)
  await map.loadMap(0)
  const ranger = new Ranger(1, 1)
  await ranger.load()
  const lion = new Lion(5, 8, 0)
  await lion.load()
  map.addSprite(ranger)
  map.addSprite(lion)
  updateVisiblesSignal.emit(ranger, true)
  updateVisiblesSignal.emit(lion, true)

  ;(ranger as any)._chasing = lion

  // Act
  ranger.act(0)

  // Assert
  expect(ranger.pathTo).toEqual(lion.position)
})

it('should shot the chased animal when it is close', async () => {
  // Arrange
  const model = new SafariModel()
  await model.loadGame()

  const map = new Map(10, 10)
  await map.loadMap(0)

  const ranger = new Ranger(1, 1)
  await ranger.load()
  const lion = new Lion(1, 2, 0)
  await lion.load()
  map.addSprite(ranger)
  map.addSprite(lion)
  updateVisiblesSignal.emit(ranger, true)
  updateVisiblesSignal.emit(lion, true)

  ;(ranger as any)._bulletTimer = 0
  ;(ranger as any)._chasing = lion

  const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.4)

  // Act
  ranger.act(0)

  mathRandomSpy.mockRestore()

  // Assert
  expect((map as any)._sprites).not.toContain(lion)
  expect(model.balance).toEqual(10000 + lion.sellPrice * (0.8 + 0.4 * 0.7))
})

it('should set pathTo to the chased poacher', async () => {
  // Arrange
  const map = new Map(10, 10)
  await map.loadMap(0)
  const ranger = new Ranger(1, 1)
  await ranger.load()
  const poacher = new Poacher(5, 8, [0, 0])
  await poacher.load()
  map.addSprite(ranger)
  map.addSprite(poacher)
  updateVisiblesSignal.emit(ranger, true)
  updateVisiblesSignal.emit(poacher, true)

  ;(ranger as any)._chasing = poacher

  // Act
  ranger.act(0)

  // Assert
  expect(ranger.pathTo).toEqual(poacher.position)
})

it('should shot the chased poacher when it is close', async () => {
  // Arrange
  const map = new Map(10, 10)
  await map.loadMap(0)
  const ranger = new Ranger(1, 1)
  await ranger.load()
  const poacher = new Poacher(1, 2, [0, 0])
  await poacher.load()
  map.addSprite(ranger)
  map.addSprite(poacher)
  updateVisiblesSignal.emit(ranger, true)
  updateVisiblesSignal.emit(poacher, true)

  ;(ranger as any)._bulletTimer = 0
  ;(ranger as any)._chasing = poacher

  const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.4)

  // Act
  ranger.act(0)

  mathRandomSpy.mockRestore()

  // Assert
  expect((map as any)._sprites).not.toContain(poacher)
})
