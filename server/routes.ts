import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { hashPassword, comparePassword, signToken, requireAuth, requireAdmin } from "./auth";
import { insertUserSchema, PLANS, type PlanId } from "@shared/schema";
import { createPaypalOrder, capturePaypalOrder, loadPaypalDefault } from "./paypal";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // ==================== AUTHENTICATION ROUTES ====================
  
  // Signup
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(validatedData.password);
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
        plan: "demo",
      });

      // Create JWT token
      const token = signToken({
        userId: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
      });

      // Set cookie
      res.cookie("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("Signup error:", error);
      res.status(500).json({ error: "Signup failed" });
    }
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const isValidPassword = await comparePassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Create JWT token
      const token = signToken({
        userId: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
      });

      // Set cookie
      res.cookie("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("auth_token");
    res.json({ success: true });
  });

  // Get current session
  app.get("/api/auth/session", requireAuth, async (req, res) => {
    const { password: _, ...userWithoutPassword } = req.user!;
    res.json({ user: userWithoutPassword });
  });

  // ==================== SPORT SELECTION ====================
  
  app.post("/api/select-sport", requireAuth, async (req, res) => {
    try {
      const { sport } = req.body;
      const user = req.user!;

      if (!sport || !["basketball", "football", "baseball"].includes(sport)) {
        return res.status(400).json({ error: "Invalid sport" });
      }

      // Check if user can change sport
      const plan = PLANS[user.plan as PlanId];
      if (plan.sports === 1 && user.selectedSport && user.selectedSport !== sport) {
        return res.status(403).json({ 
          error: "Your plan only allows one sport. Upgrade to change sports." 
        });
      }

      // Update user's selected sport
      const updatedUser = await storage.updateUser(user.id, {
        selectedSport: sport,
      });

      if (!updatedUser) {
        return res.status(500).json({ error: "Failed to update sport" });
      }

      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Sport selection error:", error);
      res.status(500).json({ error: "Sport selection failed" });
    }
  });

  // ==================== PAYPAL ROUTES (from blueprint) ====================
  
  app.get("/paypal/setup", async (req, res) => {
    await loadPaypalDefault(req, res);
  });

  app.post("/paypal/order", async (req, res) => {
    await createPaypalOrder(req, res);
  });

  app.post("/paypal/order/:orderID/capture", async (req, res) => {
    await capturePaypalOrder(req, res);
  });

  // Payment success handler
  app.post("/api/payment/success", requireAuth, async (req, res) => {
    try {
      const { orderId, planId } = req.body;
      const user = req.user!;

      if (!planId || !PLANS[planId as PlanId]) {
        return res.status(400).json({ error: "Invalid plan" });
      }

      const plan = PLANS[planId as PlanId];

      // Log transaction
      await storage.createTransaction({
        userId: user.id,
        paypalOrderId: orderId,
        plan: planId,
        amount: plan.price.toString(),
        currency: "USD",
        status: "completed",
      });

      // Update user's plan
      const updatedUser = await storage.updateUser(user.id, {
        plan: planId,
        subscriptionStatus: "active",
      });

      if (!updatedUser) {
        return res.status(500).json({ error: "Failed to update plan" });
      }

      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Payment success error:", error);
      res.status(500).json({ error: "Payment processing failed" });
    }
  });

  // ==================== ADMIN ROUTES ====================
  
  // Get all users (admin only)
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const usersWithoutPasswords = allUsers.map(({ password, ...user }) => user);
      res.json({ users: usersWithoutPasswords });
    } catch (error) {
      console.error("Admin users error:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Update user plan (admin only)
  app.post("/api/admin/users/:userId/plan", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { plan, reason } = req.body;

      if (!plan || !PLANS[plan as PlanId]) {
        return res.status(400).json({ error: "Invalid plan" });
      }

      const updatedUser = await storage.updateUser(userId, { plan });
      
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Log admin action
      await storage.logAdminAction({
        userId,
        adminEmail: req.user!.email,
        action: "plan_change",
        details: `Changed plan to ${plan}. Reason: ${reason || "N/A"}`,
      });

      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Admin plan update error:", error);
      res.status(500).json({ error: "Failed to update plan" });
    }
  });

  // Ban/unban user (admin only)
  app.post("/api/admin/users/:userId/ban", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { reason } = req.body;

      const updatedUser = await storage.updateUser(userId, {
        subscriptionStatus: "banned",
      });

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      await storage.logAdminAction({
        userId,
        adminEmail: req.user!.email,
        action: "ban",
        details: `User banned. Reason: ${reason || "License violation"}`,
      });

      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Admin ban error:", error);
      res.status(500).json({ error: "Failed to ban user" });
    }
  });

  // Grant free months (admin only)
  app.post("/api/admin/users/:userId/free-months", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { months, reason } = req.body;

      if (!months || months < 1) {
        return res.status(400).json({ error: "Invalid number of months" });
      }

      // Log the free months grant
      await storage.logAdminAction({
        userId,
        adminEmail: req.user!.email,
        action: "free_months",
        details: `Granted ${months} free months. Reason: ${reason || "N/A"}`,
      });

      res.json({ success: true, message: `Granted ${months} free months` });
    } catch (error) {
      console.error("Admin free months error:", error);
      res.status(500).json({ error: "Failed to grant free months" });
    }
  });

  // Get admin actions for a user
  app.get("/api/admin/users/:userId/actions", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const actions = await storage.getAdminActions(userId);
      res.json({ actions });
    } catch (error) {
      console.error("Admin actions error:", error);
      res.status(500).json({ error: "Failed to fetch admin actions" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
