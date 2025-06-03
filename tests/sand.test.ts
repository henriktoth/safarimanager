import { expect, it } from 'vitest'
import Sand from '@/tiles/sand'

it('should return the correct string representation for Sand', () => {
  // Arrange
  const sand = new Sand(0, 0)

  // Act
  const id = sand.toString()

  // Assert
  expect(id).toBe('safari:sand')
})
