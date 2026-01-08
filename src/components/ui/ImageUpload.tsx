'use client'

import { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import Button from './Button'
import toast from 'react-hot-toast'

interface ImageUploadProps {
  value?: string
  onChange: (url: string) => void
  onRemove?: () => void
  folder?: string
  label?: string
  className?: string
  previewSize?: 'sm' | 'md' | 'lg'
}

export default function ImageUpload({
  value,
  onChange,
  onRemove,
  folder = 'uploads',
  label = 'Upload Image',
  className = '',
  previewSize = 'md',
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const sizeClasses = {
    sm: 'h-24 w-24',
    md: 'h-40 w-40',
    lg: 'h-60 w-60',
  }

  const handleFileSelect = async (file: File) => {
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a JPEG, PNG, GIF, or WebP image')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', folder)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const data = await response.json()
      onChange(data.url)
      toast.success('Image uploaded successfully')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleRemove = async () => {
    if (value && onRemove) {
      onRemove()
    }
  }

  if (value) {
    return (
      <div className={`relative inline-block ${className}`}>
        <div className={`${sizeClasses[previewSize]} rounded-lg overflow-hidden border border-gray-200`}>
          <img
            src={value}
            alt="Uploaded"
            className="w-full h-full object-cover"
          />
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleInputChange}
        className="hidden"
      />

      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          ${sizeClasses[previewSize]}
          border-2 border-dashed rounded-lg
          flex flex-col items-center justify-center gap-2
          cursor-pointer transition-colors
          ${dragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          }
          ${isUploading ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        {isUploading ? (
          <>
            <Loader2 size={24} className="text-gray-400 animate-spin" />
            <span className="text-xs text-gray-500">Uploading...</span>
          </>
        ) : (
          <>
            <ImageIcon size={24} className="text-gray-400" />
            <span className="text-xs text-gray-500 text-center px-2">{label}</span>
          </>
        )}
      </div>
    </div>
  )
}
