import { db } from "../db";
import {
  users,
  toolClasses,
  toolModels,
  tools,
} from "@shared/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

type SeedUser = {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  matriculation: string;
  department: string;
  role: string;
};

type SeedToolClass = {
  name: string;
  description: string;
};

type SeedToolModel = {
  name: string;
  requiresCalibration: boolean;
  calibrationIntervalDays?: number;
};

type SeedTool = {
  name: string;
  code: string;
  className: string;
  modelName: string;
  quantity: number;
  status: "available" | "loaned" | "calibration" | "out_of_service";
  lastCalibrationDate?: Date;
  nextCalibrationDate?: Date;
};

async function seedUsers(): Promise<void> {
  const passwordHash = await bcrypt.hash("Senha123!", 10);

  const sampleUsers: SeedUser[] = [
    {
      username: "ana.operadora",
      firstName: "Ana",
      lastName: "Souza",
      email: "ana.souza@example.com",
      matriculation: "OPR001",
      department: "Operações",
      role: "operator",
    },
    {
      username: "bruno.tecnico",
      firstName: "Bruno",
      lastName: "Lima",
      email: "bruno.lima@example.com",
      matriculation: "TEC002",
      department: "Manutenção",
      role: "user",
    },
    {
      username: "carla.gestor",
      firstName: "Carla",
      lastName: "Almeida",
      email: "carla.almeida@example.com",
      matriculation: "GST003",
      department: "Gestão",
      role: "admin",
    },
  ];

  for (const user of sampleUsers) {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, user.username))
      .limit(1);

    if (existing.length > 0) {
      console.log(`⚠️  Usuário '${user.username}' já existe. Pulando.`);
      continue;
    }

    await db.insert(users).values({
      ...user,
      password: passwordHash,
    });

    console.log(`✅ Usuário '${user.username}' criado.`);
  }
}

async function seedToolClasses(): Promise<Map<string, string>> {
  const sampleClasses: SeedToolClass[] = [
    {
      name: "Chaves",
      description: "Ferramentas de aperto como chaves de fenda e catracas.",
    },
    {
      name: "Medidores",
      description: "Instrumentos de medição como paquímetros e micrômetros.",
    },
    {
      name: "Corte",
      description: "Ferramentas de corte como serras e lâminas.",
    },
  ];

  const classIdMap = new Map<string, string>();

  for (const toolClass of sampleClasses) {
    const existing = await db
      .select({ id: toolClasses.id })
      .from(toolClasses)
      .where(eq(toolClasses.name, toolClass.name))
      .limit(1);

    if (existing.length > 0) {
      classIdMap.set(toolClass.name, existing[0].id);
      console.log(`⚠️  Classe '${toolClass.name}' já existe. Pulando.`);
      continue;
    }

    const [inserted] = await db
      .insert(toolClasses)
      .values(toolClass)
      .returning({ id: toolClasses.id });

    classIdMap.set(toolClass.name, inserted.id);
    console.log(`✅ Classe '${toolClass.name}' criada.`);
  }

  return classIdMap;
}

async function seedToolModels(): Promise<Map<string, string>> {
  const sampleModels: SeedToolModel[] = [
    {
      name: "Normal",
      requiresCalibration: false,
    },
    {
      name: "Calibração",
      requiresCalibration: true,
      calibrationIntervalDays: 180,
    },
  ];

  const modelIdMap = new Map<string, string>();

  for (const model of sampleModels) {
    const existing = await db
      .select({ id: toolModels.id })
      .from(toolModels)
      .where(eq(toolModels.name, model.name))
      .limit(1);

    if (existing.length > 0) {
      modelIdMap.set(model.name, existing[0].id);
      console.log(`⚠️  Modelo '${model.name}' já existe. Pulando.`);
      continue;
    }

    const [inserted] = await db
      .insert(toolModels)
      .values(model)
      .returning({ id: toolModels.id });

    modelIdMap.set(model.name, inserted.id);
    console.log(`✅ Modelo '${model.name}' criado.`);
  }

  return modelIdMap;
}

async function seedTools(
  classIdMap: Map<string, string>,
  modelIdMap: Map<string, string>,
): Promise<void> {
  const sampleTools: SeedTool[] = [
    {
      name: "Chave de Fenda 5mm",
      code: "TL-CHV-001",
      className: "Chaves",
      modelName: "Normal",
      quantity: 12,
      status: "available",
    },
    {
      name: "Paquímetro Digital 150mm",
      code: "TL-MED-001",
      className: "Medidores",
      modelName: "Calibração",
      quantity: 5,
      status: "available",
      lastCalibrationDate: new Date("2024-01-15"),
      nextCalibrationDate: new Date("2024-07-15"),
    },
    {
      name: "Serra Manual Aço Rápido",
      code: "TL-CRT-001",
      className: "Corte",
      modelName: "Normal",
      quantity: 8,
      status: "available",
    },
  ];

  for (const tool of sampleTools) {
    const existing = await db
      .select({ id: tools.id })
      .from(tools)
      .where(eq(tools.code, tool.code))
      .limit(1);

    if (existing.length > 0) {
      console.log(`⚠️  Ferramenta '${tool.code}' já existe. Pulando.`);
      continue;
    }

    const classId = classIdMap.get(tool.className);
    const modelId = modelIdMap.get(tool.modelName);

    if (!classId) {
      console.warn(
        `❌ Classe '${tool.className}' não encontrada. Verifique os dados de seed.`,
      );
      continue;
    }

    if (!modelId) {
      console.warn(
        `❌ Modelo '${tool.modelName}' não encontrado. Verifique os dados de seed.`,
      );
      continue;
    }

    await db.insert(tools).values({
      name: tool.name,
      code: tool.code,
      classId,
      modelId,
      quantity: tool.quantity,
      availableQuantity: tool.quantity,
      status: tool.status,
      lastCalibrationDate: tool.lastCalibrationDate,
      nextCalibrationDate: tool.nextCalibrationDate,
    });

    console.log(`✅ Ferramenta '${tool.code}' criada.`);
  }
}

async function main() {
  try {
    console.log("📦 Iniciando seed do banco de dados...");

    await seedUsers();
    const classIdMap = await seedToolClasses();
    const modelIdMap = await seedToolModels();
    await seedTools(classIdMap, modelIdMap);

    console.log("🎉 Seed concluído com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar o seed:", error);
    process.exit(1);
  }
}

void main();
