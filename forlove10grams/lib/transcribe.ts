import OpenAI from 'openai'
import * as OpenCC from 'opencc-js'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Simplified/other → Traditional Chinese (Taiwan) with phrase conversion.
const toTraditional = OpenCC.Converter({ from: 'cn', to: 'twp' })

/**
 * Fetches the audio at `audioUrl` and returns a Traditional-Chinese transcript.
 * Throws if the fetch or the OpenAI call fails.
 */
export async function transcribeAudio(audioUrl: string): Promise<string> {
  const res = await fetch(audioUrl)
  if (!res.ok) {
    throw new Error(`Failed to fetch audio for transcription: ${res.status}`)
  }
  const arrayBuffer = await res.arrayBuffer()
  const contentType = res.headers.get('content-type') ?? 'audio/mp4'
  const file = new File([arrayBuffer], 'audio', { type: contentType })

  const result = await client.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language: 'zh',
    // Prompt nudges Whisper toward Traditional Chinese; OpenCC is the safety net.
    prompt: '以下是一段繁體中文的語音備忘錄，請以繁體中文轉錄。',
  })

  return toTraditional(result.text)
}
