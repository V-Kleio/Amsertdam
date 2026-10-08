import { chatWithFallback } from './src/lib/ai/openrouter';


async function run() {
    try {
        console.log("Sending request...");
        const result = await chatWithFallback(
            [{ role: "user", content: "Respond with exactly the word 'success'." }],
            ["thinkingmachines/inkling:free"]
        );
        console.log("Success! Real message:", result.content);
        console.log("Model used:", result.model);
    } catch (error) {
        console.error("Failed:", error);
    }
}

run();
