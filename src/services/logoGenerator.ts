import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateAppLogo() {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: 'A modern, professional, and minimalist app icon for an "Overtime Tracker" app. The design should feature a stylized clock or stopwatch integrated with a rising growth arrow or currency symbol. Use a vibrant color palette like deep purple and electric blue. The background should be a smooth gradient. High quality, 3D rendered style but clean and flat enough for a mobile app icon. No text.',
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: "1K"
      },
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
}
