import type {EmbeddingsInterface} from '@langchain/core/embeddings';
import fetch from 'node-fetch';

type TeiOptions = {
    baseUrl: string;
    timeoutMs?: number;
    batchSize?: number;
    verbose?: boolean;
};

/**
 * A custom embedding class using a local TEI server for embedding generation.
 */
export class TeiEmbeddings implements EmbeddingsInterface {
    private baseUrl: string;
    private timeoutMs: number;
    private batchSize: number;
    private verbose: boolean;

    /**
     * Constructs a new instance of TeiEmbeddings.
     * @param opts - Configuration options including baseUrl, timeout, and batchSize.
     * */
    constructor(opts: TeiOptions) {
        this.baseUrl = opts.baseUrl;
        this.timeoutMs = opts.timeoutMs ?? 60_000;
        this.batchSize = Math.max(1, opts.batchSize ?? 16);
        this.verbose = opts.verbose ?? false;
    }

    /**
     * Embeds a single query string.
     * @param text - The text to embed.
     * @returns A promise resolving to a vector embedding.
     */
    async embedQuery(text: string): Promise<number[]> {
        if (this.verbose) {
            console.log(`[TeiEmbeddings] Embedding query of length ${text.length} characters.`);
        }

        if (!text) return []

        const start = Date.now();

        const [vec] = await this.postEmbed([text]);

        const latency = Date.now() - start;
        if (this.verbose) {
            console.log(`[TeiEmbeddings] Query embedding completed in ${latency/1000}s.`);
        }
        return vec;
    }

    /**
     * Embeds a list of documents in batches.
     * @param texts - The documents to embed.
     * @returns A promise resolving to a list of vector embeddings.
     */
    async embedDocuments(texts: string[]): Promise<number[][]> {
        if (this.verbose) {
            console.log(`[TeiEmbeddings] Embedding ${texts.length} documents with batch size ${this.batchSize}.`);
        }
        const start = Date.now();
        const out: number[][] = [];
        for (let i = 0; i < texts.length; i += this.batchSize) {
            const batch = texts.slice(i, i + this.batchSize);
            const vecs = await this.postEmbed(batch);
            out.push(...vecs);
        }
        const latency = Date.now() - start;
        if (this.verbose) {
            console.log(`[TeiEmbeddings] ✅ All documents embedded in ${latency}ms.`);
        }
        return out;
    }

    /**
     * Internal method to send POST request to the TEI server.
     * @param inputs - The list of text strings to embed.
     * @returns A promise resolving to a list of vector embeddings.
     */
    private async postEmbed(inputs: string[]): Promise<number[][]> {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), this.timeoutMs);

        const headers: Record<string, string> = {'content-type': 'application/json'};
        try {
            const start = Date.now();
            const res = await fetch(`${this.baseUrl}/embed`, {
                method: 'POST',
                headers,
                body: JSON.stringify({inputs}),
                signal: controller.signal,
            });
            const latency = Date.now() - start;

            if (!res.ok) {
                const body = await res.text().catch(() => '');
                throw new Error(`TEI /embed ${res.status}: ${body}`);
            }

            const json = await res.json();
            if (this.verbose) {
                console.log(`[TeiEmbeddings] TEI /embed returned ${inputs.length} embeddings in ${latency/1000}s.`);
            }

            if (Array.isArray(json) && Array.isArray(json[0])) return json as number[][];
            if (json && typeof json === 'object' && 'embeddings' in json)
                return (json as any).embeddings as number[][];
            throw new Error('❌ Unexpected TEI /embed response shape');
        } finally {
            clearTimeout(t);
        }
    }
}
