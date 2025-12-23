
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY || "";

export const getMazeLore = async (width: number, height: number) => {
  if (!API_KEY) return "AI lore generation is unavailable without an API key.";

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a creative dungeon master. I have generated a maze that is ${width} units wide and ${height} units tall. 
      Please provide a creative name for this location, a brief atmospheric description, and three potential 'encounter' hooks for a game. 
      Format the response in Markdown.`,
      config: {
        temperature: 0.8,
        topP: 0.95,
      },
    });

    return response.text || "No lore generated.";
  } catch (error) {
    console.error("Error generating maze lore:", error);
    return "Failed to generate AI lore. The maze stands silent.";
  }
};
