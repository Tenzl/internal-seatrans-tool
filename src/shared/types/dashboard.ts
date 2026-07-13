export type RoleGroup = "INTERNAL" | "EXTERNAL"

/** Dashboard section ids used to deep-link screens via the `?section=` query param. */
export type DashboardSection =
  | "profile"
  | "create-epda"
  | "shipping-agency-inquiry-detail"
  | "shipping-agency-inquiries"
  | "freight-forwarding-inquiries"
  | "logistics-inquiries"
  | "chartering-inquiries"
  | "special-request-inquiries"
  | "users"
  | "images"
  | "services"
  | "ports"
  | "offices"
  | "cargo-types"
  | "categories"
  | "posts"
  | "booking-partners"
  | "booking-shipping"
  | "inquiry"

export interface User {
  id: number
  email: string
  username?: string | null
  fullName: string | null
  nation?: string
  phone?: string | null
  company?: string | null
  role?: string
  roleId?: number
  roleGroup?: RoleGroup
  /** Dashboard section keys this user's role may access (from /auth/me). */
  sections?: string[]
  oauthProvider?: string | null
  emailVerified?: boolean
}
