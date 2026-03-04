import { GoogleGenAI, Type } from "@google/genai";

export interface Ticket {
  id: string;
  name: string;
  content: string;
  date?: string;
}

export interface SuggestedFix {
  title: string;
  confidence: number;
  explanation: string;
  steps: string[];
  historicalReference: string;
}

export interface AnalysisReport {
  summary: string;
  suggestions: SuggestedFix[];
}

export interface ExecutiveSummary {
  summary: string;
}

export interface KBArticle {
  markdown: string;
}

export async function generateSyntheticTicket(
  briefDescription: string
): Promise<Ticket> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  
  const prompt = `
    You are an IT documentation specialist. Expand the following brief fix description into a full, structured CAS (Central Authentication Service) ticket.
    
    BRIEF DESCRIPTION:
    ${briefDescription}
    
    STRUCTURE:
    - Ticket ID: Generate a realistic ID (e.g., CAS-XXXXXX)
    - Symptoms: Describe the likely user-reported symptoms based on the fix.
    - Resolution: Provide a detailed, professional resolution based on the brief description.
    
    Return the response in strict JSON format matching this schema:
    {
      "name": "Short descriptive name for the ticket",
      "content": "The full structured ticket content with ID, Symptoms, and Resolution sections."
    }
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          content: { type: Type.STRING }
        },
        required: ["name", "content"]
      }
    }
  });

  const result = JSON.parse(response.text || "{}");
  return {
    id: Math.random().toString(36).substr(2, 9),
    name: result.name || "Synthetic Ticket",
    content: result.content || "",
    date: new Date().toLocaleDateString()
  };
}

export async function generateExecutiveSummary(
  technicalResolution: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  
  const prompt = `
    You are a senior IT manager. Distill the following technical resolution into a high-level, non-technical executive summary for management.
    Focus on the impact, the fix, and the current status. Avoid technical jargon.
    
    TECHNICAL RESOLUTION:
    ${technicalResolution}
    
    Return only the summary text.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text || "Could not generate summary.";
}

export async function draftKBArticle(
  resolution: SuggestedFix
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  
  const prompt = `
    You are a technical writer. Create a standardized Wiki Knowledge Base (KB) article based on this resolution.
    1. Strip out all user-specific data (names, IP addresses, specific server names).
    2. Use a professional Wiki template with sections: Title, Problem Description, Root Cause, Resolution Steps, and Prevention.
    3. Format in clean Markdown.
    
    RESOLUTION DATA:
    Title: ${resolution.title}
    Explanation: ${resolution.explanation}
    Steps: ${resolution.steps.join('\n')}
    
    Return only the Markdown content.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text || "Could not generate KB article.";
}

export async function analyzeIncident(
  currentIncident: string,
  historicalTickets: Ticket[]
): Promise<AnalysisReport> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  
  const prompt = `
    You are an expert IT Support Analyst specializing in CAS (Central Authentication Service) and general IT incidents.
    
    HISTORICAL RESOLVED TICKETS:
    ${historicalTickets.map(t => `--- TICKET: ${t.name} ---\n${t.content}`).join('\n\n')}
    
    NEW INCIDENT DESCRIPTION:
    ${currentIncident}
    
    TASK:
    Analyze the new incident against the historical tickets provided. 
    1. Identify semantic patterns and similar past resolutions.
    2. Create a prioritized 'Suggested Fix' report.
    3. For each suggestion, provide a confidence score (0-100), a clear explanation of why it matches, and step-by-step instructions.
    
    Return the response in strict JSON format.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING, description: "A brief summary of the analysis." },
          suggestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
                explanation: { type: Type.STRING },
                steps: { type: Type.ARRAY, items: { type: Type.STRING } },
                historicalReference: { type: Type.STRING, description: "The name of the historical ticket this is based on." }
              },
              required: ["title", "confidence", "explanation", "steps", "historicalReference"]
            }
          }
        },
        required: ["summary", "suggestions"]
      }
    }
  });

  return JSON.parse(response.text || "{}") as AnalysisReport;
}
