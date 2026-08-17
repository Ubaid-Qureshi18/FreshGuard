import type { Request, Response, NextFunction } from 'express';

export interface AuthRequest<
  P = Record<string, any>,
  ResBody = any,
  ReqBody = any,
  ReqQuery = Record<string, any>
> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user?: { id: string; email?: string };
  userJwt?: string;
  file?: any;
  files?: any;
}

// ── No-auth middleware: always passes through with a guest user ──
export function requireAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const jwt = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (jwt && jwt.startsWith('dev_token_')) {
    // Extract email from dev token if present
    const parts = jwt.split('_');
    const email = parts[2] ? decodeURIComponent(parts[2]) : 'user@freshguard.app';
    req.user    = { id: '00000000-0000-0000-0000-000000000001', email };
    req.userJwt = jwt;
  } else {
    // No token or real token — use guest identity
    req.user    = { id: '00000000-0000-0000-0000-000000000001', email: 'user@freshguard.app' };
    req.userJwt = `dev_token_${Date.now()}_user%40freshguard.app`;
  }

  next();
}
