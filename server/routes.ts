import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, loadUserFromSession, verifyPassword } from "./auth";
import { setupAuthRoutes } from "./authRoutes";
import { logger } from "./logger";
import {
  insertToolSchema,
  insertToolClassSchema,
  insertToolModelSchema,
  insertLoanSchema,
  updateToolSchema,
  type UpdateTool,
} from "@shared/schema";
import { addDays } from "date-fns";
import { z } from "zod";

// Validation schema for loan creation
const createLoanSchema = z.object({
  tools: z.array(z.object({
    toolId: z.string(),
    quantityLoaned: z.number().positive(),
  })).min(1),
  userId: z.string(),
  userConfirmation: z.discriminatedUnion("method", [
    z.object({
      method: z.literal("manual"),
      email: z.string(),
      password: z.string(),
    }),
    z.object({
      method: z.literal("qrcode"),
      qrCode: z.string(),
    }),
  ]),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);
  
  // Load user from session for all requests
  app.use(loadUserFromSession);

  // Auth routes (login, register, logout)
  setupAuthRoutes(app);

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats(
        req.user?.role === 'user' ? { userId: req.user.id } : undefined
      );
      res.json(stats);
    } catch (error) {
      logger.error({ err: error, route: "/api/dashboard/stats" }, "Error fetching dashboard stats");
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Tool Classes routes
  app.get('/api/classes', isAuthenticated, async (req, res) => {
    try {
      const classes = await storage.getToolClasses();
      res.json(classes);
    } catch (error) {
      logger.error({ err: error, route: "/api/classes" }, "Error fetching classes");
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  });

  app.post('/api/classes', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const validated = insertToolClassSchema.parse(req.body);
      const toolClass = await storage.createToolClass(validated);
      res.json(toolClass);
    } catch (error: any) {
      logger.error({ err: error, route: "/api/classes", action: "create" }, "Error creating class");
      res.status(400).json({ message: error.message || "Failed to create class" });
    }
  });

  app.patch('/api/classes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const toolClass = await storage.updateToolClass(req.params.id, req.body);
      res.json(toolClass);
    } catch (error: any) {
      logger.error({ err: error, route: "/api/classes/:id", action: "update" }, "Error updating class");
      res.status(400).json({ message: error.message || "Failed to update class" });
    }
  });

  app.delete('/api/classes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteToolClass(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error, route: "/api/classes/:id", action: "delete" }, "Error deleting class");
      res.status(400).json({ message: error.message || "Failed to delete class" });
    }
  });

  // Tool Models routes
  app.get('/api/models', isAuthenticated, async (req, res) => {
    try {
      const models = await storage.getToolModels();
      res.json(models);
    } catch (error) {
      logger.error({ err: error, route: "/api/models" }, "Error fetching models");
      res.status(500).json({ message: "Failed to fetch models" });
    }
  });

  app.post('/api/models', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const validated = insertToolModelSchema.parse(req.body);
      const toolModel = await storage.createToolModel(validated);
      res.json(toolModel);
    } catch (error: any) {
      logger.error({ err: error, route: "/api/models", action: "create" }, "Error creating model");
      res.status(400).json({ message: error.message || "Failed to create model" });
    }
  });

  app.patch('/api/models/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const toolModel = await storage.updateToolModel(req.params.id, req.body);
      res.json(toolModel);
    } catch (error: any) {
      logger.error({ err: error, route: "/api/models/:id", action: "update" }, "Error updating model");
      res.status(400).json({ message: error.message || "Failed to update model" });
    }
  });

  app.delete('/api/models/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteToolModel(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error, route: "/api/models/:id", action: "delete" }, "Error deleting model");
      res.status(400).json({ message: error.message || "Failed to delete model" });
    }
  });

  // Tools routes
  app.get('/api/tools', isAuthenticated, async (req, res) => {
    try {
      const tools = await storage.getTools();
      res.json(tools);
    } catch (error) {
      logger.error({ err: error, route: "/api/tools" }, "Error fetching tools");
      res.status(500).json({ message: "Failed to fetch tools" });
    }
  });

  app.post('/api/tools', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const validated = insertToolSchema.parse(req.body);
      
      // Calculate next calibration date if applicable
      let nextCalibrationDate = null;
      if (validated.lastCalibrationDate && validated.modelId) {
        const model = await storage.getToolModel(validated.modelId);
        if (model?.requiresCalibration && model.calibrationIntervalDays) {
          const lastCal = new Date(validated.lastCalibrationDate);
          nextCalibrationDate = addDays(lastCal, model.calibrationIntervalDays);
        }
      }

      const tool = await storage.createTool({
        ...validated,
        nextCalibrationDate: nextCalibrationDate,
      } as any);
      res.json(tool);
    } catch (error: any) {
      logger.error({ err: error, route: "/api/tools", action: "create" }, "Error creating tool");
      res.status(400).json({ message: error.message || "Failed to create tool" });
    }
  });

  app.patch('/api/tools/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const existingTool = await storage.getTool(req.params.id);
      if (!existingTool) {
        return res.status(404).json({ message: "Ferramenta não encontrada" });
      }

      const parsed = updateToolSchema.parse(req.body);
      const updateData = Object.fromEntries(
        Object.entries(parsed).filter(([, value]) => value !== undefined),
      ) as UpdateTool;

      const hasLastCalibrationUpdate = Object.prototype.hasOwnProperty.call(
        req.body,
        "lastCalibrationDate",
      );
      const hasModelUpdate = Object.prototype.hasOwnProperty.call(req.body, "modelId");

      const modelIdToUse = updateData.modelId ?? existingTool.modelId ?? null;

      if (hasLastCalibrationUpdate) {
        if (updateData.lastCalibrationDate === null) {
          updateData.nextCalibrationDate = null;
        } else if (updateData.lastCalibrationDate && modelIdToUse) {
          const model = await storage.getToolModel(modelIdToUse);
          if (model?.requiresCalibration && model.calibrationIntervalDays) {
            updateData.nextCalibrationDate = addDays(
              updateData.lastCalibrationDate,
              model.calibrationIntervalDays,
            );
          } else if (model && !model.requiresCalibration) {
            updateData.nextCalibrationDate = null;
          }
        }
      } else if (hasModelUpdate && modelIdToUse && existingTool.lastCalibrationDate) {
        const model = await storage.getToolModel(modelIdToUse);
        if (model?.requiresCalibration && model.calibrationIntervalDays) {
          updateData.nextCalibrationDate = addDays(
            existingTool.lastCalibrationDate,
            model.calibrationIntervalDays,
          );
        } else if (model && !model.requiresCalibration) {
          updateData.nextCalibrationDate = null;
        }
      }

      const tool = await storage.updateTool(req.params.id, updateData);
      res.json(tool);
    } catch (error: any) {
      logger.error({ err: error, route: "/api/tools/:id", action: "update" }, "Error updating tool");
      res.status(400).json({ message: error.message || "Failed to update tool" });
    }
  });

  app.delete('/api/tools/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteTool(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error, route: "/api/tools/:id", action: "delete" }, "Error deleting tool");
      res.status(400).json({ message: error.message || "Failed to delete tool" });
    }
  });

  // Loans routes
  app.get('/api/loans', isAuthenticated, async (req, res) => {
    try {
      const loans = await storage.getLoans(
        req.user?.role === 'user'
          ? { userId: req.user.id, status: 'active' }
          : undefined
      );
      res.json(loans);
    } catch (error) {
      logger.error({ err: error, route: "/api/loans" }, "Error fetching loans");
      res.status(500).json({ message: "Failed to fetch loans" });
    }
  });

  app.post('/api/loans', isAuthenticated, async (req: any, res) => {
    try {
      const operator = await storage.getUser(req.user.id);
      if (operator?.role !== 'operator' && operator?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Validate request body with Zod schema
      const validationResult = createLoanSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: validationResult.error.errors 
        });
      }

      const { tools, userId, userConfirmation } = validationResult.data;

      // Verify user confirmation
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      // Verify based on confirmation method
      if (userConfirmation.method === "qrcode") {
        // QR code path: server-side validation of QR code
        const qrUser = await storage.getUserByQRCode(userConfirmation.qrCode);
        if (!qrUser) {
          return res.status(400).json({ message: "User confirmation failed: invalid QR code" });
        }
        
        // CRITICAL: Verify QR code belongs to the selected user
        if (qrUser.id !== userId) {
          return res.status(400).json({ message: "User confirmation failed: QR code does not belong to selected user" });
        }
      } else {
        // Manual credential path: verify email/username and password
        if (user.email !== userConfirmation.email && user.username !== userConfirmation.email) {
          return res.status(400).json({ message: "User confirmation failed: invalid credentials" });
        }

        // Verify password
        const isPasswordValid = await verifyPassword(userConfirmation.password, user.password);
        if (!isPasswordValid) {
          return res.status(400).json({ message: "User confirmation failed: invalid password" });
        }
      }

      // Validate tools array
      if (!Array.isArray(tools) || tools.length === 0) {
        return res.status(400).json({ message: "Tools array is required and must not be empty" });
      }

      // Verify availability of all tools first (before creating any loans)
      const toolsData = await Promise.all(
        tools.map(async ({ toolId, quantityLoaned }) => {
          const tool = await storage.getTool(toolId);
          if (!tool || tool.availableQuantity < quantityLoaned) {
            throw new Error(`Tool ${tool?.code || toolId} not available in requested quantity`);
          }
          return { tool, quantityLoaned };
        })
      );

      // Generate a single batchId for all loans in this transaction
      const batchId = crypto.randomUUID();
      const now = new Date();

      // Create all loans with the same batchId
      const createdLoans = await Promise.all(
        toolsData.map(async ({ tool, quantityLoaned }) => {
          const loan = await storage.createLoan({
            batchId,
            toolId: tool.id,
            userId,
            operatorId: req.user.id,
            quantityLoaned,
            userConfirmation: true,
            userConfirmationDate: now,
          } as any);

          // Update tool availability
          await storage.updateTool(tool.id, {
            availableQuantity: tool.availableQuantity - quantityLoaned,
            status: tool.availableQuantity - quantityLoaned === 0 ? 'loaned' : tool.status,
          } as any);

          return loan;
        })
      );

      res.json({ loans: createdLoans, batchId });
    } catch (error: any) {
      logger.error({ err: error, route: "/api/loans", action: "create" }, "Error creating loans");
      res.status(400).json({ message: error.message || "Failed to create loans" });
    }
  });

  app.patch('/api/loans/:id/return', isAuthenticated, async (req: any, res) => {
    try {
      const operator = await storage.getUser(req.user.id);
      if (operator?.role !== 'operator' && operator?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const loan = await storage.getLoan(req.params.id);
      if (!loan) {
        return res.status(404).json({ message: "Loan not found" });
      }

      // Update loan as returned
      await storage.updateLoan(req.params.id, {
        status: 'returned',
        returnDate: new Date(),
      } as any);

      // Update tool availability
      const tool = await storage.getTool(loan.toolId);
      if (tool) {
        await storage.updateTool(loan.toolId, {
          availableQuantity: tool.availableQuantity + loan.quantityLoaned,
          status: 'available',
        } as any);
      }

      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error, route: "/api/loans/:id/return", action: "return" }, "Error returning loan");
      res.status(400).json({ message: error.message || "Failed to return loan" });
    }
  });

  // Users routes
  app.get('/api/users', isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      logger.error({ err: error, route: "/api/users" }, "Error fetching users");
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const user = await storage.updateUser(req.params.id, req.body);
      res.json(user);
    } catch (error: any) {
      logger.error({ err: error, route: "/api/users/:id", action: "update" }, "Error updating user");
      res.status(400).json({ message: error.message || "Failed to update user" });
    }
  });

  app.delete('/api/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteUser(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error, route: "/api/users/:id", action: "delete" }, "Error deleting user");
      res.status(400).json({ message: error.message || "Failed to delete user" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
