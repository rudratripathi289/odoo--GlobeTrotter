import app from './app.js';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// You can add DB verification logic here before starting the server
async function startServer() {
  try {
    // Verify DB connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection established.');

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down server...');
      await prisma.$disconnect();
      server.close(() => {
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to connect to the database:', error);
    process.exit(1);
  }
}

startServer();
