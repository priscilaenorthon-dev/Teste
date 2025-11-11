import type { Express } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "node:crypto";
import { storage } from "./storage";
import {
  setupAuth,
  isAuthenticated,
  loadUserFromSession,
  verifyPassword,
  authorizeRoles,
} from "./auth";
import { setupAuthRoutes } from "./authRoutes";
import { logger } from "./logger";
import {
  insertToolSchema,
  insertToolClassSchema,
  insertToolModelSchema,
  updateToolSchema,
  type UpdateTool,
  type AuditAction,
  type AuditTargetType,
  type Tool,
  type ToolClass,
  type ToolModel,
  type User,
} from "@shared/schema";
import { addDays } from "date-fns";
import { z } from "zod";

type MinimalUserInfo = {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
};

function formatUserDisplayName(user?: MinimalUserInfo | null) {
  if (!user) {
    return "Usuário desconhecido";
  }
  const parts = [user.firstName?.trim() || "", user.lastName?.trim() || ""].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(" ");
  }
  return user.username || "Usuário desconhecido";
}

function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "vazio";
  }
  if (typeof value === "boolean") {
    return value ? "sim" : "não";
  }
  if (typeof value === "number") {
    return value.toString();
  }
  if (typeof value === "string") {
    const dateMatch = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value);
    if (dateMatch) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
        }).format(date);
      }
    }
    return value;
  }
  return String(value);
}

function describeChanges(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  labels: Record<string, string>,
) {
  if (!before || !after) {
    return [] as string[];
  }

  const changes: string[] = [];
  for (const [field, label] of Object.entries(labels)) {
    if (!(field in before) && !(field in after)) {
      continue;
    }
    const previous = field in before ? before[field] : null;
    const current = field in after ? after[field] : null;
    if (JSON.stringify(previous) === JSON.stringify(current)) {
      continue;
    }
    changes.push(
      `${label} alterado de '${formatAuditValue(previous)}' para '${formatAuditValue(current)}'`,
    );
  }
  return changes;
}

function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toAuditToolData(tool?: Partial<Tool> | null) {
  if (!tool) return null;
  return {
    id: tool.id,
    name: tool.name ?? null,
    code: tool.code ?? null,
    quantity: tool.quantity ?? null,
    availableQuantity: tool.availableQuantity ?? null,
    status: tool.status ?? null,
    lastCalibrationDate: toIsoString(tool.lastCalibrationDate as any),
    nextCalibrationDate: toIsoString(tool.nextCalibrationDate as any),
  } satisfies Record<string, unknown>;
}

function toAuditClassData(toolClass?: Partial<ToolClass> | null) {
  if (!toolClass) return null;
  return {
    id: toolClass.id,
    name: toolClass.name ?? null,
    description: toolClass.description ?? null,
  } satisfies Record<string, unknown>;
}

function toAuditModelData(toolModel?: Partial<ToolModel> | null) {
  if (!toolModel) return null;
  return {
    id: toolModel.id,
    name: toolModel.name ?? null,
    requiresCalibration: toolModel.requiresCalibration ?? null,
    calibrationIntervalDays: toolModel.calibrationIntervalDays ?? null,
  } satisfies Record<string, unknown>;
}

function toAuditUserData(user?: Partial<User> | null) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username ?? null,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    email: user.email ?? null,
    department: user.department ?? null,
    matriculation: user.matriculation ?? null,
    role: user.role ?? null,
  } satisfies Record<string, unknown>;
}

