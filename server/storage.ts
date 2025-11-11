import {
  users,
  tools,
  toolClasses,
  toolModels,
  loans,
  calibrationAlerts,
  auditLogs,
  type User,
  type UpsertUser,
  type Tool,
  type InsertTool,
  type UpdateTool,
  type ToolClass,
  type InsertToolClass,
  type ToolModel,
  type InsertToolModel,
  type Loan,
  type InsertLoan,
  type AuditLog,
  type InsertAuditLog,
  type AuditLogWithActor,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

export type AuditLogFilter = {
  targetType?: AuditLog["targetType"];
  targetId?: string;
  userId?: string;
};

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByQRCode(qrCode: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, data: Partial<UpsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;

  // Tool Class operations
  getToolClasses(): Promise<ToolClass[]>;
  getToolClass(id: string): Promise<ToolClass | undefined>;
  createToolClass(data: InsertToolClass): Promise<ToolClass>;
  updateToolClass(id: string, data: Partial<InsertToolClass>): Promise<ToolClass | undefined>;
  deleteToolClass(id: string): Promise<void>;

  // Tool Model operations
  getToolModels(): Promise<ToolModel[]>;
  getToolModel(id: string): Promise<ToolModel | undefined>;
  createToolModel(data: InsertToolModel): Promise<ToolModel>;
  updateToolModel(id: string, data: Partial<InsertToolModel>): Promise<ToolModel | undefined>;
  deleteToolModel(id: string): Promise<void>;

  // Tool operations
  getTools(): Promise<Tool[]>;
  getTool(id: string): Promise<Tool | undefined>;
  createTool(data: InsertTool): Promise<Tool>;
  updateTool(id: string, data: UpdateTool): Promise<Tool | undefined>;
  deleteTool(id: string): Promise<void>;

  // Loan operations
  getLoans(filter?: { userId?: string; status?: Loan["status"] }): Promise<Loan[]>;
  getLoan(id: string): Promise<Loan | undefined>;
  createLoan(data: InsertLoan): Promise<Loan>;
  updateLoan(id: string, data: Partial<InsertLoan>): Promise<Loan | undefined>;
  getActiveLoans(): Promise<Loan[]>;
  getDashboardStats(options?: { userId?: string }): Promise<any>;

  // Audit log operations
  createAuditLog(entry: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filter?: AuditLogFilter): Promise<AuditLogWithActor[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByQRCode(qrCode: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.qrCode, qrCode));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: string, data: Partial<UpsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Tool Class operations
  async getToolClasses(): Promise<ToolClass[]> {
    return await db.select().from(toolClasses);
  }

  async getToolClass(id: string): Promise<ToolClass | undefined> {
    const [toolClass] = await db.select().from(toolClasses).where(eq(toolClasses.id, id));
    return toolClass;
  }

  async createToolClass(data: InsertToolClass): Promise<ToolClass> {
    const [toolClass] = await db.insert(toolClasses).values(data).returning();
    return toolClass;
  }

  async updateToolClass(id: string, data: Partial<InsertToolClass>): Promise<ToolClass | undefined> {
    const [toolClass] = await db
      .update(toolClasses)
      .set(data)
      .where(eq(toolClasses.id, id))
      .returning();
    return toolClass;
  }

  async deleteToolClass(id: string): Promise<void> {
    await db.delete(toolClasses).where(eq(toolClasses.id, id));
  }

  // Tool Model operations
  async getToolModels(): Promise<ToolModel[]> {
    return await db.select().from(toolModels);
  }

  async getToolModel(id: string): Promise<ToolModel | undefined> {
    const [toolModel] = await db.select().from(toolModels).where(eq(toolModels.id, id));
    return toolModel;
  }

  async createToolModel(data: InsertToolModel): Promise<ToolModel> {
    const [toolModel] = await db.insert(toolModels).values(data).returning();
    return toolModel;
  }

  async updateToolModel(id: string, data: Partial<InsertToolModel>): Promise<ToolModel | undefined> {
    const [toolModel] = await db
      .update(toolModels)
      .set(data)
      .where(eq(toolModels.id, id))
      .returning();
    return toolModel;
  }

  async deleteToolModel(id: string): Promise<void> {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tools)
      .where(eq(tools.modelId, id));

    if (count > 0) {
      throw new Error("Não é possível excluir um modelo vinculado a ferramentas cadastradas.");
    }

    await db.delete(toolModels).where(eq(toolModels.id, id));
  }

  // Tool operations
  async getTools(): Promise<Tool[]> {
    return await db.query.tools.findMany({
      with: {
        class: true,
        model: true,
      },
    });
  }

  async getTool(id: string): Promise<Tool | undefined> {
    return await db.query.tools.findFirst({
      where: eq(tools.id, id),
      with: {
        class: true,
        model: true,
      },
    });
  }

  async createTool(data: InsertTool): Promise<Tool> {
    const payload: InsertTool = {
      ...data,
      availableQuantity: data.availableQuantity ?? data.quantity ?? 0,
    };

    if (typeof payload.quantity === "number" && typeof payload.availableQuantity === "number") {
      if (payload.availableQuantity > payload.quantity) {
        throw new Error("Quantidade disponível não pode ser maior que a quantidade total.");
      }
    }

    const [tool] = await db
      .insert(tools)
      .values(payload as typeof tools.$inferInsert)
      .returning();
    return await this.getTool(tool.id) as Tool;
  }

  async updateTool(id: string, data: UpdateTool): Promise<Tool | undefined> {
    const payload: UpdateTool = { ...data };

    if (typeof payload.lastCalibrationDate === "string") {
      payload.lastCalibrationDate = payload.lastCalibrationDate
        ? new Date(payload.lastCalibrationDate)
        : null;
    }

    if (typeof payload.nextCalibrationDate === "string") {
      payload.nextCalibrationDate = payload.nextCalibrationDate
        ? new Date(payload.nextCalibrationDate)
        : null;
    }

    if (payload.quantity !== undefined || payload.availableQuantity !== undefined) {
      const currentTool = await this.getTool(id);
      if (!currentTool) {
        throw new Error("Ferramenta não encontrada");
      }

      const quantity = payload.quantity ?? currentTool.quantity;
      const available = payload.availableQuantity ?? currentTool.availableQuantity;

      if (available > quantity) {
        throw new Error("Quantidade disponível não pode ser maior que a quantidade total.");
      }
    }

    const [tool] = await db
      .update(tools)
      .set({ ...(payload as Partial<typeof tools.$inferInsert>), updatedAt: new Date() })
      .where(eq(tools.id, id))
      .returning();
    if (!tool) return undefined;
    return await this.getTool(tool.id);
  }

  async deleteTool(id: string): Promise<void> {
    await db.delete(tools).where(eq(tools.id, id));
  }

  // Loan operations
  async getLoans(filter?: { userId?: string; status?: Loan["status"] }): Promise<Loan[]> {
    const whereConditions = [] as any[];

    if (filter?.userId) {
      whereConditions.push(eq(loans.userId, filter.userId));
    }

    if (filter?.status) {
      whereConditions.push(eq(loans.status, filter.status));
    }

    let whereClause: any;
    for (const condition of whereConditions) {
      whereClause = whereClause ? and(whereClause, condition) : condition;
    }

    return await db.query.loans.findMany({
      with: {
        tool: true,
        user: true,
        operator: true,
      },
      where: whereClause,
      orderBy: [desc(loans.loanDate)],
    });
  }

  async getLoan(id: string): Promise<Loan | undefined> {
    return await db.query.loans.findFirst({
      where: eq(loans.id, id),
      with: {
        tool: true,
        user: true,
        operator: true,
      },
    });
  }

  async createLoan(data: InsertLoan): Promise<Loan> {
    const [loan] = await db.insert(loans).values(data).returning();
    return await this.getLoan(loan.id) as Loan;
  }

  async updateLoan(id: string, data: Partial<InsertLoan>): Promise<Loan | undefined> {
    const [loan] = await db
      .update(loans)
      .set(data)
      .where(eq(loans.id, id))
      .returning();
    if (!loan) return undefined;
    return await this.getLoan(loan.id);
  }

  async getActiveLoans(): Promise<Loan[]> {
    return await db.query.loans.findMany({
      where: eq(loans.status, "active"),
      with: {
        tool: true,
        user: true,
        operator: true,
      },
    });
  }

  async getDashboardStats(options?: { userId?: string }): Promise<any> {
    const now = new Date();

    const toolsData = await db.query.tools.findMany({
      with: {
        class: true,
      },
    });

    const loansData = await db.query.loans.findMany({
      where: options?.userId ? eq(loans.userId, options.userId) : undefined,
      orderBy: [desc(loans.loanDate)],
      with: {
        tool: {
          with: {
            class: true,
          },
        },
        user: true,
      },
    });

    const totalTools = options?.userId
      ? new Set(loansData.map((loan) => loan.toolId)).size
      : toolsData.reduce((sum, tool) => sum + (tool.quantity || 0), 0);

    const availableTools = options?.userId
      ? 0
      : toolsData.reduce((sum, tool) => sum + (tool.availableQuantity || 0), 0);

    const loanedTools = options?.userId
      ? loansData.reduce((sum, loan) => sum + (loan.quantityLoaned || 0), 0)
      : totalTools - availableTools;

    const toolMap = new Map<string, typeof toolsData[number]>();
    if (options?.userId) {
      for (const loan of loansData) {
        if (loan.tool) {
          toolMap.set(loan.tool.id, loan.tool as typeof toolsData[number]);
        }
      }
    } else {
      for (const tool of toolsData) {
        toolMap.set(tool.id, tool);
      }
    }

    const relevantTools = Array.from(toolMap.values());
    const tenDaysFromNow = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
    const calibrationTools = relevantTools.filter(
      (tool) =>
        tool.nextCalibrationDate &&
        new Date(tool.nextCalibrationDate) >= now &&
        new Date(tool.nextCalibrationDate) <= tenDaysFromNow,
    );

    const recentLoans = loansData.slice(0, 10);
    const recentLoansFormatted = recentLoans.map((loan) => ({
      id: loan.id,
      toolName: loan.tool?.name || "",
      toolCode: loan.tool?.code || "",
      userName: `${loan.user?.firstName || ""} ${loan.user?.lastName || ""}`.trim() || "Usuário removido",
      loanDate: loan.loanDate?.toISOString() || "",
      status: loan.status,
    }));

    const upcomingCalibrations = calibrationTools.map((tool) => ({
      id: tool.id,
      toolName: tool.name,
      toolCode: tool.code,
      dueDate: tool.nextCalibrationDate!.toISOString(),
      daysRemaining: Math.max(
        0,
        Math.floor((new Date(tool.nextCalibrationDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      ),
    }));

    const usageByDepartmentMap = new Map<
      string,
      { department: string; totalLoans: number; activeLoans: number }
    >();
    const usageByClassMap = new Map<
      string,
      { className: string; totalLoans: number; activeLoans: number }
    >();

    const topToolsMap = new Map<
      string,
      { toolId: string; toolName: string; toolCode: string; usageCount: number; lastLoanDate: string | null }
    >();

    for (const loan of loansData) {
      const quantity = loan.quantityLoaned || 0;
      const department = loan.user?.department?.trim() || "Não informado";
      const departmentEntry = usageByDepartmentMap.get(department) || {
        department,
        totalLoans: 0,
        activeLoans: 0,
      };
      departmentEntry.totalLoans += quantity;
      if (loan.status === "active" || loan.status === "overdue") {
        departmentEntry.activeLoans += quantity;
      }
      usageByDepartmentMap.set(department, departmentEntry);

      const className = loan.tool?.class?.name || "Outros";
      const classEntry = usageByClassMap.get(className) || {
        className,
        totalLoans: 0,
        activeLoans: 0,
      };
      classEntry.totalLoans += quantity;
      if (loan.status === "active" || loan.status === "overdue") {
        classEntry.activeLoans += quantity;
      }
      usageByClassMap.set(className, classEntry);

      if (loan.tool) {
        const existingTool = topToolsMap.get(loan.toolId) || {
          toolId: loan.toolId,
          toolName: loan.tool.name,
          toolCode: loan.tool.code,
          usageCount: 0,
          lastLoanDate: null as string | null,
        };
        existingTool.usageCount += quantity;
        if (loan.loanDate) {
          const isoDate = loan.loanDate.toISOString();
          if (!existingTool.lastLoanDate || new Date(isoDate) > new Date(existingTool.lastLoanDate)) {
            existingTool.lastLoanDate = isoDate;
          }
        }
        topToolsMap.set(loan.toolId, existingTool);
      }
    }

    const usageByDepartment = Array.from(usageByDepartmentMap.values())
      .sort((a, b) => b.totalLoans - a.totalLoans)
      .slice(0, 8);

    const usageByClass = Array.from(usageByClassMap.values())
      .sort((a, b) => b.totalLoans - a.totalLoans)
      .slice(0, 8);

    const topTools = Array.from(topToolsMap.values())
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5);

    const periods: { key: string; label: string; loans: number; returns: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const periodDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${periodDate.getFullYear()}-${periodDate.getMonth()}`;
      const monthLabel = periodDate
        .toLocaleString("pt-BR", { month: "short" })
        .replace(".", "");
      const label = `${monthLabel.charAt(0).toUpperCase()}${monthLabel.slice(1)}/${periodDate.getFullYear()}`;
      periods.push({ key, label, loans: 0, returns: 0 });
    }

    const usageOverTimeMap = new Map(periods.map((period) => [period.key, period]));

    for (const loan of loansData) {
      if (loan.loanDate) {
        const loanDate = loan.loanDate;
        const key = `${loanDate.getFullYear()}-${loanDate.getMonth()}`;
        const entry = usageOverTimeMap.get(key);
        if (entry) {
          entry.loans += loan.quantityLoaned || 0;
        }
      }

      if (loan.returnDate) {
        const returnDate = loan.returnDate;
        const key = `${returnDate.getFullYear()}-${returnDate.getMonth()}`;
        const entry = usageOverTimeMap.get(key);
        if (entry) {
          entry.returns += loan.quantityLoaned || 0;
        }
      }
    }

    const usageOverTime = Array.from(usageOverTimeMap.values());

    const lowAvailabilityTools = options?.userId
      ? []
      : toolsData
          .filter((tool) => {
            if (!tool.quantity) return false;
            const ratio = tool.availableQuantity / tool.quantity;
            return tool.availableQuantity <= 1 || ratio <= 0.2;
          })
          .map((tool) => ({
            toolId: tool.id,
            toolName: tool.name,
            toolCode: tool.code,
            available: tool.availableQuantity,
            total: tool.quantity,
          }))
          .sort((a, b) => a.available / a.total - b.available / b.total)
          .slice(0, 5);

    const overdueLoans = loansData
      .filter((loan) => {
        if (loan.status === "returned") return false;
        if (loan.status === "overdue") return true;
        if (!loan.expectedReturnDate) return false;
        return loan.expectedReturnDate < now && !loan.returnDate;
      })
      .map((loan) => {
        const dueDate = loan.expectedReturnDate;
        const daysOverdue = dueDate
          ? Math.max(0, Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))
          : 0;
        return {
          loanId: loan.id,
          toolName: loan.tool?.name || "",
          toolCode: loan.tool?.code || "",
          userName: `${loan.user?.firstName || ""} ${loan.user?.lastName || ""}`.trim() || "Usuário removido",
          daysOverdue,
        };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue)
      .slice(0, 5);

    return {
      totalTools,
      availableTools,
      loanedTools,
      calibrationAlerts: calibrationTools.length,
      recentLoans: recentLoansFormatted,
      upcomingCalibrations,
      usageByDepartment,
      usageByClass,
      usageOverTime,
      topTools,
      lowAvailabilityTools,
      overdueLoans,
    };
  }

  async createAuditLog(entry: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db
      .insert(auditLogs)
      .values({ ...entry, createdAt: entry.createdAt ?? new Date() })
      .returning();
    return log;
  }

  async getAuditLogs(filter?: AuditLogFilter): Promise<AuditLogWithActor[]> {
    const conditions = [] as any[];

    if (filter?.targetType) {
      conditions.push(eq(auditLogs.targetType, filter.targetType));
    }

    if (filter?.targetId) {
      conditions.push(eq(auditLogs.targetId, filter.targetId));
    }

    if (filter?.userId) {
      conditions.push(eq(auditLogs.userId, filter.userId));
    }

    let whereClause: any;
    for (const condition of conditions) {
      whereClause = whereClause ? and(whereClause, condition) : condition;
    }

    return await db.query.auditLogs.findMany({
      where: whereClause,
      with: {
        actor: {
          columns: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: [desc(auditLogs.createdAt)],
    });
  }
}

export const storage = new DatabaseStorage();
