import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import type { UserRole } from "@shared/schema";

const SALT_ROUNDS = 10;

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        role: UserRole;
        firstName?: string;
        lastName?: string;
        email?: string | null;
      };
    }
  }
}

export async function setupAuth(app: Express) {
  // Trust proxy for Replit deployments (required for secure cookies in production)
  if (process.env.NODE_ENV === "production") {
    app.set('trust proxy', 1);
  }

  // Session configuration
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "ferramentaria-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      proxy: true, // Enable proxy support for Replit deployments
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: 'lax', // CSRF protection
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      },
    })
  );
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session && (req.session as any).userId) {
    next();
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
}

export function authorizeRoles(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user && roles.includes(req.user.role)) {
      return next();
    }
    res.status(403).json({ message: "Forbidden" });
  };
}

export function isAdmin(req: Request, res: Response, next: NextFunction) {
  return authorizeRoles("admin")(req, res, next);
}

export function isOperatorOrAdmin(req: Request, res: Response, next: NextFunction) {
  return authorizeRoles("admin", "operator")(req, res, next);
}

// Middleware to load user from session
export async function loadUserFromSession(req: Request, res: Response, next: NextFunction) {
  if (req.session && (req.session as any).userId) {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (user) {
        req.user = {
          id: user.id,
          username: user.username,
          role: (user.role as UserRole) ?? "user",
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        };
      }
    } catch (error) {
      console.error("Error loading user from session:", error);
    }
  }
  next();
}
