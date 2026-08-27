import { z } from "zod";
import type { InfraiRealtime, PublishReceipt } from "./infrai_realtime.ts";

export const buildEventSchema = z.object({
  kind: z.literal("build.completed"),
  courseId: z.string().min(1),
  buildId: z.string().min(1),
  accountId: z.string().min(1),
  status: z.enum(["passed", "failed"]),
  subscribedToReleases: z.boolean(),
  diagnostic: z.string().min(1).optional(),
}).superRefine((event, context) => {
  if (event.status === "failed" && !event.diagnostic) {
    context.addIssue({
      code: "custom",
      path: ["diagnostic"],
      message: "A failed build needs a learner-facing diagnostic",
    });
  }
});

export type BuildEvent = z.infer<typeof buildEventSchema>;

export type NotificationDecision =
  | { action: "skip"; reason: "release_updates_disabled" }
  | { action: "publish"; channel: string; event: "release.ready" | "build.diagnostic"; data: Record<string, string> };

export function decideNotification(input: BuildEvent): NotificationDecision {
  if (input.status === "passed" && !input.subscribedToReleases) {
    return { action: "skip", reason: "release_updates_disabled" };
  }
  const channel = `course:${input.courseId}:developers`;
  if (input.status === "failed") {
    return {
      action: "publish",
      channel,
      event: "build.diagnostic",
      data: { buildId: input.buildId, diagnostic: input.diagnostic as string },
    };
  }
  return {
    action: "publish",
    channel,
    event: "release.ready",
    data: { buildId: input.buildId, courseId: input.courseId },
  };
}

export async function notifyLearners(
  realtime: InfraiRealtime,
  input: BuildEvent,
): Promise<{ outcome: "skipped"; reason: string } | { outcome: "published"; receipt: PublishReceipt }> {
  const decision = decideNotification(input);
  if (decision.action === "skip") return { outcome: "skipped", reason: decision.reason };

  const presence = await realtime.getPresence(decision.channel);
  const online = presence.count ?? presence.members?.length ?? 0;
  if (online === 0) return { outcome: "skipped", reason: "no_online_learners" };

  const receipt = await realtime.publish({
    channel: decision.channel,
    event: decision.event,
    data: decision.data,
    account_id: input.accountId,
  });
  return { outcome: "published", receipt };
}
