/**
 * dnsVerification.ts - DNS TXT domain ownership verification.
 *
 * No Express or Prisma in here on purpose: your route handlers call these functions
 * and do the database reads and writes themselves.
 *
 *   1. createDnsChallenge(domain)  -> store token + expiresAt on the merchant, show the record to the merchant
 *   2. checkDnsTxt(domain, token)  -> called when the merchant presses "Verify"
 */
import { promises as dns } from "node:dns";
import { randomBytes, timingSafeEqual } from "node:crypto";

export const RECORD_PREFIX = "_merchant-verification";
export const VALUE_PREFIX = "merchant-verification=";
export const DNS_CHALLENGE_TTL_MS = 60 * 60 * 1000; // merchant has 60 minutes to publish the record

// Domains nobody can add DNS records to: reject them up front instead of letting the merchant fail later.
const FREE_EMAIL_PROVIDERS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "outlook.com", "hotmail.com", "live.com",
  "icloud.com", "proton.me", "protonmail.com", "aol.com", "rediffmail.com",
]);

export function domainFromEmail(email: string): string {
  const parts = email.trim().toLowerCase().split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error("Invalid email address");
  const domain = parts[1];
  const valid = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain);
  if (!valid) throw new Error("Invalid email domain");
  if (FREE_EMAIL_PROVIDERS.has(domain)) {
    throw new Error("Use an email address on your business domain, not a free email provider");
  }
  return domain;
}

export interface DnsChallenge {
  token: string;
  expiresAt: Date;
  recordType: "TXT";
  recordHost: string; // what most DNS panels want in the "Name" / "Host" box
  recordName: string; // the full name, for panels that want it and for nslookup/dig
  recordValue: string;
}

export function createDnsChallenge(domain: string, now: Date = new Date()): DnsChallenge {
  const token = randomBytes(32).toString("base64url"); // 256 bits, unguessable
  return {
    token,
    expiresAt: new Date(now.getTime() + DNS_CHALLENGE_TTL_MS),
    recordType: "TXT",
    recordHost: RECORD_PREFIX,
    recordName: `${RECORD_PREFIX}.${domain}`,
    recordValue: `${VALUE_PREFIX}${token}`,
  };
}

export function isExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return now.getTime() > expiresAt.getTime();
}

export type DnsCheckStatus = "verified" | "record_not_found" | "value_mismatch" | "lookup_failed";

export interface DnsCheckResult {
  status: DnsCheckStatus;
  message: string; // safe to show to the merchant (and to pass to the AI explainer)
}

export interface TxtResolver {
  resolveTxt(name: string): Promise<string[][]>;
}

const publicResolver = new dns.Resolver({ timeout: 4000, tries: 2 });
publicResolver.setServers(["1.1.1.1", "8.8.8.8"]);

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y); // timingSafeEqual throws on unequal lengths
}

export async function checkDnsTxt(
  domain: string,
  token: string,
  resolver: TxtResolver = publicResolver,
): Promise<DnsCheckResult> {
  const name = `${RECORD_PREFIX}.${domain}`;
  const expected = `${VALUE_PREFIX}${token}`;

  let records: string[][];
  try {
    records = await resolver.resolveTxt(name);
  } catch (err: any) {
    if (err?.code === "ENOTFOUND" || err?.code === "ENODATA") {
      return {
        status: "record_not_found",
        message: `No TXT record found at ${name} yet. DNS changes can take a few minutes to appear.`,
      };
    }
    return {
      status: "lookup_failed",
      message: "The DNS lookup failed or timed out. Please try again in a minute.",
    };
  }

  // Each TXT record arrives as an array of chunks (long values are split), so join the chunks.
  // Tolerate surrounding whitespace and quotes that some DNS panels store literally.
  const values = records.map((chunks) => chunks.join("").trim().replace(/^"(.*)"$/, "$1"));

  if (values.some((v) => safeEqual(v, expected))) {
    return { status: "verified", message: `DNS ownership of ${domain} verified.` };
  }
  return {
    status: "value_mismatch",
    message: `A TXT record exists at ${name}, but its value does not match. Check for typos, extra spaces, or an old code.`,
  };
}