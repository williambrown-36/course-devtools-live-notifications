import assert from "node:assert/strict";
import test from "node:test";
import { buildEventSchema, decideNotification } from "../src/learning_notification.ts";

test("a failed lesson build sends a diagnostic even when release updates are off", () => {
  const event = buildEventSchema.parse({
    kind: "build.completed",
    courseId: "typescript-101",
    buildId: "build-184",
    accountId: "academy-demo",
    status: "failed",
    subscribedToReleases: false,
    diagnostic: "Lesson 4 code sample does not pass type checking",
  });

  assert.deepEqual(decideNotification(event), {
    action: "publish",
    channel: "course:typescript-101:developers",
    event: "build.diagnostic",
    data: {
      buildId: "build-184",
      diagnostic: "Lesson 4 code sample does not pass type checking",
    },
  });
});

test("a passing build respects the learner release preference", () => {
  const event = buildEventSchema.parse({
    kind: "build.completed",
    courseId: "typescript-101",
    buildId: "build-185",
    accountId: "academy-demo",
    status: "passed",
    subscribedToReleases: false,
  });
  assert.deepEqual(decideNotification(event), {
    action: "skip",
    reason: "release_updates_disabled",
  });
});
