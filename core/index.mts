import 'dotenv/config';
import * as readline from 'readline/promises';

import {ChatGroq} from '@langchain/groq';
import {createReactAgent} from '@langchain/langgraph/prebuilt';
import {Annotation, MemorySaver, StateGraph} from '@langchain/langgraph';
import {
    BaseMessage,
    HumanMessage,
    SystemMessage,
} from '@langchain/core/messages';

import {getAgentTools} from './tools/agent_tools.mjs';
import {CHAT_MODEL, GROQ_API_KEY} from "./config/define.mjs";


const readLine = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const agentTools = await getAgentTools();

const agentModel = new ChatGroq({
    apiKey: GROQ_API_KEY,
    model: CHAT_MODEL,
});

const agent = createReactAgent({
    llm: agentModel,
    tools: agentTools,
    checkpointSaver: new MemorySaver(),
});

const StateAnnotation = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (left, right) => left.concat(right),
        default: () => [],
    }),
});

const graphBuilder = new StateGraph(StateAnnotation);

const invokeAndPrint = async (state: typeof StateAnnotation.State) => {
    const response = await agent.invoke(
        {messages: state.messages},
        {configurable: {thread_id: 'user_123'}} // per-user thread
    );

    const reply = response.messages.at(-1)?.content;
    if (reply) console.log('\n🤖', reply, '\n');

    return {
        messages: response.messages,
    };
};

const graph = graphBuilder
    .addNode('chat', invokeAndPrint)
    .addEdge('__start__', 'chat')
    .addEdge('chat', '__end__')
    .compile();

// Start cli chat
let messages: BaseMessage[] = [
  new SystemMessage('You are a helpful game assistant.'),
];

while (true) {
  const input = await readLine.question('👤 You: ');
  if (input.trim().toLowerCase() === 'exit') break;

  messages.push(new HumanMessage(input));

  const result = await graph.invoke({ messages });
  messages = result.messages;
}

console.log('👋 Session ended.');
process.exit(0)
