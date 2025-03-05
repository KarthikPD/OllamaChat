import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMessageSchema, insertParamsSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Get all messages
  app.get("/api/messages", async (_req, res) => {
    const messages = await storage.getMessages();
    res.json(messages);
  });

  // Add new message
  app.post("/api/messages", async (req, res) => {
    const result = insertMessageSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const message = await storage.addMessage(result.data);
    res.json(message);
  });

  // Clear messages
  app.post("/api/messages/clear", async (_req, res) => {
    await storage.clearMessages();
    res.json({ success: true });
  });

  // Get model parameters
  app.get("/api/models/:modelId/params", async (req, res) => {
    const modelId = req.params.modelId;
    const params = await storage.getModelParams(modelId);
    if (!params) {
      return res.status(404).json({ error: "Model parameters not found" });
    }
    res.json(params);
  });

  // Set model parameters
  app.post("/api/models/:modelId/params", async (req, res) => {
    const result = insertParamsSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const params = await storage.setModelParams(result.data);
    res.json(params);
  });

  // Proxy Ollama API requests
  app.post("/api/ollama/:endpoint", async (req, res) => {
    try {
      const response = await fetch(`http://localhost:11434/api/${req.params.endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body)
      });

      if (response.headers.get("content-type")?.includes("text/event-stream")) {
        res.setHeader("Content-Type", "text/event-stream");

        // Handle streaming response with proper types
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Failed to get response reader");
        }

        // Stream the response chunks
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      } else {
        const data = await response.json();
        res.json(data);
      }
    } catch (error) {
      console.error("Ollama API Error:", error);
      res.status(500).json({ 
        error: "Failed to connect to Ollama API",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  return httpServer;
}