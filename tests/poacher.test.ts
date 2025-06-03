import { vol } from 'memfs'
import { beforeEach, expect, it, vi } from 'vitest'
import Map from '@/map'
import Poacher from '@/sprites/poacher'
import Ranger from '@/sprites/ranger'
import Zebra from '@/sprites/zebra'
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
    '/data/zebra.json': JSON.stringify({
      buyPrice: 100,
      viewDistance: 5,
      speed: 10,
      size: 1,
    }),
  })
})

it('should chase or shoot an animal when it is close', async () => {
  // Arrange
  const map = new Map(10, 10)
  await map.loadMap(0)
  const poacher = new Poacher(0, 0, [1, 1])
  await poacher.load()
  const zebra = new Zebra(1, 1, 0)
  await zebra.load()
  map.addSprite(zebra)
  map.addSprite(poacher)
  updateVisiblesSignal.emit(poacher, true)

  // Act
  poacher.act(0)

  // Assert
  const shootingAt = (poacher as any)._shootingAt
  const chasing = (poacher as any)._chasing
  expect([shootingAt, chasing]).toContain(zebra)
})

it('should rob an animal when it is chased', async () => {
  // Arrange
  const map = new Map(10, 10)
  await map.loadMap(0)
  const exit = [map.width - 1, map.height - 1] as [number, number]
  const poacher = new Poacher(0, 0, exit)
  await poacher.load()
  const zebra = new Zebra(0, 0, 0)
  await zebra.load()
  map.addSprite(zebra)
  map.addSprite(poacher)
  updateVisiblesSignal.emit(poacher, true)

  poacher.pathTo = zebra.position
  ;(poacher as any)._chasing = zebra

  // Act
  poacher.act(0)

  // Assert
  const robbing = (poacher as any)._robbing
  expect(robbing).toBe(zebra)
  expect(poacher.pathTo).toEqual(exit)
  expect(zebra.pathTo).toEqual(exit)
})

it('should shoot ranger when he is shooting at him', async () => {
  // Arrange
  const map = new Map(10, 10)
  await map.loadMap(0)
  const exit = [map.width - 1, map.height - 1] as [number, number]
  const poacher = new Poacher(0, 0, exit)
  await poacher.load()
  const ranger = new Ranger(1, 1)
  await ranger.load()
  map.addSprite(ranger)
  map.addSprite(poacher)
  updateVisiblesSignal.emit(poacher, true)
  updateVisiblesSignal.emit(ranger, true)

  ;(ranger as any)._bulletTimer = 0
  ;(poacher as any)._bulletTimer = 0

  const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.6)

  // Act
  ranger.act(0)
  poacher.act(0)

  mathRandomSpy.mockRestore()

  // Assert
  expect((poacher as any)._shootingAt).toBe(ranger)
})

it('should clears shootingAt when the poacher has shot the ranger', async () => {
  // Arrange
  const map = new Map(10, 10)
  await map.loadMap(0)
  const exit = [map.width - 1, map.height - 1] as [number, number]
  const poacher = new Poacher(0, 0, exit)
  await poacher.load()
  const ranger = new Ranger(1, 1)
  await ranger.load()
  map.addSprite(ranger)
  map.addSprite(poacher)
  updateVisiblesSignal.emit(poacher, true)
  updateVisiblesSignal.emit(ranger, true)

  ;(ranger as any)._bulletTimer = 0
  ;(poacher as any)._bulletTimer = 0

  // Act
  let mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.6)
  ranger.act(0)
  mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.4)
  poacher.act(0)

  mathRandomSpy.mockRestore()

  // Assert
  expect((poacher as any)._shootingAt).toBeUndefined()
})
