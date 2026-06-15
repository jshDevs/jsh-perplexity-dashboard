/**
 * RoleGate — renderiza children solo si el usuario tiene el rol mínimo.
 * Muestra <fallback> o null en caso contrario.
 *
 * Uso:
 *   <RoleGate minRole="editor">
 *     <DeleteButton />
 *   </RoleGate>
 */
import { useAuthStore, type UserRole } from '@/store/authStore'

const RANK: Record<UserRole, number> = { viewer: 0, editor: 1, admin: 2 }

interface Props {
  minRole:  UserRole
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function RoleGate({ minRole, children, fallback = null }: Props) {
  const role = useAuthStore((s) => s.user?.role)
  if (!role || RANK[role] < RANK[minRole]) return <>{fallback}</>
  return <>{children}</>
}
