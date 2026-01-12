'use client'

import { ReactNode, useEffect, useState, useRef, useCallback } from 'react'
import { X, GripHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  draggable?: boolean
}

export default function Modal({ isOpen, onClose, title, children, size = 'md', draggable = false }: ModalProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const positionRef = useRef({ x: 0, y: 0 })

  // Reset position when modal opens
  useEffect(() => {
    if (isOpen) {
      setPosition({ x: 0, y: 0 })
      positionRef.current = { x: 0, y: 0 }
    }
  }, [isOpen])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!draggable) return
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX - positionRef.current.x, y: e.clientY - positionRef.current.y }
  }, [draggable])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    const newX = e.clientX - dragStartRef.current.x
    const newY = e.clientY - dragStartRef.current.y
    positionRef.current = { x: newX, y: newY }
    setPosition({ x: newX, y: newY })
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />
        <div
          className={cn(
            'relative bg-white rounded-xl shadow-xl w-full max-h-[90vh] overflow-y-auto',
            sizes[size],
            isDragging && 'select-none'
          )}
          style={draggable ? { transform: `translate(${position.x}px, ${position.y}px)` } : undefined}
        >
          {title && (
            <div
              className={cn(
                'flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 sticky top-0 bg-white z-10',
                draggable && 'cursor-grab active:cursor-grabbing'
              )}
              onMouseDown={handleMouseDown}
            >
              {draggable && (
                <GripHorizontal className="w-4 h-4 text-gray-300 mr-2 flex-shrink-0" />
              )}
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex-grow">{title}</h2>
              <button
                onClick={onClose}
                className="p-2 -mr-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
          <div className="p-4 sm:p-6">{children}</div>
        </div>
      </div>
    </div>
  )
}
