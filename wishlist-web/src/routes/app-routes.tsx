import { Navigate, Route, Routes } from 'react-router-dom'
import { LayoutShell } from '@/components/layout-shell'
import { LoginPage, RegisterPage } from '@/features/auth/auth-pages'
import { ConnectionPage } from '@/features/connection/connection-page'
import { GroupPage, GroupsPage } from '@/features/groups/group-pages'
import { HomePage } from '@/features/home/home-page'
import { ProfilePage } from '@/features/profile/profile-page'
import { WishPage, WishlistPage } from '@/features/wishes/wish-pages'
import { useAuth } from '@/hooks/use-auth'
import { ProtectedRoute } from '@/routes/protected-route'

export function AppRoutes() {
  const { accessToken } = useAuth()

  return (
    <Routes>
      <Route element={<LayoutShell />}>
        <Route index element={<HomePage />} />
        <Route path="connection" element={<ConnectionPage />} />
        <Route
          path="login"
          element={accessToken ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route
          path="register"
          element={accessToken ? <Navigate to="/" replace /> : <RegisterPage />}
        />
        <Route element={<ProtectedRoute />}>
          <Route path="groups" element={<GroupsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="wishlist" element={<WishlistPage />} />
          <Route path="wishlist/:wishId" element={<WishPage />} />
          <Route path="groups/:groupId" element={<GroupPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
