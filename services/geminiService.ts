
import { GoogleGenAI, Type } from "@google/genai";
import { Contact, Track, ReleasePlan, QuickLink } from "../types";

// Fix: Always use named parameter and direct environment variable for API key
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generatePitch = async (contact: Contact, context: string): Promise<string> => {
  const prompt = `
    Generate a professional and engaging PR pitch in RUSSIAN for the following contact:
    Name: ${contact.name}
    Platform: ${contact.platform} (${contact.handle})
    Category: ${contact.category}
    Notes: ${contact.notes}
    Tags: ${contact.tags.join(', ')}

    Context for the pitch: ${context}

    Rules:
    - Language: RUSSIAN.
    - Style: Business professional but music-industry friendly.
    - Length: Short (1-2 paragraphs).
    - Output ONLY the message text.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // Fix: response.text is a property, not a method.
    return response.text || "Не удалось сгенерировать питч.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Ошибка генерации питча.";
  }
};

export const processSmartImport = async (text: string): Promise<{
  contacts: Partial<Contact>[],
  tracks: Partial<Track>[],
  releasePlans: Partial<ReleasePlan>[],
  quickLinks: Partial<QuickLink>[]
}> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Проанализируй текст и извлеки структурированные данные для музыкального лейбла.
    ОСОБОЕ ВНИМАНИЕ:
    - Разделяй артистов лейбла (Label Artist) от внешних контактов.
    - Извлекай задачи для планов релизов.
    - Извлекай ссылки на ресурсы (EPK, Drive, Notion).

    Текст: "${text}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          contacts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                category: { type: Type.STRING, enum: ['Blogger', 'Artist', 'Agency', 'Media', 'Label Artist', 'Platform Curator'] },
                platform: { type: Type.STRING },
                handle: { type: Type.STRING },
                contactUrl: { type: Type.STRING },
                notes: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['name', 'category']
            }
          },
          tracks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                artistName: { type: Type.STRING },
                genre: { type: Type.STRING },
                releaseDate: { type: Type.STRING },
                mood: { type: Type.STRING }
              },
              required: ['title', 'artistName']
            }
          },
          releasePlans: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                artist: { type: Type.STRING },
                date: { type: Type.STRING },
                tasks: { 
                  type: Type.ARRAY, 
                  items: { 
                    type: Type.OBJECT,
                    properties: {
                      label: { type: Type.STRING },
                      completed: { type: Type.BOOLEAN }
                    }
                  } 
                }
              },
              required: ['title']
            }
          },
          quickLinks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                url: { type: Type.STRING },
                icon: { type: Type.STRING }
              },
              required: ['title', 'url']
            }
          }
        }
      }
    }
  });

  try {
    // Fix: Safely parse text property
    const data = JSON.parse(response.text || '{}');
    return {
      contacts: data.contacts || [],
      tracks: data.tracks || [],
      releasePlans: data.releasePlans || [],
      quickLinks: data.quickLinks || []
    };
  } catch (e) {
    console.error("Parse error", e);
    return { contacts: [], tracks: [], releasePlans: [], quickLinks: [] };
  }
};
