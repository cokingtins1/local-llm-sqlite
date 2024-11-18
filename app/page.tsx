import PromptForm from "@/components/custom/PromptForm";
import { Button } from "@/components/ui/newbutton";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { createClient } from "@libsql/client";
import updateDB from "./actions/updateDB";
import { db, prisma } from "@/prisma/_base";

export default function Home() {
	const embeddings = new HuggingFaceInferenceEmbeddings({
		model: "text-embedding-3-small",
	});

	// Local instantiation
	const libsqlClient = createClient({
		url: "file:./dev.db",
	});

	return (
		<div className="flex flex-col items-center w-full">
			<PromptForm />

			<div className="flex items-center gap-4">
				<p>Test DB</p>
				<form
					action={async () => {
						"use server";

						await prisma.vectorStore.deleteMany();

						// console.log(balls[5]);
						// const res = await prisma.prismaLangChain.findMany({
						// 	select: { id: true, chunkId: true, metadata: true },
						// });

						// console.dir(
						// 	res.map((item) => item.chunkId),
						// 	{ maxArrayLength: null }
						// );
					}}
				>
					<Button>Delete Data</Button>
				</form>
			</div>
		</div>
	);
}
