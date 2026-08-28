export type RoleName = 'admin' | 'manager' | 'editor' | 'user';

export interface Permission {
  id: number;
  name: string;
  display_name: string;
}

export interface Role {
  id: number;
  name: RoleName;
  display_name: string;
  permissions?: Permission[];
}

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  username: string | null;
  email: string;
  email_verified_at: string | null;
  is_active: boolean;
  locale: 'en' | 'fr' | 'es';
  avatar_url?: string | null;
  profile_preferences?: { email_notifications?: boolean } | null;
  roles: Role[];
}

export interface AuthResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  user?: User;
}

export interface LoginRequest {
  login: string;
  password: string;
}

export interface RegisterRequest {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  password: string;
  password_confirmation: string;
  terms_accepted: boolean;
}
