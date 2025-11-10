import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { hashPassword, verifyPassword } from "./auth";
import { insertUserSchema } from "@shared/schema";

const loginSchema = z.object({
  username: z.string().min(1, "Username é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

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
      // Check if user is logged in and is admin
      if (!(req.session as any).userId) {
        return res.status(401).json({ message: "Não autorizado" });
      }

      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || currentUser.role !== 'admin') {
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
      
      // Create user
      const newUser = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

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
}
