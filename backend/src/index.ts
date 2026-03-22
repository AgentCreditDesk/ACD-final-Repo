import express from "express";
import cors from "cors";
import { config } from "./config";
import { logger } from "./utils/logger";
import loanRoutes from "./routes/loans";
import borrowerRoutes from "./routes/borrowers";
import treasuryRoutes from "./routes/treasury";
import agentApiRoutes from "./routes/agent-api";
import { monitorActiveLoans } from "./services/chain.service";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  logger.debug("Request", { method: req.method, path: req.path });
  next();
});

// Routes
app.use("/loans", loanRoutes);
app.use("/borrowers", borrowerRoutes);
app.use("/treasury", treasuryRoutes);
app.use("/agent-api", agentApiRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start monitoring loop (every 30 seconds)
let monitoringInterval: NodeJS.Timeout | null = null;

function startMonitoring() {
  if (config.LOAN_VAULT_FACTORY_ADDRESS && config.TREASURY_PRIVATE_KEY) {
    monitoringInterval = setInterval(async () => {
      try {
        await monitorActiveLoans();
      } catch (error) {
        logger.error("Monitoring loop error", { error: String(error) });
      }
    }, 30_000);
    logger.info("Loan monitoring loop started (30s interval)");
  } else {
    logger.warn("Monitoring disabled: missing contract addresses or treasury key");
  }
}

// Start server
app.listen(config.PORT, () => {
  logger.info(`ACD Backend running on port ${config.PORT}`);
  logger.info("Endpoints:", {
    loans: "/loans",
    borrowers: "/borrowers",
    treasury: "/treasury",
    agentApi: "/agent-api",
    health: "/health",
  });
  startMonitoring();
});

export default app;
