import { db } from "./db";
import { users } from "@shared/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

async function createAdminUser() {
  try {
    console.log("Creating admin user...");
    
    // Hash password for admin
    const hashedPassword = await bcrypt.hash("admin123", 10);
    
    // Get all existing users
    const existingUsers = await db.select().from(users);
    
    if (existingUsers.length === 0) {
      // No users exist, create initial admin
      await db.insert(users).values({
        username: "admin",
        password: hashedPassword,
        firstName: "Administrador",
        lastName: "Sistema",
        email: "admin@ferramentaria.com",
        matriculation: "ADM001",
        department: "TI",
        role: "admin",
      });
      console.log("✅ Admin user created successfully!");
      console.log("Username: admin");
      console.log("Password: admin123");
    } else {
      // Users exist, update them with username/password
      console.log(`Found ${existingUsers.length} existing users. Updating...`);
      
      for (const user of existingUsers) {
        // Generate username from email or ID
        const username = user.email 
          ? user.email.split('@')[0] 
          : `user_${user.id.substring(0, 8)}`;
        
        // Set default password
        const defaultPassword = await bcrypt.hash("senha123", 10);
        
        // Update user with username and password
        await db.update(users)
          .set({
            username: username,
            password: defaultPassword,
            firstName: user.firstName || "Nome",
            lastName: user.lastName || "Sobrenome",
          })
          .where(eq(users.id, user.id));
        
        console.log(`✅ Updated user: ${username}`);
      }
      
      console.log("\n📝 Default password for all users: senha123");
    }
    
    console.log("\n✅ Setup complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
    process.exit(1);
  }
}

createAdminUser();
