import { createServer } from "node:http";
import { z } from "zod";
import { InfraiError, InfraiRealtime } from "./infrai_realtime.ts";
import { buildEventSchema, notifyLearners } from "./learning_notification.ts";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");
const realtime = new InfraiRealtime(apiKey);
const port = Number(process.env.PORT ?? 3000);

async function readJson(request: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = createServer(async (request, response) => {
  response.setHeader("Content-Type", "application/json");
  if (request.method !== "POST" || request.url !== "/build-events") {
    response.writeHead(404).end(JSON.stringify({ error: "Route not found" }));
    return;
  }
  try {
    const event = buildEventSchema.parse(await readJson(request));
    const result = await notifyLearners(realtime, event);
    response.writeHead(200).end(JSON.stringify(result));
  } catch (error) {
    if (error instanceof z.ZodError) {
      response.writeHead(400).end(JSON.stringify({ error: "Invalid build event", issues: error.issues }));
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      response.writeHead(status).end(JSON.stringify({ error: error.message, details: error.details }));
      return;
    }
    response.writeHead(500).end(JSON.stringify({ error: "Could not process build event" }));
  }
});

server.listen(port, () => console.log(`Notification service listening on http://localhost:${port}`));
