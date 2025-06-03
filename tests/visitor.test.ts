import { expect, it, vi } from 'vitest'
import Visitor from '@/visitor'
import mockFetch from './mocks/fetch'

vi.stubGlobal('fetch', mockFetch)

it('should only visit if they find the safari appealing', () => {
  // Arrange
  const visitor1 = new Visitor()
  const visitor2 = new Visitor()
  const entryFee = 100
  const rating = 3
  ;(visitor1 as any).willingToPay = 50
  ;(visitor1 as any).wantsRating = 4
  ;(visitor2 as any).willingToPay = 150
  ;(visitor2 as any).wantsRating = 2

  // Act
  const willVisit1 = visitor1.willVisit(entryFee, rating)
  const willVisit2 = visitor2.willVisit(entryFee, rating)

  // Assert
  expect(willVisit1).toBe(false)
  expect(willVisit2).toBe(true)
})

it('should always have a rating between 1 and 5', () => {
  // Arrange
  const visitor = new Visitor()

  // Act
  const rating = visitor.rating

  // Assert
  expect(rating).toBeGreaterThanOrEqual(1)
  expect(rating).toBeLessThanOrEqual(5)
})

it('should give a rating of 1 if none of their requirements are met', () => {
  // Arrange
  const visitor = new Visitor()
  ;(visitor as any).wantsToSeeCarnivores = 100
  ;(visitor as any).wantsToSeeHerbivores = 100

  // Act
  const rating = visitor.rating

  // Assert
  expect(rating).toBe(1)
})

it('should give a rating of 5 if all their requirements are met', () => {
  // Arrange
  const visitor = new Visitor()
  ;(visitor as any).wantsToSeeCarnivores = 0
  ;(visitor as any).wantsToSeeHerbivores = 0

  // Act
  const rating = visitor.rating

  // Assert
  expect(rating).toBe(5)
})
