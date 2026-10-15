import http from "http";
import express, { type Request, type Response, type NextFunction } from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import { connectDB } from "./mongodb/ConnectDB";
import { env } from "./config/env";
import apiRoutes from "./routes/index";
import { errorHandler } from "./middleware/errorHandler";
import { attachChatSocket } from "./socket/chatSocket";
import { startContributionCycleJob } from "./jobs/contributionCycle.job";

dotenv.config();

try {
  env.mongoUri();
  env.jwtSecret();
} catch (e) {
  console.error(e);
  process.exit(1);
}

const app = express();

app.set("trust proxy", 1);

const normalizeOrigin = (origin: string): string => origin.trim().replace(/\/+$/, "");
const configuredOrigins =
  env.corsOrigin === "*"
    ? true
    : env.corsOrigin
        .split(",")
        .map((s) => normalizeOrigin(s))
        .filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: configuredOrigins,
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/", (_req: Request, res: Response) => {
  res.json({ name: "AjoPay API", status: "ok" });
});

app.use("/api", apiRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: "Not found" });
});

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  errorHandler(err, req, res, next);
});

const PORT = env.port;

const httpServer = http.createServer(app);
attachChatSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

void connectDB();
startContributionCycleJob();
