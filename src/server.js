const app = require('./app');
const connectDB = require('./config/db');
const config = require('./config/env');

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    const server = app.listen(config.port, () => {
      console.log(`=========================================`);
      console.log(` Cobolt Machineries Backend Server       `);
      console.log(` Mode:     ${config.nodeEnv}             `);
      console.log(` Port:     ${config.port}                `);
      console.log(` API Root: http://localhost:${config.port}/api `);
      console.log(` Health:   http://localhost:${config.port}/api/health `);
      console.log(`=========================================`);
    });

    // Graceful shutdown handling
    const shutdown = async (signal) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
