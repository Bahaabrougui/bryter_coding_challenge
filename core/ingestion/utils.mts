import 'dotenv/config';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Chroma } from '@langchain/community/vectorstores/chroma';


// Utility function to generate unique IDs
const hashId = (source: string, text: string) =>
  crypto.createHash('sha256').update(source).update(text).digest('hex');

// Utility function to pre-process and store a PDF into a Chroma db
export async function processPdf(
    vectorstore: Chroma,
    folder: string,
    file: string,
    splitter: RecursiveCharacterTextSplitter,
    ) {
  const filePath = path.join(folder, file);
  const loader = new PDFLoader(filePath);
  const rawDocs = await loader.load();

  const docs = await splitter.splitDocuments(rawDocs);

  // Metadata + IDs
  docs.forEach((d, i) => {
    d.metadata.source = file;
    d.metadata.index = i;
  });
  const ids = docs.map((d) => hashId(String(d.metadata.source), d.pageContent));

  // Small batches to not overload memory
  const BATCH = 64;
  console.log(`Splitting ${docs.length} docs into batches of ${BATCH} ..`);
  for (let i = 0; i < docs.length; i += BATCH) {
    console.log(`Processing batch n• ${i - BATCH + 1} ..`)
    await vectorstore.addDocuments(docs.slice(i, i + BATCH), {
      ids: ids.slice(i, i + BATCH),
    });
    console.log("✅ Documents persisted to DB.")
  }

  return docs.length;
}