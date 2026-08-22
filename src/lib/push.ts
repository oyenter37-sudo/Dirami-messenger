import "server-only";

import { createECDH, createHash } from "node:crypto";
import webPush from "web-push";
import { prisma } from "@/lib/prisma";

type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
};

type VapidConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

let cachedVapid: VapidConfig | null | undefined;

function deriveVapidKeys(secret: string) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const privateKey = createHash("sha256")
      .update(`dirami:vapid:v1:${attempt}:${secret}`)
      .digest();
    try {
      const ecdh = createECDH("prime256v1");
      ecdh.setPrivateKey(privateKey);
      return {
        privateKey: privateKey.toString("base64url"),
        publicKey: ecdh
          .getPublicKey(undefined, "uncompressed")
          .toString("base64url"),
      };
    } catch {
      /* Try the next domain-separated digest if the scalar is invalid. */
    }
  }
  return null;
}

export function getVapidConfig(): VapidConfig | null {
  if (cachedVapid !== undefined) return cachedVapid;

  const explicitPublic = process.env.VAPID_PUBLIC_KEY?.trim();
  const explicitPrivate = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject =
    process.env.VAPID_SUBJECT?.trim() || "https://dirami.vercel.app";

  if (explicitPublic && explicitPrivate) {
    cachedVapid = {
      publicKey: explicitPublic,
      privateKey: explicitPrivate,
      subject,
    };
    return cachedVapid;
  }

  const authSecret = process.env.AUTH_SECRET;
  const derived = authSecret ? deriveVapidKeys(authSecret) : null;
  cachedVapid = derived ? { ...derived, subject } : null;
  return cachedVapid;
}

async function sendToSubscriptions(
  subscriptions: Array<{
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }>,
  payload: PushPayload,
) {
  const vapid = getVapidConfig();
  if (!vapid || subscriptions.length === 0) return;

  webPush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  const staleIds: string[] = [];
  const body = JSON.stringify({
    ...payload,
    body: payload.body.slice(0, 180),
    url: payload.url.startsWith("/") ? payload.url : "/chat",
  });

  for (let index = 0; index < subscriptions.length; index += 100) {
    const batch = subscriptions.slice(index, index + 100);
    await Promise.allSettled(
      batch.map(async (subscription) => {
        try {
          await webPush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            body,
            { TTL: 60 * 60, urgency: "high", timeout: 5_000 },
          );
        } catch (error) {
          const statusCode =
            typeof error === "object" && error && "statusCode" in error
              ? Number(error.statusCode)
              : 0;
          if (statusCode === 404 || statusCode === 410) {
            staleIds.push(subscription.id);
          }
        }
      }),
    );
  }

  if (staleIds.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: staleIds } },
    });
  }
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  await sendToSubscriptions(subscriptions, payload);
}

export async function sendPushToAll(payload: PushPayload) {
  const subscriptions = await prisma.pushSubscription.findMany({
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  await sendToSubscriptions(subscriptions, payload);
}
