
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // === Leaderboard ===
  app.get(api.leaderboard.list.path, async (req, res) => {
    const leaderboard = await storage.getLeaderboard();
    res.json(leaderboard);
  });

  // Admin endpoint (optional, useful for testing)
  app.post(api.leaderboard.create.path, async (req, res) => {
    try {
      const input = api.leaderboard.create.input.parse(req.body);
      const entry = await storage.createLeaderboardEntry(input);
      res.status(201).json(entry);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  // === Users (Registration) ===
  app.post(api.users.create.path, async (req, res) => {
    try {
      const input = api.users.create.input.parse(req.body);
      
      const existing = await storage.getUserByEmail(input.email);
      if (existing) {
        return res.status(409).json({ message: "Email already registered" });
      }

      const user = await storage.createUser(input);
      
      // Also add them to the leaderboard with initial stats!
      await storage.createLeaderboardEntry({
        name: user.name,
        xp: 0,
        level: 1,
        avatar: null
      });

      res.status(201).json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  // === Contact ===
  app.post(api.contact.submit.path, async (req, res) => {
    try {
      const input = api.contact.submit.input.parse(req.body);
      const submission = await storage.submitContact(input);
      res.status(201).json(submission);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  // Seed data on startup
  await storage.seedLeaderboard();

  return httpServer;
}
