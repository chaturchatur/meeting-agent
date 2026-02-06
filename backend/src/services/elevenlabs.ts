/**
 * ElevenLabs Scribe – real-time speech-to-text integration.
 *
 * We accumulate raw μ-law audio chunks from Twilio, periodically flush
 * them to the ElevenLabs Speech-to-Text API, and return transcript
 * segments with speaker labels and timestamps.
 */

import { TranscriptSegment } from "../types/index.js";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/speech-to-text";
const API_KEY = () => process.env.ELEVENLABS_API_KEY!;

/**
 * Internal buffer that collects base64-encoded μ-law audio chunks
 * until we have enough to send a meaningful request.
 */
let audioBuffer: string[] = [];
let chunkCounter = 0;

/** How many Twilio media chunks to accumulate before sending to ElevenLabs. */
const FLUSH_EVERY_N_CHUNKS = 50; // ≈ 1 second of audio at 20ms/chunk

/**
 * Called for every Twilio media message.
 * Accumulates audio and returns a TranscriptSegment when a batch is ready,
 * or null if still buffering.
 */
export async function transcribeAudioChunk(
  base64Audio: string,
  track: string
): Promise<Omit<TranscriptSegment, "meeting_id"> | null> {
  audioBuffer.push(base64Audio);
  chunkCounter++;

  if (chunkCounter < FLUSH_EVERY_N_CHUNKS) {
    return null;
  }

  return flushTranscription(track);
}

/**
 * Flush whatever audio is in the buffer, send it to ElevenLabs, and return
 * the resulting transcript segment (if any).
 */
export async function flushTranscription(
  track?: string
): Promise<Omit<TranscriptSegment, "meeting_id"> | null> {
  if (audioBuffer.length === 0) return null;

  const combinedBase64 = audioBuffer.join("");
  audioBuffer = [];
  chunkCounter = 0;

  // Decode base64 → raw bytes, then wrap in a WAV-like blob for the API
  const rawBytes = Buffer.from(combinedBase64, "base64");

  try {
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([rawBytes], { type: "audio/x-mulaw" }),
      "audio.raw"
    );
    formData.append("model_id", "scribe_v1");
    formData.append("num_speakers", "2");

    const response = await fetch(ELEVENLABS_API_URL, {
      method: "POST",
      headers: {
        "xi-api-key": API_KEY(),
      },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("ElevenLabs STT error:", response.status, errText);
      return null;
    }

    const result = await response.json() as {
      text?: string;
      words?: Array<{
        text: string;
        start: number;
        end: number;
        speaker_id?: string;
        confidence?: number;
      }>;
    };

    if (!result.text || result.text.trim().length === 0) {
      return null;
    }

    // Derive a speaker label
    const speaker =
      result.words?.[0]?.speaker_id ??
      (track === "inbound" ? "Caller" : "Agent");

    const startTime = result.words?.[0]?.start ?? null;
    const endTime = result.words?.[result.words.length - 1]?.end ?? null;
    const avgConfidence =
      result.words && result.words.length > 0
        ? result.words.reduce((s, w) => s + (w.confidence ?? 1), 0) /
          result.words.length
        : null;

    return {
      speaker,
      content: result.text.trim(),
      start_time: startTime,
      end_time: endTime,
      confidence: avgConfidence,
    };
  } catch (err) {
    console.error("ElevenLabs STT fetch failed:", err);
    return null;
  }
}
