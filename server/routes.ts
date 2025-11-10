import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertToolSchema, insertToolClassSchema, insertToolModelSchema, insertLoanSchema } from "@shared/schema";
import { addDays } from "date-fns";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Tool Classes routes
  app.get('/api/classes', isAuthenticated, async (req, res) => {
    try {
      const classes = await storage.getToolClasses();
      res.json(classes);
    } catch (error) {
      console.error("Error fetching classes:", error);
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  });

  app.post('/api/classes', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const validated = insertToolClassSchema.parse(req.body);
      const toolClass = await storage.createToolClass(validated);
      res.json(toolClass);
    } catch (error: any) {
      console.error("Error creating class:", error);
      res.status(400).json({ message: error.message || "Failed to create class" });
    }
  });

  app.patch('/api/classes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const toolClass = await storage.updateToolClass(req.params.id, req.body);
      res.json(toolClass);
    } catch (error: any) {
      console.error("Error updating class:", error);
      res.status(400).json({ message: error.message || "Failed to update class" });
    }
  });

  app.delete('/api/classes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteToolClass(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting class:", error);
      res.status(400).json({ message: error.message || "Failed to delete class" });
    }
  });

  // Tool Models routes
  app.get('/api/models', isAuthenticated, async (req, res) => {
    try {
      const models = await storage.getToolModels();
      res.json(models);
    } catch (error) {
      console.error("Error fetching models:", error);
      res.status(500).json({ message: "Failed to fetch models" });
    }
  });

  app.post('/api/models', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const validated = insertToolModelSchema.parse(req.body);
      const toolModel = await storage.createToolModel(validated);
      res.json(toolModel);
    } catch (error: any) {
      console.error("Error creating model:", error);
      res.status(400).json({ message: error.message || "Failed to create model" });
    }
  });

  app.patch('/api/models/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const toolModel = await storage.updateToolModel(req.params.id, req.body);
      res.json(toolModel);
    } catch (error: any) {
      console.error("Error updating model:", error);
      res.status(400).json({ message: error.message || "Failed to update model" });
    }
  });

  app.delete('/api/models/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteToolModel(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting model:", error);
      res.status(400).json({ message: error.message || "Failed to delete model" });
    }
  });

  // Tools routes
  app.get('/api/tools', isAuthenticated, async (req, res) => {
    try {
      const tools = await storage.getTools();
      res.json(tools);
    } catch (error) {
      console.error("Error fetching tools:", error);
      res.status(500).json({ message: "Failed to fetch tools" });
    }
  });

  app.post('/api/tools', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
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
        availableQuantity: validated.quantity,
        nextCalibrationDate: nextCalibrationDate,
      });
      res.json(tool);
    } catch (error: any) {
      console.error("Error creating tool:", error);
      res.status(400).json({ message: error.message || "Failed to create tool" });
    }
  });

  app.patch('/api/tools/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Calculate next calibration date if lastCalibrationDate is being updated
      let updateData = { ...req.body };
      if (updateData.lastCalibrationDate && updateData.modelId) {
        const model = await storage.getToolModel(updateData.modelId);
        if (model?.requiresCalibration && model.calibrationIntervalDays) {
          const lastCal = new Date(updateData.lastCalibrationDate);
          updateData.nextCalibrationDate = addDays(lastCal, model.calibrationIntervalDays);
        }
      }

      const tool = await storage.updateTool(req.params.id, updateData);
      res.json(tool);
    } catch (error: any) {
      console.error("Error updating tool:", error);
      res.status(400).json({ message: error.message || "Failed to update tool" });
    }
  });

  app.delete('/api/tools/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteTool(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting tool:", error);
      res.status(400).json({ message: error.message || "Failed to delete tool" });
    }
  });

  // Loans routes
  app.get('/api/loans', isAuthenticated, async (req, res) => {
    try {
      const loans = await storage.getLoans();
      res.json(loans);
    } catch (error) {
      console.error("Error fetching loans:", error);
      res.status(500).json({ message: "Failed to fetch loans" });
    }
  });

  app.post('/api/loans', isAuthenticated, async (req: any, res) => {
    try {
      const operator = await storage.getUser(req.user.claims.sub);
      if (operator?.role !== 'operator' && operator?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { toolId, userId, quantityLoaned, userConfirmation } = req.body;

      // Verify user confirmation
      const user = await storage.getUser(userId);
      if (!user || user.email !== userConfirmation.email) {
        return res.status(400).json({ message: "User confirmation failed" });
      }

      // Get tool and verify availability
      const tool = await storage.getTool(toolId);
      if (!tool || tool.availableQuantity < quantityLoaned) {
        return res.status(400).json({ message: "Tool not available in requested quantity" });
      }

      // Create loan
      const loan = await storage.createLoan({
        toolId,
        userId,
        operatorId: req.user.claims.sub,
        quantityLoaned,
        userConfirmation: true,
        userConfirmationDate: new Date(),
        status: 'active',
      });

      // Update tool availability
      await storage.updateTool(toolId, {
        availableQuantity: tool.availableQuantity - quantityLoaned,
        status: tool.availableQuantity - quantityLoaned === 0 ? 'loaned' : tool.status,
      });

      res.json(loan);
    } catch (error: any) {
      console.error("Error creating loan:", error);
      res.status(400).json({ message: error.message || "Failed to create loan" });
    }
  });

  app.patch('/api/loans/:id/return', isAuthenticated, async (req: any, res) => {
    try {
      const operator = await storage.getUser(req.user.claims.sub);
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
      });

      // Update tool availability
      const tool = await storage.getTool(loan.toolId);
      if (tool) {
        await storage.updateTool(loan.toolId, {
          availableQuantity: tool.availableQuantity + loan.quantityLoaned,
          status: 'available',
        });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error returning loan:", error);
      res.status(400).json({ message: error.message || "Failed to return loan" });
    }
  });

  // Users routes
  app.get('/api/users', isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const user = await storage.updateUser(req.params.id, req.body);
      res.json(user);
    } catch (error: any) {
      console.error("Error updating user:", error);
      res.status(400).json({ message: error.message || "Failed to update user" });
    }
  });

  app.delete('/api/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteUser(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      res.status(400).json({ message: error.message || "Failed to delete user" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
