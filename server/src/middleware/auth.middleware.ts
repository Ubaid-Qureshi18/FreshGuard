import { Request, Response, NextFunction } from 'express';
import { verifyUserJwt } from '../services/db/supabase.service';

export interface AuthRequest extends Request {
  user?: { id: string; email?: string };
  userJwt?: string;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const jwt = authHeader.slice(7);
  try {
    const user = await verifyUserJwt(jwt);
    req.user    = { id: user.id, email: user.email };
    req.userJwt = jwt;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }
}
