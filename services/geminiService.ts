
import { GoogleGenAI, Type } from "@google/genai";
import { AIResponse } from "../types";

// Helper for generating notification copy variations using Gemini
export const generateNotificationCopy = async (context: string): Promise<AIResponse> => {
  try {
    // Initializing AI client strictly following the naming parameter and environment variable guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate 3 variations of push notification copy for the following context: "${context}". 
      Return variations for 'Professional', 'Urgent', and 'Playful' styles. 
      Keep titles under 40 characters and body under 120 characters.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            variations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  title: { type: Type.STRING },
                  body: { type: Type.STRING }
                },
                required: ["type", "title", "body"]
              }
            }
          },
          required: ["variations"]
        }
      }
    });

    // Directly access the text property as per GenerateContentResponse guidelines
    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    
    return JSON.parse(text) as AIResponse;
  } catch (error) {
    console.error("Gemini Service Error:", error);
    // Return a graceful fallback variation set in case of API failure
    return {
      variations: [
        { type: 'Error Fallback', title: 'Oops!', body: 'There was an error generating AI variations. Please try manual editing.' }
      ]
    };
  }
};