type AuditLogPayload = {
  userId?: string | null;
  targetType: AuditTargetType;
  targetId: string;
  action: AuditAction;
  description: string;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

const AUDIT_TARGET_TYPES: AuditTargetType[] = ["tool", "toolClass", "toolModel", "user"];

async function recordAuditLog(payload: AuditLogPayload) {
  try {
    await storage.createAuditLog({
      userId: payload.userId ?? null,
      targetType: payload.targetType,
      targetId: payload.targetId,
      action: payload.action,
      description: payload.description,
      beforeData: payload.beforeData ?? null,
      afterData: payload.afterData ?? null,
      metadata: payload.metadata ?? null,
    });
  } catch (error) {
    logger.error({ err: error, payload }, "Failed to record audit log");
  }
}

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
  app.get('/api/classes', isAuthenticated, authorizeRoles('operator', 'admin'), async (_req, res) => {
    try {
      const classes = await storage.getToolClasses();
      res.json(classes);
    } catch (error) {
      logger.error({ err: error, route: "/api/classes" }, "Error fetching classes");
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  });

  app.post('/api/classes', isAuthenticated, authorizeRoles('operator', 'admin'), async (req: any, res) => {
    try {
      const validated = insertToolClassSchema.parse(req.body);
      const toolClass = await storage.createToolClass(validated);
      const actorName = formatUserDisplayName(req.user);

      await recordAuditLog({
        userId: req.user?.id,
        targetType: "toolClass",
        targetId: toolClass.id,
        action: "create",
        description: `Usuário ${actorName} criou a classe ${toolClass.name}.`,
        afterData: toAuditClassData(toolClass),
      });
      res.json(toolClass);
    } catch (error: any) {
      logger.error({ err: error, route: "/api/classes", action: "create" }, "Error creating class");
      res.status(400).json({ message: error.message || "Failed to create class" });
    }
  });

  app.patch('/api/classes/:id', isAuthenticated, authorizeRoles('operator', 'admin'), async (req: any, res) => {
    try {
      const existingClass = await storage.getToolClass(req.params.id);
      if (!existingClass) {
        return res.status(404).json({ message: "Classe não encontrada" });
      }

      const toolClass = await storage.updateToolClass(req.params.id, req.body);
      if (!toolClass) {
        return res.status(404).json({ message: "Classe não encontrada" });
      }

      const actorName = formatUserDisplayName(req.user);
      const beforeData = toAuditClassData(existingClass);
      const afterData = toAuditClassData(toolClass);
      const changes = describeChanges(beforeData, afterData, {
        name: "Nome da classe",
        description: "Descrição",
      });

      const description = changes.length
        ? `Usuário ${actorName} alterou a classe ${toolClass.name}. ${changes.join("; ")}`
        : `Usuário ${actorName} atualizou a classe ${toolClass.name}.`;

      await recordAuditLog({
        userId: req.user?.id,
        targetType: "toolClass",
        targetId: toolClass.id,
        action: "update",
        description,
        beforeData,
        afterData,
      });
      res.json(toolClass);
    } catch (error: any) {
      logger.error({ err: error, route: "/api/classes/:id", action: "update" }, "Error updating class");
      res.status(400).json({ message: error.message || "Failed to update class" });
    }
  });

  app.delete('/api/classes/:id', isAuthenticated, authorizeRoles('operator', 'admin'), async (req: any, res) => {
    try {
      const existingClass = await storage.getToolClass(req.params.id);
      if (!existingClass) {
        return res.status(404).json({ message: "Classe não encontrada" });
      }

      await storage.deleteToolClass(req.params.id);
      const actorName = formatUserDisplayName(req.user);

      await recordAuditLog({
        userId: req.user?.id,
        targetType: "toolClass",
        targetId: existingClass.id,
        action: "delete",
        description: `Usuário ${actorName} excluiu a classe ${existingClass.name}.`,
        beforeData: toAuditClassData(existingClass),
      });
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error, route: "/api/classes/:id", action: "delete" }, "Error deleting class");
      res.status(400).json({ message: error.message || "Failed to delete class" });
    }
  });

  // Tool Models routes
  app.get('/api/models', isAuthenticated, authorizeRoles('operator', 'admin'), async (_req, res) => {
    try {
      const models = await storage.getToolModels();
      res.json(models);
    } catch (error) {
      logger.error({ err: error, route: "/api/models" }, "Error fetching models");
      res.status(500).json({ message: "Failed to fetch models" });
    }
  });

  app.post('/api/models', isAuthenticated, authorizeRoles('operator', 'admin'), async (req: any, res) => {
    try {
      const validated = insertToolModelSchema.parse(req.body);
      const toolModel = await storage.createToolModel(validated);
      const actorName = formatUserDisplayName(req.user);

      await recordAuditLog({
        userId: req.user?.id,
        targetType: "toolModel",
        targetId: toolModel.id,
        action: "create",
        description: `Usuário ${actorName} criou o modelo ${toolModel.name}.`,
        afterData: toAuditModelData(toolModel),
      });
      res.json(toolModel);
    } catch (error: any) {
      logger.error({ err: error, route: "/api/models", action: "create" }, "Error creating model");
      res.status(400).json({ message: error.message || "Failed to create model" });
    }
  });

  app.patch('/api/models/:id', isAuthenticated, authorizeRoles('operator', 'admin'), async (req: any, res) => {
    try {
      const existingModel = await storage.getToolModel(req.params.id);
      if (!existingModel) {
        return res.status(404).json({ message: "Modelo não encontrado" });
      }

      const toolModel = await storage.updateToolModel(req.params.id, req.body);
      if (!toolModel) {
        return res.status(404).json({ message: "Modelo não encontrado" });
      }

      const actorName = formatUserDisplayName(req.user);
      const beforeData = toAuditModelData(existingModel);
      const afterData = toAuditModelData(toolModel);
      const changes = describeChanges(beforeData, afterData, {
        name: "Nome do modelo",
        requiresCalibration: "Requer calibração",
        calibrationIntervalDays: "Intervalo de calibração (dias)",
      });

      const description = changes.length
        ? `Usuário ${actorName} alterou o modelo ${toolModel.name}. ${changes.join("; ")}`
        : `Usuário ${actorName} atualizou o modelo ${toolModel.name}.`;

      await recordAuditLog({
        userId: req.user?.id,
        targetType: "toolModel",
        targetId: toolModel.id,
        action: "update",
        description,
        beforeData,
        afterData,
      });
      res.json(toolModel);
    } catch (error: any) {
      logger.error({ err: error, route: "/api/models/:id", action: "update" }, "Error updating model");
      res.status(400).json({ message: error.message || "Failed to update model" });
    }
  });

  app.delete('/api/models/:id', isAuthenticated, authorizeRoles('operator', 'admin'), async (req: any, res) => {
    try {
      const existingModel = await storage.getToolModel(req.params.id);
      if (!existingModel) {
        return res.status(404).json({ message: "Modelo não encontrado" });
      }

      await storage.deleteToolModel(req.params.id);
      const actorName = formatUserDisplayName(req.user);

      await recordAuditLog({
        userId: req.user?.id,
        targetType: "toolModel",
        targetId: existingModel.id,
        action: "delete",
        description: `Usuário ${actorName} excluiu o modelo ${existingModel.name}.`,
        beforeData: toAuditModelData(existingModel),
      });
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error, route: "/api/models/:id", action: "delete" }, "Error deleting model");
      res.status(400).json({ message: error.message || "Failed to delete model" });
    }
  });

  // Tools routes
  app.get('/api/tools', isAuthenticated, authorizeRoles('operator', 'admin'), async (_req, res) => {
    try {
      const tools = await storage.getTools();
      res.json(tools);
    } catch (error) {
      logger.error({ err: error, route: "/api/tools" }, "Error fetching tools");
      res.status(500).json({ message: "Failed to fetch tools" });
    }
  });

  app.post('/api/tools', isAuthenticated, authorizeRoles('operator', 'admin'), async (req: any, res) => {
    try {
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
      const actorName = formatUserDisplayName(req.user);

      await recordAuditLog({
        userId: req.user?.id,
        targetType: "tool",
        targetId: tool.id,
        action: "create",
        description: `Usuário ${actorName} registrou a ferramenta ${tool.name} (${tool.code}).`,
        afterData: toAuditToolData(tool),
      });
      res.json(tool);
    } catch (error: any) {
      logger.error({ err: error, route: "/api/tools", action: "create" }, "Error creating tool");
      res.status(400).json({ message: error.message || "Failed to create tool" });
    }
  });

  app.patch('/api/tools/:id', isAuthenticated, authorizeRoles('operator', 'admin'), async (req: any, res) => {
    try {
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
      if (!tool) {
        return res.status(404).json({ message: "Ferramenta não encontrada" });
      }

      const actorName = formatUserDisplayName(req.user);
      const beforeData = toAuditToolData(existingTool);
      const afterData = toAuditToolData(tool);
      const changes = describeChanges(beforeData, afterData, {
        name: "Nome da ferramenta",
        code: "Código",
        quantity: "Quantidade",
        availableQuantity: "Quantidade disponível",
        status: "Status",
        lastCalibrationDate: "Última calibração",
        nextCalibrationDate: "Próxima calibração",
      });

      const toolName = tool.name || existingTool.name;
      const toolCode = tool.code || existingTool.code;
      const description = changes.length
        ? `Usuário ${actorName} alterou a ferramenta ${toolName} (${toolCode}). ${changes.join("; ")}`
        : `Usuário ${actorName} atualizou a ferramenta ${toolName} (${toolCode}).`;

      await recordAuditLog({
        userId: req.user?.id,
        targetType: "tool",
        targetId: tool.id,
        action: "update",
        description,
        beforeData,
        afterData,
      });
      res.json(tool);
    } catch (error: any) {
      logger.error({ err: error, route: "/api/tools/:id", action: "update" }, "Error updating tool");
      res.status(400).json({ message: error.message || "Failed to update tool" });
    }
  });

  app.delete('/api/tools/:id', isAuthenticated, authorizeRoles('operator', 'admin'), async (req: any, res) => {
    try {
      const existingTool = await storage.getTool(req.params.id);
      if (!existingTool) {
        return res.status(404).json({ message: "Ferramenta não encontrada" });
      }

      await storage.deleteTool(req.params.id);
      const actorName = formatUserDisplayName(req.user);

      await recordAuditLog({
        userId: req.user?.id,
        targetType: "tool",
        targetId: existingTool.id,
        action: "delete",
        description: `Usuário ${actorName} excluiu a ferramenta ${existingTool.name} (${existingTool.code}).`,
        beforeData: toAuditToolData(existingTool),
      });
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

  app.post('/api/loans', isAuthenticated, authorizeRoles('operator', 'admin'), async (req: any, res) => {
    try {
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
      const borrower = await storage.getUser(userId);
      if (!borrower) {
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
        if (borrower.email !== userConfirmation.email && borrower.username !== userConfirmation.email) {
          return res.status(400).json({ message: "User confirmation failed: invalid credentials" });
        }

        // Verify password
        const isPasswordValid = await verifyPassword(userConfirmation.password, borrower.password);
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
      const batchId = randomUUID();
      const now = new Date();
      const actorName = formatUserDisplayName(req.user);
      const borrowerName = formatUserDisplayName(borrower);

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
          const updatedTool = await storage.updateTool(tool.id, {
            availableQuantity: tool.availableQuantity - quantityLoaned,
            status: tool.availableQuantity - quantityLoaned === 0 ? 'loaned' : tool.status,
          } as any);

          await recordAuditLog({
            userId: req.user?.id,
            targetType: "tool",
            targetId: tool.id,
            action: "move",
            description: `Usuário ${actorName} registrou empréstimo de ${quantityLoaned}x ${tool.name} (${tool.code}) para ${borrowerName}.`,
            beforeData: toAuditToolData(tool),
            afterData: toAuditToolData(updatedTool ?? undefined),
            metadata: {
              movement: "loan",
              loanId: loan.id,
              quantity: quantityLoaned,
              borrowerId: userId,
              batchId,
            },
          });

          return loan;
        })
      );

      res.json({ loans: createdLoans, batchId });
    } catch (error: any) {
      logger.error({ err: error, route: "/api/loans", action: "create" }, "Error creating loans");
      res.status(400).json({ message: error.message || "Failed to create loans" });
    }
  });

  app.patch('/api/loans/:id/return', isAuthenticated, authorizeRoles('operator', 'admin'), async (req: any, res) => {
    try {
      const loan = await storage.getLoan(req.params.id);
      if (!loan) {
        return res.status(404).json({ message: "Loan not found" });
      }

      // Update loan as returned
      await storage.updateLoan(req.params.id, {
        status: 'returned',
        returnDate: new Date(),
      } as any);

      const borrower = loan.userId ? await storage.getUser(loan.userId) : undefined;

      // Update tool availability
      const tool = await storage.getTool(loan.toolId);
      if (tool) {
        const updatedTool = await storage.updateTool(loan.toolId, {
          availableQuantity: tool.availableQuantity + loan.quantityLoaned,
          status: 'available',
        } as any);

        const actorName = formatUserDisplayName(req.user);
        const borrowerName = borrower
          ? formatUserDisplayName(borrower)
          : loan.userId
            ? `Usuário ${loan.userId}`
            : "Usuário desconhecido";

        await recordAuditLog({
          userId: req.user?.id,
          targetType: "tool",
          targetId: loan.toolId,
          action: "move",
          description: `Usuário ${actorName} registrou devolução de ${loan.quantityLoaned}x ${tool.name} (${tool.code}) de ${borrowerName}.`,
          beforeData: toAuditToolData(tool),
          afterData: toAuditToolData(updatedTool ?? undefined),
          metadata: {
            movement: "return",
            loanId: loan.id,
            quantity: loan.quantityLoaned,
            borrowerId: loan.userId,
          },
        });
      }

      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error, route: "/api/loans/:id/return", action: "return" }, "Error returning loan");
      res.status(400).json({ message: error.message || "Failed to return loan" });
    }
  });

  // Users routes
  app.get('/api/users', isAuthenticated, authorizeRoles('admin'), async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      logger.error({ err: error, route: "/api/users" }, "Error fetching users");
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/users/:id', isAuthenticated, authorizeRoles('admin'), async (req: any, res) => {
    try {
      const existingUser = await storage.getUser(req.params.id);
      if (!existingUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const user = await storage.updateUser(req.params.id, req.body);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const actorName = formatUserDisplayName(req.user);
      const targetName = formatUserDisplayName(user);
      const beforeData = toAuditUserData(existingUser);
      const afterData = toAuditUserData(user);
      const changes = describeChanges(beforeData, afterData, {
        firstName: "Nome",
        lastName: "Sobrenome",
        email: "E-mail",
        department: "Setor",
        role: "Perfil",
        matriculation: "Matrícula",
      });

      const description = changes.length
        ? `Usuário ${actorName} alterou o cadastro de ${targetName}. ${changes.join("; ")}`
        : `Usuário ${actorName} atualizou o cadastro de ${targetName}.`;

      await recordAuditLog({
        userId: req.user?.id,
        targetType: "user",
        targetId: user.id,
        action: "update",
        description,
        beforeData,
        afterData,
      });

      res.json(user);
    } catch (error: any) {
      logger.error({ err: error, route: "/api/users/:id", action: "update" }, "Error updating user");
      res.status(400).json({ message: error.message || "Failed to update user" });
    }
  });

  app.delete('/api/users/:id', isAuthenticated, authorizeRoles('admin'), async (req: any, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      await storage.deleteUser(req.params.id);
      const actorName = formatUserDisplayName(req.user);
      const targetName = formatUserDisplayName(user);

      await recordAuditLog({
        userId: req.user?.id,
        targetType: "user",
        targetId: user.id,
        action: "delete",
        description: `Usuário ${actorName} excluiu o usuário ${targetName}.`,
        beforeData: toAuditUserData(user),
      });
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error, route: "/api/users/:id", action: "delete" }, "Error deleting user");
      res.status(400).json({ message: error.message || "Failed to delete user" });
    }
  });

  app.get('/api/audit/logs', isAuthenticated, authorizeRoles('admin'), async (req, res) => {
    try {
      const { targetType, targetId, userId } = req.query;
      const targetTypeValue =
        typeof targetType === 'string' && (AUDIT_TARGET_TYPES as readonly string[]).includes(targetType)
          ? (targetType as AuditTargetType)
          : undefined;

      const logs = await storage.getAuditLogs({
        targetType: targetTypeValue,
        targetId: typeof targetId === 'string' ? targetId : undefined,
        userId: typeof userId === 'string' ? userId : undefined,
      });

      res.json(logs);
    } catch (error) {
      logger.error({ err: error, route: "/api/audit/logs" }, "Error fetching audit logs");
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
