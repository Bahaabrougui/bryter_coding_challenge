import 'dotenv/config';

import { OpenAIEmbeddings } from '@langchain/openai';
import {BaseRetriever} from "@langchain/core/retrievers";

import {CHROMA_COLLECTION, CHROMA_URL, OPENAI_API_KEY, TEI_URL} from "../config/define.mjs";
import {TeiEmbeddings} from "../embeddings/tei_embeddings.mjs";
import {getChromaStoreSingleton} from "../vector_db/chroma_store.mjs";
import {requireEnv} from "../utils/utility.mjs";


let embeddings = null
// Assume if `OPENAI_API_KEY` is set, use OpenAI Embeddings
if (OPENAI_API_KEY) {
    console.log("Using Open AI API for embeddings.")
    embeddings = new OpenAIEmbeddings({
        openAIApiKey: OPENAI_API_KEY,
    });
} else {
    console.log("Using local TEI server API for embeddings.")
    requireEnv("TEI_URL")
    embeddings = new TeiEmbeddings({
        baseUrl: TEI_URL,
        batchSize: 16,
        timeoutMs: 90_000,
    });
}

export async function getRetriever(): Promise<BaseRetriever> {

  const vectorstore = await getChromaStoreSingleton({
      url: CHROMA_URL,
      collection: CHROMA_COLLECTION,
      embeddings: embeddings,
      }
  )

  return vectorstore.asRetriever({k: 3});

}
