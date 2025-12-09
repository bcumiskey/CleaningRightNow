import prisma from './prisma'

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE'

interface AuditLogParams {
  userId?: string
  action: AuditAction
  entityType: string
  entityId: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  description?: string
  ipAddress?: string
}

export async function createAuditLog({
  userId,
  action,
  entityType,
  entityId,
  oldValues,
  newValues,
  description,
  ipAddress
}: AuditLogParams) {
  return prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      oldValues: oldValues ? JSON.parse(JSON.stringify(oldValues)) : null,
      newValues: newValues ? JSON.parse(JSON.stringify(newValues)) : null,
      description,
      ipAddress
    }
  })
}

export function generateDescription(
  action: AuditAction,
  entityType: string,
  details?: string
): string {
  const actionText = {
    CREATE: 'Created',
    UPDATE: 'Updated',
    DELETE: 'Deleted'
  }[action]

  return details
    ? `${actionText} ${entityType}: ${details}`
    : `${actionText} ${entityType}`
}
