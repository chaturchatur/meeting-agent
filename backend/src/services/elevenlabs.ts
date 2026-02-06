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
 * Internal buffer that collects decoded raw μ-law audio buffers.
 * We decode each base64 chunk immediately to avoid base64 concatenation issues.
 */
let audioBuffer: Buffer[] = [];
let chunkCounter = 0;

/** How many Twilio media chunks to accumulate before sending to ElevenLabs. */
const FLUSH_EVERY_N_CHUNKS = 500; // ≈ 10 seconds of audio at 20ms/chunk

/** Twilio sends μ-law audio at 8000 Hz, mono, 8-bit. */
const MULAW_SAMPLE_RATE = 8000;
const MULAW_CHANNELS = 1;
const MULAW_BITS_PER_SAMPLE = 8;

/**
 * Wrap raw μ-law bytes in a valid WAV container so ElevenLabs can decode it.
 * WAV format code 7 = μ-law.
 */
function wrapMulawInWav(rawBytes: Buffer): Buffer {
  const dataSize = rawBytes.length;
  const headerSize = 44;
  const fileSize = headerSize + dataSize;
  const header = Buffer.alloc(headerSize);

  // RIFF header
  header.write("RIFF", 0);
  header.writeUInt32LE(fileSize - 8, 4); // file size minus RIFF header
  header.write("WAVE", 8);

  // fmt  sub-chunk
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // sub-chunk size
  header.writeUInt16LE(7, 20); // audio format: 7 = μ-law
  header.writeUInt16LE(MULAW_CHANNELS, 22);
  header.writeUInt32LE(MULAW_SAMPLE_RATE, 24);
  header.writeUInt32LE(
    MULAW_SAMPLE_RATE * MULAW_CHANNELS * (MULAW_BITS_PER_SAMPLE / 8),
    28
  ); // byte rate
  header.writeUInt16LE(MULAW_CHANNELS * (MULAW_BITS_PER_SAMPLE / 8), 32); // block align
  header.writeUInt16LE(MULAW_BITS_PER_SAMPLE, 34);

  // data sub-chunk
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, rawBytes]);
}

/**
 * Called for every Twilio media message.
 * Accumulates audio and returns a TranscriptSegment when a batch is ready,
 * or null if still buffering.
 */
export async function transcribeAudioChunk(
  base64Audio: string,
  track: string
): Promise<Omit<TranscriptSegment, "meeting_id"> | null> {
  // Decode each chunk immediately to avoid base64 concatenation issues
  audioBuffer.push(Buffer.from(base64Audio, "base64"));
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

  const rawBytes = Buffer.concat(audioBuffer);
  audioBuffer = [];
  chunkCounter = 0;

  console.log(`[elevenlabs] Flushing ${rawBytes.length} bytes of audio (~${(rawBytes.length / MULAW_SAMPLE_RATE).toFixed(1)}s)`);

  // Wrap raw μ-law bytes in a proper WAV container
  const wavBytes = wrapMulawInWav(rawBytes);

  try {
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([new Uint8Array(wavBytes)], { type: "audio/wav" }),
      "audio.wav"
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
