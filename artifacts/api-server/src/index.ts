import app from "./app";
import { logger } from "./lib/logger";

// Export the Express app so Vercel (api/index.js) can import it as a serverless function.
export { app as default };

// Only bind to a port when running as a regular Node.js process (not on Vercel).
if (!process.env["VERCEL"]) {
  const rawPort = process.env["PORT"] ?? "3001";
  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  app.listen(port, () => {
    logger.info({ port }, "Server listening");
  });
}
