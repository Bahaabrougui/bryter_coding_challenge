import 'dotenv/config';
import {parseArgs} from 'node:util';
import * as path from 'node:path';
import {promises} from 'node:fs';

import {Chroma} from "@langchain/community/vectorstores/chroma";
import {RecursiveCharacterTextSplitter} from "@langchain/textsplitters";
import {OpenAIEmbeddings} from "@langchain/openai";

import {
    CHROMA_COLLECTION,
    CHROMA_URL, CHUNK_OVERLAP, CHUNK_SIZE, EMBEDDING_MODEL,
    OPENAI_API_KEY,
    TEI_URL
} from '../config/define.mjs'
import {processPdf} from './utils.mjs'
import {TeiEmbeddings} from '../embeddings/tei_embeddings.mjs';
import {getChromaStoreSingleton} from "../vector_db/chroma_store.mjs";
import {requireEnv} from "../utils/utility.mjs";


/**
 * Script for ingesting PDF documents into Chroma vector store.
 * Supports both OpenAI and TEI embeddings.
 *
 * Usage:
 *    npx tsx ingest.mts --documents-folder ./docs --concurrency 2 [--openai]
 */


/**
     * Embeds a single query string.
     * @param vectorstore - The chroma vectorstore object.
     * @param docsFolderPath - The folder contains the PDFs.
     * @param concurrency - Number of PDFs to process in //.
     */
async function ingest_docs_from_folder(
    vectorstore: Chroma,
    docsFolderPath: string,
    concurrency: number,
) {
    let entries: string[];
    try {
        entries = await promises.readdir(docsFolderPath);
    } catch {
        console.error(`Docs folder not readable: ${docsFolderPath}`);
        process.exit(1);
    }

    const pdfs = entries.filter((f) => f.toLowerCase().endsWith('.pdf'));
    if (pdfs.length === 0) {
        console.warn(`No PDFs in ${docsFolderPath}`);
        return;
    }

    // Init splitter
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: CHUNK_SIZE,
        chunkOverlap: CHUNK_OVERLAP,
    });
    console.log(
        `Adding ${pdfs.length} PDFs from \`${docsFolderPath}\` ..`
    );

    // Tiny worker pool for //ism
    let total = 0;
    const queue = [...pdfs];
    const workers = Array.from({length: concurrency}, async () => {
        while (queue.length) {
            const file = queue.shift();
            if (!file) break;
            try {
                const n = await processPdf(vectorstore, docsFolderPath, file, splitter);
                total += n;
                console.log(`✅ ${file}: ${n} chunks`);
            } catch (e) {
                console.error(`❌ Failed ${file}:`, e);
            }
        }
    });

    await Promise.all(workers);
    console.log(`✅ Done. Total chunks: ${total}`);
}


// ---- CLI ----
const {values} = parseArgs({
    options: {
        'documents-folder': {type: 'string', short: 'd'},
        'concurrency': {type: 'string', short: 'c'},
        'openai': {type: 'boolean'},
    },
});
if (!values['documents-folder']) {
    console.error('❌ Missing documents folder path at --documents-folder or -d.');
    process.exit(1);
}

const docsFolder = values['documents-folder']
// Limit workers to max 8
const concurrency = Math.max(1, Math.min(8, Number(values['concurrency'] ?? 2)));

// Init embeddings
let embeddings = null
if (values['openai']) {
    console.log("Using Open AI API for embeddings.")
    requireEnv("OPENAI_API_KEY")
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
        verbose: true,
    });
}
// Init DB object
const vectorstore = await getChromaStoreSingleton({
    url: CHROMA_URL,
    collection: CHROMA_COLLECTION,
    embeddings: embeddings,
    metadata: {
        created_by: "ingest",
        embedding_model: EMBEDDING_MODEL,
    }
});
const docsFolderPath = path.resolve(docsFolder);
// Call function
ingest_docs_from_folder(vectorstore, docsFolderPath, concurrency).catch((e) => {
    console.error('❌ Ingest failed:', e);
    process.exit(1);
});
