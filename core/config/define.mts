import {requireEnv} from '../utils/utility.mjs'
import * as process from "process";

export const CHROMA_URL = requireEnv('CHROMA_URL');
export const CHROMA_COLLECTION = requireEnv('CHROMA_COLLECTION');
export const GROQ_API_KEY = requireEnv("GROQ_API_KEY");
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
export const TEI_URL = process.env.TEI_URL;
export const CHAT_MODEL= process.env.CHAT_MODEL ? process.env.CHAT_MODEL : "llama-3.3-70b-versatile"