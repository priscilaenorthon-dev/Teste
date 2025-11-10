import { db } from "../db";
import { users } from "@shared/schema";
import { nanoid } from "nanoid";
import { isNull, eq } from "drizzle-orm";

async function generateUniqueQRCode(): Promise<string> {
  let attempts = 0;
  while (attempts < 10) {
    const qrCode = nanoid(16);
    const existing = await db.select().from(users).where(eq(users.qrCode, qrCode));
    if (existing.length === 0) {
      return qrCode;
    }
    attempts++;
  }
  throw new Error("Não foi possível gerar QR Code único após 10 tentativas");
}

async function generateQRCodes() {
  console.log("Gerando QR Codes para usuários...");
  
  // Get all users without QR codes
  const usersWithoutQR = await db
    .select()
    .from(users)
    .where(isNull(users.qrCode));

  console.log(`Encontrados ${usersWithoutQR.length} usuários sem QR Code`);

  for (const user of usersWithoutQR) {
    const qrCode = await generateUniqueQRCode();
    await db
      .update(users)
      .set({ qrCode })
      .where(eq(users.id, user.id));
    
    console.log(`✓ QR Code gerado para ${user.username}: ${qrCode}`);
  }

  console.log("Concluído!");
  process.exit(0);
}

generateQRCodes().catch((error) => {
  console.error("Erro ao gerar QR Codes:", error);
  process.exit(1);
});
