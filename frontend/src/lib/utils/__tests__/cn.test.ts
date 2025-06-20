import { cn } from '../cn'

describe('cn utility', () => {
  it('should combine class names correctly', () => {
    const result = cn('class1', 'class2')
    expect(result).toContain('class1')
    expect(result).toContain('class2')
  })

  it('should handle conditional classes', () => {
    const result = cn('base', true && 'conditional', false && 'hidden')
    expect(result).toContain('base')
    expect(result).toContain('conditional')
    expect(result).not.toContain('hidden')
  })

  it('should handle undefined values', () => {
    const result = cn('base', undefined, null, 'other')
    expect(result).toContain('base')
    expect(result).toContain('other')
  })
})