import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";

const SALT_ROUNDS = 10;

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        role: string;
      };
    }
  }
}

export async function setupAuth(app: Express) {
  // Session configuration
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "ferramentaria-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
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

export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Forbidden: Admin access required" });
  }
}

export function isOperatorOrAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user && (req.user.role === "admin" || req.user.role === "operator")) {
    next();
  } else {
    res.status(403).json({ message: "Forbidden: Operator or Admin access required" });
  }
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
          role: user.role,
        };
      }
    } catch (error) {
      console.error("Error loading user from session:", error);
    }
  }
  next();
}
