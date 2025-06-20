import { render, screen } from '@testing-library/react'
import { OverviewCard } from '../OverviewCard'
import { CheckSquare } from 'lucide-react'

describe('OverviewCard', () => {
  const defaultProps = {
    title: 'Test Card',
    value: '42',
    change: '+5 from yesterday',
    icon: CheckSquare,
    trend: 'up' as const,
  }

  it('renders correctly with all props', () => {
    render(<OverviewCard {...defaultProps} />)
    
    expect(screen.getByText('Test Card')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('+5 from yesterday')).toBeInTheDocument()
  })

  it('renders with different trends', () => {
    const { rerender } = render(<OverviewCard {...defaultProps} trend="up" />)
    expect(screen.getByText('+5 from yesterday')).toBeInTheDocument()

    rerender(<OverviewCard {...defaultProps} trend="down" />)
    expect(screen.getByText('+5 from yesterday')).toBeInTheDocument()

    rerender(<OverviewCard {...defaultProps} trend="neutral" />)
    expect(screen.getByText('+5 from yesterday')).toBeInTheDocument()
  })

  it('applies correct styling classes', () => {
    render(<OverviewCard {...defaultProps} />)
    
    const cardElement = screen.getByText('Test Card').closest('[class*="glass"]')
    expect(cardElement).toBeInTheDocument()
  })

  it('handles empty change text', () => {
    render(<OverviewCard {...defaultProps} change="" />)
    
    expect(screen.getByText('Test Card')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    // Should still render the container but with empty change text
    expect(screen.queryByText('+5 from yesterday')).not.toBeInTheDocument()
  })

  it('renders icon correctly', () => {
    render(<OverviewCard {...defaultProps} />)
    
    // The icon should be rendered as an SVG
    const iconElement = screen.getByRole('img', { hidden: true })
    expect(iconElement).toBeInTheDocument()
  })
})