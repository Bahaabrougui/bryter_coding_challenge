import {requireEnv} from '../utils/utility.mjs'
import * as process from "process";


/**
 * A file centralising reusable defined env variables.
 */

export const CHROMA_URL = requireEnv('CHROMA_URL');
export const CHROMA_COLLECTION = requireEnv('CHROMA_COLLECTION');
export const GROQ_API_KEY = requireEnv("GROQ_API_KEY");
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
export const TEI_URL = process.env.TEI_URL;
export const CHAT_MODEL= process.env.CHAT_MODEL ?? "llama-3.3-70b-versatile"
export const CHAT_SYSTEM_PROMPT_VERSION = process.env.CHAT_SYSTEM_PROMPT_VERSION ?? "v1"
export const EMBEDDING_MODEL= process.env.EMBEDDING_MODEL ?? "sentence-transformers/all-MiniLM-L6-v2"
// PDF chunking
export const CHUNK_SIZE = 800
export const CHUNK_OVERLAP = 160