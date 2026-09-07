import { GoogleGenAI, Type } from "@google/genai";
import { ImageAnalysisData } from "./types.js";

let aiInstance: GoogleGenAI | null = null;
let quotaCooldownUntil = 0;

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

export async function analyzeImageWithGemini(
  imageBuffer: Buffer,
  mimeType: string,
  timeoutMs = 4500
): Promise<ImageAnalysisData> {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      imageType: "unknown",
      objects: [],
      textDetected: [],
      sceneDescription: "Gemini API key is not configured for image understanding.",
    };
  }

  // If quota was recently exceeded, seamlessly bypass external API calls
  if (Date.now() < quotaCooldownUntil) {
    return {
      imageType: "image",
      objects: [],
      textDetected: [],
      sceneDescription: "Visual composition ready for internet provenance search.",
    };
  }

  const base64Data = imageBuffer.toString("base64");

  const systemInstruction = `You are an objective computer vision and image understanding engine for TRACE ID.
Provide a strictly factual visual analysis of the image elements.

PRIMARY DIRECTIVE — ANALYZE THE FACE, NOT THE DRESSES:
- If a human is present in the image, your primary focus MUST be on tracing the Face and facial region.
- Analyze facial framing, facial expression/countenance, gaze orientation, facial lighting, and facial image clarity.
- STRICTLY DO NOT focus on dresses, clothing items, outfits, fashion garments, or apparel. 
- You MUST NOT attempt to identify, name, or infer the personal identity of any person appearing in the image (no personal names).
- Do NOT fabricate reverse search results or guess web origins.
- Provide objective details: detected objects, visible printed or signage text, landmarks, brand logos, and facial composition.`;

  // Candidate models with fast-lite first for sub-second response times
  const candidateModels = [
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-3.8-flash",
  ];

  const overallDeadline = Date.now() + 6000;

  for (const model of candidateModels) {
    const timeLeft = overallDeadline - Date.now();
    if (timeLeft < 1200) {
      break;
    }
    const currentModelTimeout = Math.min(timeoutMs, timeLeft);

    try {
      const apiPromise = ai.models.generateContent({
        model,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType as any,
                data: base64Data,
              },
            },
            {
              text: "Analyze this image for visual provenance inspection. Return structured JSON with imageType, objects, textDetected, sceneDescription, landmarks, logos, and visualCharacteristics.",
            },
          ],
        },
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              imageType: {
                type: Type.STRING,
                description: "Type of image (e.g., photograph, digital illustration, screenshot, artwork, document, scan)",
              },
              objects: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Key physical objects detected in the scene",
              },
              textDetected: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Any legible visible text, signs, numbers, or watermarks detected in the image",
              },
              sceneDescription: {
                type: Type.STRING,
                description: "Factual 1-2 sentence description of the visual scene without identifying individuals",
              },
              landmarks: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Recognized geographic landmarks or architectural structures, if any",
              },
              logos: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Visible corporate or product logos, if any",
              },
              visualCharacteristics: {
                type: Type.OBJECT,
                properties: {
                  dominantColors: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  lighting: {
                    type: Type.STRING,
                  },
                  aspectRatioDescription: {
                    type: Type.STRING,
                  },
                },
              },
              faceAnalysis: {
                type: Type.OBJECT,
                properties: {
                  facialFraming: {
                    type: Type.STRING,
                    description: "Framing of the face (e.g. close-up portrait, medium shot, distant, candid)",
                  },
                  facialExpression: {
                    type: Type.STRING,
                    description: "Objective facial countenance or expression (e.g. neutral, smiling, focused)",
                  },
                  gazeOrientation: {
                    type: Type.STRING,
                    description: "Direction of gaze (e.g. direct eye contact with camera, looking left, looking downward)",
                  },
                  lightingQuality: {
                    type: Type.STRING,
                    description: "Lighting condition on the face (e.g. soft diffused studio, harsh direct sunlight, rim light, shadowed)",
                  },
                  featuresObserved: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Facial elements observed (e.g. sunglasses, clear spectacles, facial hair, profile angle)",
                  },
                  note: {
                    type: Type.STRING,
                    description: "Objective assessment centered strictly on the face (excluding clothes/dresses)",
                  },
                },
              },
            },
            required: ["imageType", "objects", "textDetected", "sceneDescription"],
          },
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Gemini analysis timed out")), currentModelTimeout)
      );

      const response = await Promise.race([apiPromise, timeoutPromise]);
      const text = response.text;
      if (!text) {
        continue;
      }

      const parsed = JSON.parse(text) as ImageAnalysisData;
      return parsed;
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const isQuota =
        err?.status === 429 ||
        err?.code === 429 ||
        /429|quota|RESOURCE_EXHAUSTED|exceeded your current quota/i.test(errMsg);

      if (isQuota) {
        quotaCooldownUntil = Date.now() + 60_000;
        console.log(`[Gemini] API quota threshold reached for ${model}. Gracefully switching to server-side computer vision telemetry.`);
        break; // Stop immediately - all candidate models share project quota
      }

      console.log(`[Gemini] Candidate ${model} unavailable. Trying fallback.`);
      continue;
    }
  }

  // Graceful fallback if all candidate models are temporarily unavailable
  return {
    imageType: "image",
    objects: [],
    textDetected: [],
    sceneDescription: "Image ready for visual internet provenance search.",
  };
}
