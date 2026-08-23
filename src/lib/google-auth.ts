import "server-only";

import { createRemoteJWKSet, jwtVerify } from "jose";
import { GOOGLE_CLIENT_ID } from "@/lib/google-config";

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g;

export type VerifiedGoogleIdentity = {
  subject: string;
  email: string;
  name: string;
  displayName: string;
  pictureUrl: string;
};

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(CONTROL_CHARACTERS, "").trim().slice(0, maxLength);
}

function cleanPictureUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 2048) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export async function verifyGoogleCredential(
  credential: string,
): Promise<VerifiedGoogleIdentity | null> {
  if (!credential || credential.length > 10_000) return null;

  try {
    const { payload } = await jwtVerify(credential, GOOGLE_JWKS, {
      audience: GOOGLE_CLIENT_ID,
      issuer: GOOGLE_ISSUERS,
      algorithms: ["RS256"],
    });

    const subject = cleanText(payload.sub, 255);
    const email = cleanText(payload.email, 320).toLowerCase();
    const emailVerified = payload.email_verified === true;
    if (!subject || !email || !emailVerified) return null;

    const name = cleanText(payload.name, 120);
    return {
      subject,
      email,
      name,
      displayName: name.slice(0, 40),
      pictureUrl: cleanPictureUrl(payload.picture),
    };
  } catch {
    return null;
  }
}
