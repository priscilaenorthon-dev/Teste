import {
  users,
  tools,
  toolClasses,
  toolModels,
  loans,
  calibrationAlerts,
  type User,
  type UpsertUser,
  type Tool,
  type InsertTool,
  type ToolClass,
  type InsertToolClass,
  type ToolModel,
  type InsertToolModel,
  type Loan,
  type InsertLoan,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql, isNotNull } from "drizzle-orm";
import { subDays, startOfDay, format } from "date-fns";

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
  updateTool(id: string, data: Partial<InsertTool>): Promise<Tool | undefined>;
  deleteTool(id: string): Promise<void>;

  // Loan operations
  getLoans(): Promise<Loan[]>;
  getLoan(id: string): Promise<Loan | undefined>;
  createLoan(data: InsertLoan): Promise<Loan>;
  updateLoan(id: string, data: Partial<InsertLoan>): Promise<Loan | undefined>;
  getActiveLoans(): Promise<Loan[]>;
  getDashboardStats(): Promise<any>;
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
    const [tool] = await db.insert(tools).values(data).returning();
    return await this.getTool(tool.id) as Tool;
  }

  async updateTool(id: string, data: Partial<InsertTool>): Promise<Tool | undefined> {
    const [tool] = await db
      .update(tools)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tools.id, id))
      .returning();
    if (!tool) return undefined;
    return await this.getTool(tool.id);
  }

  async deleteTool(id: string): Promise<void> {
    await db.delete(tools).where(eq(tools.id, id));
  }

  // Loan operations
  async getLoans(): Promise<Loan[]> {
    return await db.query.loans.findMany({
      with: {
        tool: true,
        user: true,
        operator: true,
      },
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

  async getDashboardStats(): Promise<any> {
    const allTools = await db.select().from(tools);
    const activeLoans = await this.getActiveLoans();

    const totalTools = allTools.reduce((sum, tool) => sum + tool.quantity, 0);
    const availableTools = allTools.reduce((sum, tool) => sum + tool.availableQuantity, 0);
    const loanedTools = totalTools - availableTools;
    const availabilityRate =
      totalTools > 0 ? Math.round((availableTools / totalTools) * 1000) / 10 : 0;

    const statusBreakdownMap = new Map<string, number>();
    for (const tool of allTools) {
      const statusKey = tool.status || "unknown";
      const currentQuantity = statusBreakdownMap.get(statusKey) || 0;
      statusBreakdownMap.set(statusKey, currentQuantity + tool.quantity);
    }

    const statusBreakdown = Array.from(statusBreakdownMap.entries()).map(
      ([status, quantity]) => ({
        status,
        quantity,
        percentage:
          totalTools > 0
            ? Math.round((quantity / totalTools) * 1000) / 10
            : 0,
      })
    );

    // Get calibration alerts (tools needing calibration within 10 days)
    const now = new Date();
    const tenDaysFromNow = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

    const calibrationTools = allTools.filter(
      (tool) =>
        tool.nextCalibrationDate &&
        new Date(tool.nextCalibrationDate) >= now &&
        new Date(tool.nextCalibrationDate) <= tenDaysFromNow
    );

    const overdueCalibrations = allTools
      .filter(
        (tool) =>
          tool.nextCalibrationDate && new Date(tool.nextCalibrationDate) < now
      )
      .map((tool) => ({
        id: tool.id,
        toolName: tool.name,
        toolCode: tool.code,
        dueDate: tool.nextCalibrationDate!.toISOString(),
        daysOverdue: Math.abs(
          Math.ceil(
            (startOfDay(now).getTime() -
              startOfDay(new Date(tool.nextCalibrationDate!)).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        ),
      }));

    // Recent loans
    const recentLoans = await db.query.loans.findMany({
      limit: 10,
      orderBy: [desc(loans.loanDate)],
      with: {
        tool: true,
        user: true,
      },
    });

    const recentLoansFormatted = recentLoans.map((loan: any) => ({
      id: loan.id,
      toolName: loan.tool?.name || "",
      toolCode: loan.tool?.code || "",
      userName: `${loan.user?.firstName || ""} ${loan.user?.lastName || ""}`.trim(),
      loanDate: loan.loanDate?.toISOString() || "",
      status: loan.status,
    }));

    const upcomingCalibrations = calibrationTools.map((tool) => ({
      id: tool.id,
      toolName: tool.name,
      toolCode: tool.code,
      dueDate: tool.nextCalibrationDate!.toISOString(),
      daysRemaining: Math.floor(
        (new Date(tool.nextCalibrationDate!).getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24)
      ),
    }));

    const activityWindowDays = 14;
    const activityStart = startOfDay(subDays(now, activityWindowDays - 1));

    const loanActivityRecords = await db
      .select({ loanDate: loans.loanDate, quantityLoaned: loans.quantityLoaned })
      .from(loans)
      .where(gte(loans.loanDate, activityStart));

    const returnActivityRecords = await db
      .select({
        returnDate: loans.returnDate,
        quantityLoaned: loans.quantityLoaned,
      })
      .from(loans)
      .where(and(isNotNull(loans.returnDate), gte(loans.returnDate, activityStart)));

    const loanCountByDate = new Map<string, number>();
    for (const record of loanActivityRecords) {
      if (!record.loanDate) continue;
      const key = format(record.loanDate, "yyyy-MM-dd");
      loanCountByDate.set(
        key,
        (loanCountByDate.get(key) || 0) + (record.quantityLoaned || 0)
      );
    }

    const returnCountByDate = new Map<string, number>();
    for (const record of returnActivityRecords) {
      if (!record.returnDate) continue;
      const key = format(record.returnDate, "yyyy-MM-dd");
      returnCountByDate.set(
        key,
        (returnCountByDate.get(key) || 0) + (record.quantityLoaned || 0)
      );
    }

    const loanActivity = [] as Array<{ date: string; loans: number; returns: number }>;
    for (let i = 0; i < activityWindowDays; i++) {
      const day = new Date(activityStart);
      day.setDate(activityStart.getDate() + i);
      const key = format(day, "yyyy-MM-dd");
      loanActivity.push({
        date: key,
        loans: loanCountByDate.get(key) || 0,
        returns: returnCountByDate.get(key) || 0,
      });
    }

    const activeLoanLeadersMap = new Map<
      string,
      {
        toolId: string;
        toolName: string;
        toolCode: string;
        quantityLoaned: number;
      }
    >();

    for (const loan of activeLoans as any[]) {
      if (!loan.tool) continue;
      const existing =
        activeLoanLeadersMap.get(loan.tool.id) ||
        ({
          toolId: loan.tool.id,
          toolName: loan.tool.name,
          toolCode: loan.tool.code,
          quantityLoaned: 0,
        } as const);

      activeLoanLeadersMap.set(loan.tool.id, {
        ...existing,
        quantityLoaned: existing.quantityLoaned + (loan.quantityLoaned || 0),
      });
    }

    const activeLoanLeaders = Array.from(activeLoanLeadersMap.values())
      .sort((a, b) => b.quantityLoaned - a.quantityLoaned)
      .slice(0, 5);

    return {
      totalTools,
      availableTools,
      loanedTools,
      calibrationAlerts: calibrationTools.length,
      availabilityRate,
      statusBreakdown,
      recentLoans: recentLoansFormatted,
      upcomingCalibrations,
      overdueCalibrations,
      loanActivity,
      activeLoanLeaders,
    };
  }
}

export const storage = new DatabaseStorage();
