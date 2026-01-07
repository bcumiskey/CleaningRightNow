import { render, screen } from '@testing-library/react'
import Badge from '@/components/ui/Badge'

describe('Badge Component', () => {
  it('renders with children', () => {
    render(<Badge>Active</Badge>)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('applies default variant styling', () => {
    render(<Badge>Default</Badge>)
    expect(screen.getByText('Default')).toHaveClass('bg-gray-100', 'text-gray-700')
  })

  it('applies success variant styling', () => {
    render(<Badge variant="success">Success</Badge>)
    expect(screen.getByText('Success')).toHaveClass('bg-green-100', 'text-green-700')
  })

  it('applies warning variant styling', () => {
    render(<Badge variant="warning">Warning</Badge>)
    expect(screen.getByText('Warning')).toHaveClass('bg-amber-100', 'text-amber-700')
  })

  it('applies danger variant styling', () => {
    render(<Badge variant="danger">Danger</Badge>)
    expect(screen.getByText('Danger')).toHaveClass('bg-red-100', 'text-red-700')
  })

  it('applies info variant styling', () => {
    render(<Badge variant="info">Info</Badge>)
    expect(screen.getByText('Info')).toHaveClass('bg-blue-100', 'text-blue-700')
  })

  it('applies purple variant styling', () => {
    render(<Badge variant="purple">Purple</Badge>)
    expect(screen.getByText('Purple')).toHaveClass('bg-purple-100', 'text-purple-700')
  })

  it('applies custom className', () => {
    render(<Badge className="custom-class">Custom</Badge>)
    expect(screen.getByText('Custom')).toHaveClass('custom-class')
  })

  it('renders as a span element', () => {
    render(<Badge>Span</Badge>)
    expect(screen.getByText('Span').tagName).toBe('SPAN')
  })
})
