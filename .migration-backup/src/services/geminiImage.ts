/**
 * Google Gemini Image Generation service
 * Replaces Lovable AI cloud image generation
 */

export interface GenerateImageOptions {
  topic: string;
  style: string;
}

export interface GenerateImageResult {
  url?: string;
  base64?: string;
  error?: string;
}

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const REQUEST_TIMEOUT = 45000; // 45 seconds for image generation
const MAX_RETRIES = 2;
const RETRY_DELAY = 2000; // 2 seconds

function validateApiKey(): void {
  if (!API_KEY || API_KEY.trim() === "") {
    throw new Error(
      "VITE_GEMINI_API_KEY is not configured. Please set it in your environment variables."
    );
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function retryFetch(
  url: string,
  options: RequestInit,
  retries: number = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options);

      // Don't retry on client errors (4xx except 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return response;
      }

      // Retry on server errors (5xx) and rate limiting (429)
      if (response.status >= 500 || response.status === 429) {
        if (attempt < retries - 1) {
          const delay = RETRY_DELAY * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < retries - 1) {
        const delay = RETRY_DELAY * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  throw (
    lastError ||
    new Error(`Failed to fetch after ${retries} attempts`)
  );
}

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResult> {
  validateApiKey();

  const prompt = `Podcast cover art thumbnail, square 1:1, no text, purely visual, cinematic, high detail. 
Style: ${options.style}. 
Topic: ${options.topic}`;

  try {
    const response = await retryFetch(
      `${API_BASE}/gemini-1.5-flash:generateContent?key=${encodeURIComponent(API_KEY)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.8,
            topK: 40,
            topP: 0.95,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        error: `Gemini API error (${response.status}): ${errorText.slice(0, 200)}`,
      };
    }

    const data = (await response.json()) as Record<string, unknown>;

    // Extract image from response
    const candidates = (data.candidates as Array<{ content?: { parts?: Array<{ text?: string; inlineData?: { mimeType?: string; data?: string } }> } }>) || [];
    
    if (candidates.length === 0) {
      return {
        error: "No image candidates in API response",
      };
    }

    const parts = candidates[0].content?.parts || [];
    
    // Look for image data or text response
    for (const part of parts) {
      if (part.inlineData?.data) {
        // Return base64 encoded image
        return {
          base64: part.inlineData.data,
        };
      }
    }

    return {
      error: "No image data found in API response",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    return {
      error: `Failed to generate image with Gemini: ${message}`,
    };
  }
}

/**
 * Generate multiple images in parallel
 */
export async function generateImages(
  topics: Array<{ topic: string; style: string }>
): Promise<GenerateImageResult[]> {
  const results = await Promise.all(
    topics.map((item) => generateImage(item))
  );
  return results;
}
