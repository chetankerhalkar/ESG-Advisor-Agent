import { Router } from "express";
import jwt from "jsonwebtoken";
import { ENV } from "./_core/env";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import * as db from "./db";

/**
 * Simple authentication system with hardcoded credentials
 * No OAuth required - perfect for local development and demos
 */

// Hardcoded users (in production, use a database)
const USERS = [
  {
    id: 1,
    openId: "demo-user-1",
    email: "admin@esg-agent.com",
    password: "admin123",
    name: "Admin User",
    role: "admin" as const,
  },
  {
    id: 2,
    openId: "demo-user-2",
    email: "user@esg-agent.com",
    password: "user123",
    name: "Demo User",
    role: "user" as const,
  },
];

export const simpleAuthRouter = Router();

// Login endpoint
simpleAuthRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    // Find user
    const user = USERS.find(
      (u) => u.email === email && u.password === password
    );

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Upsert user in database
    await db.upsertUser({
      openId: user.openId,
      name: user.name,
      email: user.email,
      role: user.role,
      loginMethod: "simple",
      lastSignedIn: new Date(),
    });

    // Create JWT token
    const token = jwt.sign(
      {
        openId: user.openId,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      ENV.jwtSecret,
      { expiresIn: "7d" }
    );

    // Set cookie
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, token, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.json({
      success: true,
      user: {
        openId: user.openId,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("[Simple Auth] Login error:", error);
    return res.status(500).json({ error: "Login failed" });
  }
});

// Logout endpoint
simpleAuthRouter.post("/logout", (req, res) => {
  const cookieOptions = getSessionCookieOptions(req);
  res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
  return res.json({ success: true });
});

// Get current user endpoint
simpleAuthRouter.get("/me", async (req, res) => {
  try {
    const token = req.cookies[COOKIE_NAME];

    if (!token) {
      return res.json({ user: null });
    }

    // Verify token
    const decoded = jwt.verify(token, ENV.jwtSecret) as any;

    // Get user from database
    const user = await db.getUserByOpenId(decoded.openId);

    if (!user) {
      return res.json({ user: null });
    }

    return res.json({
      user: {
        id: user.id,
        openId: user.openId,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("[Simple Auth] Get user error:", error);
    return res.json({ user: null });
  }
});

export default simpleAuthRouter;
