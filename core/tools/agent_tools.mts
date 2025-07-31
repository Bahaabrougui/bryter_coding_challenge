import { DynamicTool } from '@langchain/core/tools';

import { getRetriever } from './retriever.mjs';


/**
     * Returns usable agent tools.
     * @return Promise<DynamicTool> - A promise resolving to an array of dynamic agent tools.
     */
export async function getAgentTools(): Promise<DynamicTool[]> {
  const base_retriever = await getRetriever();

  return [
    new DynamicTool({
      name: 'game_rules_lookup',
      description: 'Look up game rules information from the rule books',
      func: async (query: string) => {
        const time = performance.now();
        console.log("📑 Retrieving relevant docs..")
        const docs = await base_retriever.invoke(query);
        console.log(`✅ Docs retrieved. Took me ${(performance.now() - time) / 1000} seconds !`)
        return docs.map((d: { pageContent: any }) => d.pageContent).join('\n\n');
      },
    }),
  ];
}

