import { Message, InsertMessage, ModelParams, InsertModelParams } from "@shared/schema";

export interface IStorage {
  getMessages(): Promise<Message[]>;
  addMessage(message: InsertMessage): Promise<Message>;
  getModelParams(modelId: string): Promise<ModelParams | undefined>;
  setModelParams(params: InsertModelParams): Promise<ModelParams>;
  clearMessages(): Promise<void>;
}

export class MemStorage implements IStorage {
  private messages: Map<number, Message>;
  private modelParams: Map<string, ModelParams>;
  private currentId: number;

  constructor() {
    this.messages = new Map();
    this.modelParams = new Map();
    this.currentId = 1;
  }

  async getMessages(): Promise<Message[]> {
    return Array.from(this.messages.values());
  }

  async addMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.currentId++;
    const message: Message = {
      ...insertMessage,
      id,
      timestamp: new Date()
    };
    this.messages.set(id, message);
    return message;
  }

  async getModelParams(modelId: string): Promise<ModelParams | undefined> {
    return this.modelParams.get(modelId);
  }

  async setModelParams(params: InsertModelParams): Promise<ModelParams> {
    const id = this.currentId++;
    const modelParams: ModelParams = {
      id,
      modelId: params.modelId,
      temperature: params.temperature ?? 1, // Provide default value if undefined
      maxTokens: params.maxTokens ?? null,
      systemPrompt: params.systemPrompt ?? null,
      parameters: params.parameters ?? null
    };
    this.modelParams.set(params.modelId, modelParams);
    return modelParams;
  }

  async clearMessages(): Promise<void> {
    this.messages.clear();
  }
}

export const storage = new MemStorage();