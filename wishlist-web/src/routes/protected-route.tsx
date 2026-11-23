import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'

export function ProtectedRoute() {
  const { accessToken } = useAuth()
  return accessToken ? <Outlet /> : <Navigate to="/login" replace />
}
