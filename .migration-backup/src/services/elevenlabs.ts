/**
 * ElevenLabs API service for voice/TTS generation
 * Replaces Lovable AI cloud voice synthesis
 */

export interface GenerateVoiceOptions {
  text: string;
  voiceId?: string;
}

export interface GenerateVoiceResult {
  audioUrl?: string;
  audioBlob?: Blob;
  error?: string;
}

const API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const DEFAULT_VOICE_ID = import.meta.env.VITE_ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
const API_BASE = "https://api.elevenlabs.io/v1";
const REQUEST_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

function validateApiKey(): void {
  if (!API_KEY || API_KEY.trim() === "") {
    throw new Error(
      "VITE_ELEVENLABS_API_KEY is not configured. Please set it in your environment variables."
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

export async function generateVoice(
  options: GenerateVoiceOptions
): Promise<GenerateVoiceResult> {
  validateApiKey();

  const voiceId = options.voiceId || DEFAULT_VOICE_ID;
  
  // Validate text
  if (!options.text || options.text.trim().length === 0) {
    return {
      error: "Text is required for voice generation",
    };
  }

  try {
    const response = await retryFetch(
      `${API_BASE}/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: options.text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        error: `ElevenLabs API error (${response.status}): ${errorText.slice(0, 200)}`,
      };
    }

    // Response is audio blob
    const audioBlob = await response.blob();
    
    if (audioBlob.size === 0) {
      return {
        error: "Empty audio blob received from API",
      };
    }

    // Create a blob URL for playback
    const audioUrl = URL.createObjectURL(audioBlob);

    return {
      audioUrl,
      audioBlob,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    return {
      error: `Failed to generate voice with ElevenLabs: ${message}`,
    };
  }
}

/**
 * Get available voices from ElevenLabs
 */
export async function getAvailableVoices(): Promise<
  Array<{ voice_id: string; name: string; category?: string }>
> {
  validateApiKey();

  try {
    const response = await fetchWithTimeout(
      `${API_BASE}/voices`,
      {
        method: "GET",
        headers: {
          "xi-api-key": API_KEY,
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to fetch voices");
      return [];
    }

    const data = (await response.json()) as Record<string, unknown>;
    const voices = (data.voices as Array<{ voice_id: string; name: string; category?: string }>) || [];
    return voices;
  } catch (error) {
    console.error("Error fetching ElevenLabs voices:", error);
    return [];
  }
}

/**
 * Get voice settings for a specific voice
 */
export async function getVoiceSettings(
  voiceId: string
): Promise<Record<string, unknown> | null> {
  validateApiKey();

  try {
    const response = await fetchWithTimeout(
      `${API_BASE}/voices/${voiceId}/settings`,
      {
        method: "GET",
        headers: {
          "xi-api-key": API_KEY,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as Record<string, unknown>;
  } catch (error) {
    console.error("Error fetching voice settings:", error);
    return null;
  }
}
