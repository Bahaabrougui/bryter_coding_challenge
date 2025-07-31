import { ChromaClient } from "chromadb";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import type { EmbeddingsInterface } from "@langchain/core/embeddings";

let vsPromise: Promise<Chroma> | null = null;

export function getChromaStoreSingleton(opts: {
  url: string;
  collection: string;
  embeddings: EmbeddingsInterface;
  metadata?: Record<string, unknown>;
}): Promise<Chroma> {
  if (vsPromise) return vsPromise;
  const { url, collection, embeddings, metadata } = opts;

  vsPromise = (async () => {
    const client = new ChromaClient({ path: url });

    // Get or Create
    try {
      await client.getCollection({ name: collection });
    } catch {
      try {
        await client.createCollection({
          name: collection,
          metadata: metadata && Object.keys(metadata).length ? metadata : {
              created_by: "cli",
          },
        });
      } catch {
        console.log(
            "Collection already created by another worker. Fetching connection .."
        )
      }
    }

    return await Chroma.fromExistingCollection(embeddings, {
      collectionName: collection,
      url,
    });
  })();

  return vsPromise;
}
