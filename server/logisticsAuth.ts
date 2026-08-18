import { SignJWT, jwtVerify } from "jose";
import { parse } from "cookie";
import { TRPCError } from "@trpc/server";
import type { Request, Response } from "express";
import { getSessionCookieOptions } from "./_core/cookies";
import type { AccessLevel } from "./supabase";

export const PERFORMANCE_SESSION_COOKIE = "controle_logistico_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8;

export type PerformanceSession = {
  user: string;
  name: string;
  level: AccessLevel;
};

function sessionSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("A chave de sessão do sistema não está configurada.");
  return new TextEncoder().encode(secret);
}

export async function writePerformanceSession(
  req: Request,
  res: Response,
  session: PerformanceSession,
) {
  const token = await new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(sessionSecret());

  res.cookie(PERFORMANCE_SESSION_COOKIE, token, {
    ...getSessionCookieOptions(req),
    maxAge: SESSION_DURATION_SECONDS * 1_000,
  });
}

export function clearPerformanceSession(req: Request, res: Response) {
  res.clearCookie(PERFORMANCE_SESSION_COOKIE, {
    ...getSessionCookieOptions(req),
    maxAge: -1,
  });
}

export async function getPerformanceSession(req: Request): Promise<PerformanceSession | null> {
  const token = parse(req.headers.cookie ?? "")[PERFORMANCE_SESSION_COOKIE];
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    const level = Number(payload.level);
    const user = typeof payload.user === "string" ? payload.user : "";
    const name = typeof payload.name === "string" ? payload.name : "";

    if (!user || !name || (level !== 1 && level !== 2)) return null;
    return { user, name, level: level as AccessLevel };
  } catch {
    return null;
  }
}

export async function requirePerformanceSession(req: Request) {
  const session = await getPerformanceSession(req);
  if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "Faça login para continuar." });
  return session;
}

export function requireLevelOne(session: PerformanceSession) {
  if (session.level !== 1) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Esta função é exclusiva para usuários de nível 1." });
  }
}
