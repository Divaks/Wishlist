// Temporary manual API types. Generate them with openapi-typescript once the backend exposes Swagger/OpenAPI.

export interface User {
  id: string
  email: string
  name: string | null
  birthday: string | null
}

export type PublicUser = Pick<User, 'id' | 'name' | 'birthday'>

export interface WishItem {
  id: string
  title: string
  description: string | null
  price: number
  link: string | null
  priority: WishPriority
  isInCart: boolean
  occasion: string | null
  occasionDate: string | null
  userId: string | null
  user: PublicUser | null
  isReserved: boolean
  reservedById: string | null
  reservedBy: PublicUser | null
}

export type WishPriority = 'low' | 'medium' | 'high'

export interface Group {
  id: string
  name: string
  description: string | null
  createdById: string
  createdBy: User
  members: GroupMember[]
  createdAt: string
}

export interface GroupMember {
  id: string
  groupId: string
  userId: string
  role: 'owner' | 'member'
  user: User
  joinedAt: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
}

export interface RegisterRequest extends LoginRequest {
  name?: string | null
}

export type RegisterResponse = Pick<User, 'id' | 'email' | 'name'>

export interface ProfileResponse extends Omit<User, 'id'> {
  userId: string
}

export interface CreateGroupRequest {
  name: string
  description?: string | null
}

export type ListGroupsResponse = Group[]
export type CreateGroupResponse = Group
export type GroupDetailResponse = Group
export type DeleteGroupResponse = void

export interface InviteMemberRequest {
  email: string
}

export interface InviteMemberResponse {
  groupId: string
  userId: string
  status: 'pending'
}

export type GroupWishesResponse = WishItem[]

export interface CreateWishRequest {
  title: string
  description?: string | null
  price?: number
  link?: string | null
  priority?: WishPriority
  isInCart?: boolean
}

export type UpdateWishRequest = Partial<CreateWishRequest>
export type ListWishlistResponse = WishItem[]
export type CreateWishResponse = WishItem
export type UpdateWishResponse = WishItem
export type DeleteWishResponse = void
export type ReserveWishResponse = WishItem
export type UnreserveWishResponse = void

export interface UpdateProfileRequest {
  name?: string | null
  birthday?: string | null
}

export type UpdateGroupRequest = Partial<CreateGroupRequest>

export interface GroupInvitation {
  groupId: string
}

export interface Page<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface HealthResponse {
  status: 'ok'
  timestamp: string
}
