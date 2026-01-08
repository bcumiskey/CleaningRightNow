import { render, screen } from '@testing-library/react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card'

describe('Card Components', () => {
  it('renders Card with children', () => {
    render(<Card>Card content</Card>)
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('applies custom className to Card', () => {
    render(<Card className="custom-class" data-testid="card">Content</Card>)
    expect(screen.getByTestId('card')).toHaveClass('custom-class')
  })

  it('renders CardHeader with children', () => {
    render(<CardHeader>Header content</CardHeader>)
    expect(screen.getByText('Header content')).toBeInTheDocument()
  })

  it('renders CardTitle with correct styling', () => {
    render(<CardTitle>Title text</CardTitle>)
    const title = screen.getByText('Title text')
    expect(title).toBeInTheDocument()
    expect(title.tagName).toBe('H3')
  })

  it('renders CardContent with children', () => {
    render(<CardContent>Body content</CardContent>)
    expect(screen.getByText('Body content')).toBeInTheDocument()
  })

  it('renders CardFooter with children', () => {
    render(<CardFooter>Footer content</CardFooter>)
    expect(screen.getByText('Footer content')).toBeInTheDocument()
  })

  it('renders complete Card structure', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Card</CardTitle>
        </CardHeader>
        <CardContent>This is the content</CardContent>
        <CardFooter>Footer actions</CardFooter>
      </Card>
    )

    expect(screen.getByText('Test Card')).toBeInTheDocument()
    expect(screen.getByText('This is the content')).toBeInTheDocument()
    expect(screen.getByText('Footer actions')).toBeInTheDocument()
  })
})
