/**
 * authService.ts — JWT (jose, no dependencia OpenSSL externa)
 *
 * Access token:  15 min
 * Refresh token: 7 días, almacenado en Redis con clave refresh:<jti>
 *
 * Roles: 'viewer' | 'editor' | 'admin'
 */
import * as jose from 'jose'
import { nanoid } from 'nanoid'

export type UserRole = 'viewer' | 'editor' | 'admin'

export interface JwtPayload {
  sub:   string      // userId
  email: string
  role:  UserRole
  jti:   string      // único por token
}

export interface TokenPair {
  accessToken:  string
  refreshToken: string
  expiresIn:    number  // segundos
}

const ACCESS_TTL  = 60 * 15           // 15 min
const REFRESH_TTL = 60 * 60 * 24 * 7  // 7 días

function getSecret() {
  const raw = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'
  return new TextEncoder().encode(raw)
}

export async function signAccessToken(payload: Omit<JwtPayload, 'jti'>): Promise<string> {
  return new jose.SignJWT({ ...payload, jti: nanoid() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL}s`)
    .sign(getSecret())
}

export async function signRefreshToken(payload: Omit<JwtPayload, 'jti'>): Promise<{ token: string; jti: string }> {
  const jti = nanoid()
  const token = await new jose.SignJWT({ ...payload, jti })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TTL}s`)
    .sign(getSecret())
  return { token, jti }
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jose.jwtVerify(token, getSecret())
  return payload as unknown as JwtPayload
}

export async function issueTokenPair(
  redis: any,
  userId: string,
  email: string,
  role: UserRole,
): Promise<TokenPair> {
  const base = { sub: userId, email, role }
  const [accessToken, { token: refreshToken, jti }] = await Promise.all([
    signAccessToken(base),
    signRefreshToken(base),
  ])
  // Guardar refresh token en Redis para revocación
  await redis.set(`refresh:${jti}`, userId, { EX: REFRESH_TTL })
  return { accessToken, refreshToken, expiresIn: ACCESS_TTL }
}

export async function revokeRefreshToken(redis: any, jti: string): Promise<void> {
  await redis.del(`refresh:${jti}`)
}

export async function rotateRefreshToken(
  redis: any,
  refreshToken: string,
): Promise<TokenPair> {
  const payload = await verifyToken(refreshToken)
  // Verificar que el jti sigue válido en Redis (no revocado)
  const stored = await redis.get(`refresh:${payload.jti}`)
  if (!stored) throw new Error('Refresh token revocado o expirado')
  // Revocar el anterior (rotation)
  await revokeRefreshToken(redis, payload.jti)
  return issueTokenPair(redis, payload.sub, payload.email, payload.role)
}
