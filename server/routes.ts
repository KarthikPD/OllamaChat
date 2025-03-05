import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMessageSchema, insertParamsSchema } from "@shared/schema";
import { z } from "zod";

let ollamaHost = "http://localhost:11434";

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

  // Check Ollama connection and set host
  app.post("/api/ollama/check-connection", async (req, res) => {
    const { hostUrl } = req.body;
    try {
      const response = await fetch(`${hostUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Ollama API returned ${response.status}`);
      }
      ollamaHost = hostUrl; // Update the host URL if connection successful
      res.json({ success: true });
    } catch (error) {
      console.error("Ollama API Error:", error);
      res.status(500).json({ 
        error: "Failed to connect to Ollama API",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // List Ollama models
  app.get("/api/ollama/models", async (_req, res) => {
    try {
      const response = await fetch(`${ollamaHost}/api/tags`);
      if (!response.ok) {
        throw new Error(`Ollama API returned ${response.status}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Ollama API Error:", error);
      res.status(500).json({ 
        error: "Failed to connect to Ollama API",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Generate completion from Ollama
  app.post("/api/ollama/generate", async (req, res) => {
    try {
      const response = await fetch(`${ollamaHost}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body)
      });

      if (!response.ok) {
        throw new Error(`Ollama API returned ${response.status}`);
      }

      if (response.headers.get("content-type")?.includes("text/event-stream")) {
        res.setHeader("Content-Type", "text/event-stream");

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Failed to get response reader");
        }

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