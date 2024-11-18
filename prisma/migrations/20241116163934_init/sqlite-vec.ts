import * as sqliteVec from "sqlite-vec";
import Database from "better-sqlite3";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";

// Define the Document type
export class Document<
	Metadata extends Record<string, any> = Record<string, any>
> {
	pageContent: string;
	metadata: Metadata;
	id?: string;

	constructor(fields: {
		pageContent: string;
		metadata: Metadata;
		id?: string;
	}) {
		this.pageContent = fields.pageContent;
		this.metadata = fields.metadata;
		this.id = fields.id;
	}
}

export const embeddings = new HuggingFaceInferenceEmbeddings({
	apiKey: process.env.HUGGINGFACEHUB_API_KEY,
});

const db = new Database(":memory:");
sqliteVec.load(db);

// Check versions of SQLite and sqlite-vec
const { sqlite_version, vec_version } = db
	.prepare(
		"select sqlite_version() as sqlite_version, vec_version() as vec_version;"
	)
	.get();
console.log(`sqlite_version=${sqlite_version}, vec_version=${vec_version}`);

// Create the virtual table for storing embeddings
db.exec("CREATE VIRTUAL TABLE vec_items USING vec0(embedding float[4])");

// Function to add documents to the vector database
async function addDocumentsToVectorDB(documents: string[]) {
	// Generate embeddings for all documents
	const vectors = await embeddings.embedDocuments(documents);

	// Insert embeddings into the database
	const insertStmt = db.prepare(
		"INSERT INTO vec_items(rowid, embedding) VALUES (?, ?)"
	);
	const insertVectors = db.transaction((vectors, docs) => {
		vectors.forEach((vector: number, index: number) => {
			insertStmt.run(index + 1, new Float32Array(vector));
		});
	});

	insertVectors(vectors, documents);
}

// Function to query the vector database
function queryVectorDB(queryEmbedding: number[]) {
	const rows = db
		.prepare(
			`
    SELECT
      rowid,
      distance
    FROM vec_items
    WHERE embedding MATCH ?
    ORDER BY distance
    LIMIT 3
  `
		)
		.all(new Float32Array(queryEmbedding));

	return rows;
}
