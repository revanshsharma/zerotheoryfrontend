
import { db } from "./db";
import {
  users, leaderboard, contactSubmissions,
  type InsertUser, type User,
  type InsertLeaderboardEntry, type LeaderboardEntry,
  type InsertContactSubmission, type ContactSubmission
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;

  // Leaderboard
  getLeaderboard(): Promise<LeaderboardEntry[]>;
  createLeaderboardEntry(entry: InsertLeaderboardEntry): Promise<LeaderboardEntry>;
  seedLeaderboard(): Promise<void>;

  // Contact
  submitContact(contact: InsertContactSubmission): Promise<ContactSubmission>;
}

export class DatabaseStorage implements IStorage {
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    return await db.select().from(leaderboard).orderBy(desc(leaderboard.xp));
  }

  async createLeaderboardEntry(entry: InsertLeaderboardEntry): Promise<LeaderboardEntry> {
    const [newEntry] = await db.insert(leaderboard).values(entry).returning();
    return newEntry;
  }

  async seedLeaderboard(): Promise<void> {
    const existing = await this.getLeaderboard();
    if (existing.length === 0) {
      const initialData: InsertLeaderboardEntry[] = [
        { name: "CyberNinja", xp: 12500, level: 45, avatar: null },
        { name: "CodeMaster99", xp: 11200, level: 42, avatar: null },
        { name: "PixelPerfect", xp: 9800, level: 38, avatar: null },
        { name: "DevOpsDave", xp: 8500, level: 35, avatar: null },
        { name: "AI_Wizard", xp: 7200, level: 30, avatar: null },
        { name: "Rustacean", xp: 6000, level: 25, avatar: null },
        { name: "FrontEndFan", xp: 4500, level: 20, avatar: null },
        { name: "BugHunter", xp: 3200, level: 15, avatar: null },
        { name: "NewbieOne", xp: 1500, level: 5, avatar: null },
        { name: "ZeroHero", xp: 500, level: 2, avatar: null },
      ];
      await db.insert(leaderboard).values(initialData);
    }
  }

  async submitContact(contact: InsertContactSubmission): Promise<ContactSubmission> {
    const [submission] = await db.insert(contactSubmissions).values(contact).returning();
    return submission;
  }
}

export const storage = new DatabaseStorage();
