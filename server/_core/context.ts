import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import jwt from "jsonwebtoken";
import { ENV } from "./env";
import { COOKIE_NAME } from "@shared/const";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Get token from cookie
    const token = opts.req.cookies?.[COOKIE_NAME];

    if (token) {
      // Verify JWT token
      const decoded = jwt.verify(token, ENV.jwtSecret) as any;

      // Get user from database
      if (decoded.openId) {
        const foundUser = await db.getUserByOpenId(decoded.openId);
        user = foundUser || null;
      }
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    console.error("[Context] Auth error:", error);
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
