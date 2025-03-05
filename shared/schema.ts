import { pgTable, text, serial, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  modelId: text("model_id").notNull(),
  provider: text("provider").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow()
});

export const modelParams = pgTable("model_params", {
  id: serial("id").primaryKey(),
  modelId: text("model_id").notNull().unique(),
  provider: text("provider").notNull(),
  temperature: integer("temperature").notNull().default(1),
  maxTokens: integer("max_tokens"),
  systemPrompt: text("system_prompt"),
  parameters: jsonb("parameters").$type<Record<string, any>>()
});

export const insertMessageSchema = createInsertSchema(chatMessages).omit({ 
  id: true,
  timestamp: true 
});

export const insertParamsSchema = createInsertSchema(modelParams).omit({ 
  id: true 
});

export type Message = typeof chatMessages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type ModelParams = typeof modelParams.$inferSelect;
export type InsertModelParams = z.infer<typeof insertParamsSchema>;

export const messageRoleSchema = z.enum(["user", "assistant", "system"]);
export type MessageRole = z.infer<typeof messageRoleSchema>;

export const providerSchema = z.enum(["ollama", "lmstudio", "mistral", "openrouter"]);
export type Provider = z.infer<typeof providerSchema>;