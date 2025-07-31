import type {EmbeddingsInterface} from '@langchain/core/embeddings';
import fetch from 'node-fetch';

type TeiOptions = {
    baseUrl: string;
    timeoutMs?: number;
    batchSize?: number;
};

export class TeiEmbeddings implements EmbeddingsInterface {
    private baseUrl: string;
    private timeoutMs: number;
    private batchSize: number;

    constructor(opts: TeiOptions) {
        this.baseUrl = opts.baseUrl;
        this.timeoutMs = opts.timeoutMs ?? 60_000;
        this.batchSize = Math.max(1, opts.batchSize ?? 16);
    }

    async embedQuery(text: string): Promise<number[]> {
        const [vec] = await this.postEmbed([text]);
        return vec;
    }

    async embedDocuments(texts: string[]): Promise<number[][]> {
        const out: number[][] = [];
        for (let i = 0; i < texts.length; i += this.batchSize) {
            const batch = texts.slice(i, i + this.batchSize);
            const vecs = await this.postEmbed(batch);
            out.push(...vecs);
        }
        console.log("✅ Documents embedded.")
        return out;
    }

    private async postEmbed(inputs: string[]): Promise<number[][]> {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), this.timeoutMs);

        const headers: Record<string, string> = {'content-type': 'application/json'};
        try {
            const res = await fetch(`${this.baseUrl}/embed`, {
                method: 'POST',
                headers,
                body: JSON.stringify({inputs}),
                signal: controller.signal,
            });

            if (!res.ok) {
                const body = await res.text().catch(() => '');
                throw new Error(`TEI /embed ${res.status}: ${body}`);
            }

            const json = await res.json();
            if (Array.isArray(json) && Array.isArray(json[0])) return json as number[][];
            if (json && typeof json === 'object' && 'embeddings' in json)
                return (json as any).embeddings as number[][];
            throw new Error('❌ Unexpected TEI /embed response shape');
        } finally {
            clearTimeout(t);
        }
    }
}
