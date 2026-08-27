import { InfraiRealtime } from "./infrai_realtime.ts";
import { buildEventSchema, notifyLearners } from "./learning_notification.ts";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before running the example");

const event = buildEventSchema.parse({
  kind: "build.completed",
  courseId: "typescript-101",
  buildId: "build-184",
  accountId: "academy-demo",
  status: "failed",
  subscribedToReleases: false,
  diagnostic: "Lesson 4 code sample does not pass type checking",
});

const result = await notifyLearners(new InfraiRealtime(apiKey), event);
console.log(JSON.stringify(result, null, 2));
