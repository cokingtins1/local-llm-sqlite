-- CreateTable
CREATE TABLE "VectorStore" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "chunkId" TEXT,
    "content" TEXT,
    "metadata" TEXT,
    "embeddings" F32_BLOB(768)
);

CREATE INDEX IF NOT EXISTS idx_VectorStore_embeddings ON VectorStore(libsql_vector_idx(embeddings));


