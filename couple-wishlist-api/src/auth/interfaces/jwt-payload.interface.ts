export interface JwtPayload {
  sub: string;
  email: string;
  partnerId: string | null;
  iat?: number;
  exp: number;
}
