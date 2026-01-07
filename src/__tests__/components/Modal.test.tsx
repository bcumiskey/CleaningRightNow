import { render, screen, fireEvent } from '@testing-library/react'
import Modal from '@/components/ui/Modal'

describe('Modal Component', () => {
  const mockOnClose = jest.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
  })

  it('renders when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose}>
        Modal content
      </Modal>
    )
    expect(screen.getByText('Modal content')).toBeInTheDocument()
  })

  it('does not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={mockOnClose}>
        Modal content
      </Modal>
    )
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument()
  })

  it('renders with title', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Title">
        Content
      </Modal>
    )
    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })

  it('calls onClose when backdrop is clicked', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose}>
        Content
      </Modal>
    )
    // Click the backdrop (the div with bg-black/50)
    const backdrop = document.querySelector('.bg-black\\/50')
    if (backdrop) fireEvent.click(backdrop)
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when close button is clicked', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Title">
        Content
      </Modal>
    )
    // The close button is next to the title
    const closeButton = screen.getByRole('button')
    fireEvent.click(closeButton)
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Escape key is pressed', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose}>
        Content
      </Modal>
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('applies size classes correctly', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={mockOnClose} size="sm">
        Content
      </Modal>
    )
    expect(document.querySelector('.max-w-md')).toBeInTheDocument()

    rerender(
      <Modal isOpen={true} onClose={mockOnClose} size="lg">
        Content
      </Modal>
    )
    expect(document.querySelector('.max-w-2xl')).toBeInTheDocument()

    rerender(
      <Modal isOpen={true} onClose={mockOnClose} size="xl">
        Content
      </Modal>
    )
    expect(document.querySelector('.max-w-4xl')).toBeInTheDocument()
  })
})
