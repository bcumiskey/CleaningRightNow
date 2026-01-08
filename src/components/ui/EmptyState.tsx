import { LucideIcon } from 'lucide-react'
import Button from './Button'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <Icon className="mx-auto text-gray-300" size={48} />
      <h3 className="mt-4 font-semibold text-gray-900">{title}</h3>
      <p className="text-gray-500 mt-1">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
