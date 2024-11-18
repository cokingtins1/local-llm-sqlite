import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

import { LibSQLVectorStore } from "@langchain/community/vectorstores/libsql";
import { OpenAIEmbeddings } from "@langchain/openai";
import { createClient } from "@libsql/client";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";

// const embeddings = new OpenAIEmbeddings({
// 	model: "text-embedding-3-small",
// });

export const embeddings = new HuggingFaceInferenceEmbeddings({
	apiKey: process.env.HUGGINGFACEHUB_API_KEY,
});

// const libsqlClient = createClient({
// 	url: process.env.TURSO_DATABASE_URL as string,
// 	authToken: process.env.TURSO_AUTH_TOKEN,
// });

const libsqlClient = createClient({
	url: process.env.TURSO_DATABASE_URL as string,
	authToken: process.env.TURSO_AUTH_TOKEN,
});

// const libsqlClient = createClient({
// 	url: "file:./dev.db",
// });

export const db = new LibSQLVectorStore(embeddings, {
	db: libsqlClient,
	table: "VectorStore",
	column: "embeddings",
});

const adapter = new PrismaLibSQL(libsqlClient);
export const prisma = new PrismaClient({ adapter });
