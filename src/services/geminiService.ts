
import { GoogleGenAI } from "@google/genai";
import { Transaction } from '../types';

// FIX: Refactored to use environment variable for API key as per guidelines.
// The apiKey parameter has been removed.
export async function getFinancialInsight(query: string, transactions: Transaction[]) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `
    You are a professional Financial Assistant for myBCA app.
    Based on the user's recent transaction history provided, answer their questions accurately.
    Transaction Data: ${JSON.stringify(transactions)}
    Tone: Friendly, professional, concise.
    Always use Indonesian Rupiah (IDR) for amounts.
    Keep answers helpful for personal budgeting.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: query,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text || "Maaf, saya tidak bisa memberikan jawaban saat ini.";
  } catch (error) {
    console.error("Gemini Error:", error);
    // FIX: Removed specific API key validation error message as the key is now assumed to be valid from env vars.
    if (error instanceof Error && error.message.includes('API key not valid')) {
        return "Terjadi kesalahan otentikasi dengan layanan AI.";
    }
    return "Terjadi kesalahan saat menghubungi asisten AI.";
  }
}
