import 'dotenv/config';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Chroma } from '@langchain/community/vectorstores/chroma';


// Utility function to generate unique IDs for each document and chunk
const hashId = (source: string, text: string) =>
  crypto.createHash('sha256').update(source).update(text).digest('hex');


/**
     * Utility function to pre-process and store a PDF into a Chroma db.
     * @param vectorstore - The chroma vectorstore object.
     * @param folder - The folder containing the PDFs.
     * @param file - PDF file to process.
     * @param splitter - Splitter object to chunk PDF.
     * @returns Promise<Number> - A promise resolving to the number of documents processed after chunking.
     */
export async function processPdf(
    vectorstore: Chroma,
    folder: string,
    file: string,
    splitter: RecursiveCharacterTextSplitter,
    ) {

  // Check if file already ingested by checking for source_hash in metadata
  // Custom hack for local dev, do not take to prod.
  const ingestedDocs = await vectorstore.similaritySearch(file, 5);
  const alreadyIngested = ingestedDocs.some((doc) => doc.metadata?.source === file);
  if (alreadyIngested) {
    console.log(`⏩ Skipping "${file}" — already ingested.`);
    return 0;
  }

  const filePath = path.join(folder, file);
  const loader = new PDFLoader(filePath);
  const rawDocs = await loader.load();

  const docs = await splitter.splitDocuments(rawDocs);

  // Metadata + IDs
  docs.forEach((d, i) => {
    d.metadata.source = file;
    d.metadata.index = i;
    // Unused locally for this demo as we're not changing contents of PDFs
    // d.metadata.file_hash = await hashFileContent(filePath);
  });
  const ids = docs.map((d) => hashId(String(d.metadata.source), d.pageContent));

  // Small batches to not overload memory
  const BATCH = 64;
  console.log(`Splitting ${docs.length} docs into batches of ${BATCH} ..`);
  for (let i = 0; i < docs.length; i += BATCH) {
    await vectorstore.addDocuments(docs.slice(i, i + BATCH), {
      ids: ids.slice(i, i + BATCH),
    });
    console.log("✅ Documents persisted to DB.")
  }

  return docs.length;
}