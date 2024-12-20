"use server";

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { VectorChunk } from "@/lib/types";
import { PrismaClient } from "@prisma/client";
import { Document } from "@langchain/core/documents";
import { db, embeddings, prisma } from "@/prisma/_base";

export default async function updateDB() {
	async function loadDocuments(path: string): Promise<VectorChunk> {
		const dirLoader = new DirectoryLoader(path, {
			".pdf": (path: string) => new PDFLoader(path),
		});

		const docs: Document<Record<string, any>>[] = await dirLoader.load();

		const chunks: VectorChunk = docs.map((doc) => ({
			id: doc.id,
			metadata: {
				loc: {
					pageNumber: doc.metadata.loc.pageNumber,
					lines: doc.metadata.loc.lines,
				},
				pdf: {
					info: doc.metadata.pdf.info,
					version: doc.metadata.pdf.version,
					metadata: doc.metadata.pdf.metadata,
					totalPages: doc.metadata.pdf.totalPages,
				},
				uuid: doc.metadata.uuid,
				source: doc.metadata.source,
			},
			chunkId: doc.metadata.chunkId,
			pageContent: doc.pageContent,
		}));

		return chunks;
	}

	async function splitText(docs: VectorChunk): Promise<VectorChunk> {
		const textSplitter = new RecursiveCharacterTextSplitter({
			chunkSize: 1000,
			chunkOverlap: 200,
		});

		const splitDocs = await textSplitter.splitDocuments(docs);

		return splitDocs as VectorChunk;
	}

	function calculateChunkIds(chunks: VectorChunk): VectorChunk {
		let lastPageId: string | null = null;
		let currentChunkIndex = 0;

		for (let chunk of chunks) {
			let source = chunk.metadata.source;
			let page = chunk.metadata.loc.pageNumber;
			let currentPageId = `${source}:${page}`;

			if (currentPageId === lastPageId) {
				currentChunkIndex += 1;
			} else {
				currentChunkIndex = 0;
			}

			let chunkId = `${currentPageId}:${currentChunkIndex}`;
			lastPageId = currentPageId;

			chunk.chunkId = chunkId;
			chunk.id = crypto.randomUUID();
		}
		return chunks;
	}

	function addIdToChunk(chunks: VectorChunk) {
		const chunksWithIds = chunks.map((chunk, index) => ({
			...chunk,
			metadata: {
				...chunk.metadata,
				chunkId: chunk.chunkId,
				uuid: chunk.id,
			},
		}));

		return chunksWithIds;
	}

	async function getChunkId() {
		const VectorChunks = await prisma.vectorStore.findMany({
			select: { id: true, metadata: true, chunkId: true },
		});

		const existingChunks = VectorChunks.map((chunk) => {
			if (chunk.metadata) {
				const metadata = JSON.parse(chunk.metadata);
				return metadata.chunkId;
			}
		}).filter((chunkId) => chunkId !== null);

		const existingChunksSet = new Set(existingChunks);

		return existingChunksSet;
	}

	async function updateChunkId() {
		const vectorChunks = await prisma.vectorStore.findMany({
			select: { id: true, metadata: true, chunkId: true },
		});

		for (const chunk of vectorChunks) {
			if (chunk.metadata) {
				const metadata = JSON.parse(chunk.metadata);
				const metadataChunkId = metadata.chunkId;
				if (metadataChunkId && chunk.chunkId !== metadataChunkId) {
					await prisma.vectorStore.update({
						where: { id: chunk.id },
						data: { chunkId: metadataChunkId },
					});
				}
			}
		}
	}

	async function addToDB(chunks: VectorChunk) {
		const chunksWithIds = calculateChunkIds(chunks);
		const finalChunks = addIdToChunk(chunksWithIds);
		const existingChunks = await getChunkId();

		const newChunks = finalChunks.filter(
			(chunk) => !existingChunks.has(chunk.chunkId)
		);

		if (newChunks.length > 0) {
			console.log(`👉 Adding new documents: ${newChunks.length}`);

			const documents: Document[] = newChunks.map((chunk) => ({
				pageContent: chunk.pageContent,
				metadata: {
					...chunk.metadata,
					chunkId: chunk.chunkId,
				},
			}));

			await db.addDocuments(documents);
			await updateChunkId();
		} else {
			console.log("✅ No new new documents to add");
		}
	}

	const path =
		"C:/Users/cokin/OneDrive/Documents/GitHub/local-llm-sqlite/app/assets";

	const docs = await loadDocuments(path);
	const chunks = await splitText(docs);

	addToDB(chunks);
}
