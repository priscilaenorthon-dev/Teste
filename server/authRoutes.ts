import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { hashPassword, verifyPassword } from "./auth";
import { insertUserSchema, type User } from "@shared/schema";
import { nanoid } from "nanoid";
import { logger } from "./logger";

const loginSchema = z.object({
  username: z.string().min(1, "Username é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

function formatUserDisplayName(
  user?: Partial<Pick<User, "firstName" | "lastName" | "username">> | null,
) {
  if (!user) {
    return "Usuário desconhecido";
  }
  const parts = [user.firstName?.trim() || "", user.lastName?.trim() || ""].filter(Boolean);
  if (parts.length) {
    return parts.join(" ");
  }
  return user.username || "Usuário desconhecido";
}

function buildUserAuditData(user: User) {
  return {
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    department: user.department,
    matriculation: user.matriculation,
    role: user.role,
  } as Record<string, unknown>;
}

export function setupAuthRoutes(app: Express) {
  // Login route
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      const isValid = await verifyPassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      // Store user in session
      (req.session as any).userId = user.id;
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(400).json({ message: error.message || "Erro ao fazer login" });
    }
  });

  // Register route (admin only)
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autorizado" });
      }

      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Apenas administradores podem registrar usuários" });
      }

      const userData = registerSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username já existe" });
      }

      // Hash password
      const hashedPassword = await hashPassword(userData.password);
      
      // Generate unique QR code
      const qrCode = nanoid(16);
      
      // Create user
      const newUser = await storage.createUser({
        ...userData,
        password: hashedPassword,
        qrCode,
      });

      try {
        await storage.createAuditLog({
          userId: req.user.id,
          targetType: "user",
          targetId: newUser.id,
          action: "create",
          description: `Usuário ${formatUserDisplayName(req.user)} criou o usuário ${formatUserDisplayName(newUser)}.`,
          afterData: buildUserAuditData(newUser),
        });
      } catch (error) {
        logger.error({ err: error, route: "/api/auth/register" }, "Failed to log user creation");
      }

      // Return user without password
      const { password: _, ...userWithoutPassword } = newUser;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Register error:", error);
      res.status(400).json({ message: error.message || "Erro ao registrar usuário" });
    }
  });

  // Logout route
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Erro ao fazer logout" });
      }
      res.json({ message: "Logout realizado com sucesso" });
    });
  });

  // Get current user route
  app.get('/api/auth/user', async (req: Request, res: Response) => {
    try {
      if (!(req.session as any).userId) {
        return res.status(401).json({ message: "Não autorizado" });
      }

      const user = await storage.getUser((req.session as any).userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Erro ao buscar usuário" });
    }
  });

  // Validate QR Code route
  app.post('/api/auth/validate-qrcode', async (req: Request, res: Response) => {
    try {
      const { qrCode } = z.object({ qrCode: z.string() }).parse(req.body);
      
      const user = await storage.getUserByQRCode(qrCode);
      if (!user) {
        return res.status(404).json({ message: "QR Code inválido" });
      }

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("QR Code validation error:", error);
      res.status(400).json({ message: error.message || "Erro ao validar QR Code" });
    }
  });
}
