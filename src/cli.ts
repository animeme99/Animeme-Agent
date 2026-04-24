import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
	createAnimemeClient,
	findTopic,
	type AgentContextResponse,
	type AgentContextTopic,
} from "./animeme-client.js";

type ArtifactPayload = {
	contextGeneratedAt: string;
	createdAt: string;
	kind: string;
	topic?: AgentContextTopic | null;
};

async function main() {
	const [command = "scan", ...args] = process.argv.slice(2);
	const client = createAnimemeClient();

	if (command === "scan") {
		const context = await client.getAgentContext();
		const markdown = renderScanMarkdown(context);
		const artifact = await writeArtifacts("scan", {
			contextGeneratedAt: context.generatedAt,
			createdAt: new Date().toISOString(),
			kind: "scan",
			topics: context.spotlight,
		});
		await writeFile(artifact.markdownPath, markdown, "utf8");
		console.log(markdown);
		console.log(`\nArtifacts written: ${artifact.markdownPath}, ${artifact.jsonPath}`);
		return;
	}

	if (command === "thesis" || command === "risk" || command === "watch") {
		const context = await client.getAgentContext();
		const topic = findTopic(context, readArg(args, "--topic"));
		if (!topic) {
			throw new Error("No Animeme topic is available. Try npm run scan first.");
		}

		const markdown =
			command === "thesis"
				? renderThesisMarkdown(topic, context)
				: command === "risk"
					? renderRiskMarkdown(topic, context)
					: renderWatchMarkdown(topic, context);
		const artifact = await writeArtifacts(command, {
			contextGeneratedAt: context.generatedAt,
			createdAt: new Date().toISOString(),
			kind: command,
			topic,
		});
		await writeFile(artifact.markdownPath, markdown, "utf8");
		console.log(markdown);
		console.log(`\nArtifacts written: ${artifact.markdownPath}, ${artifact.jsonPath}`);
		return;
	}

	printHelp();
	process.exitCode = 1;
}

function renderScanMarkdown(context: AgentContextResponse) {
	const lines = [
		"# Animeme Agent Scan",
		"",
		`Generated: ${context.generatedAt}`,
		`Source: ${context.source}`,
		"",
		"## Spotlight",
		"",
		...context.spotlight.map(
			(topic) =>
				`- ${topic.name} (${topic.mode} #${topic.rank}) score ${topic.attentionScore} / ${formatUsd(topic.netInflow1h)} 1h inflow`,
		),
		"",
		"## Recommended Prompts",
		"",
		...context.recommendedPrompts.map((prompt) => `- ${prompt}`),
	];
	return lines.join("\n");
}

function renderThesisMarkdown(
	topic: AgentContextTopic,
	context: AgentContextResponse,
) {
	const leadToken = topic.topTokens[0] || null;
	return [
		`# Thesis: ${topic.name}`,
		"",
		`Generated: ${new Date().toISOString()}`,
		`Context: ${context.generatedAt}`,
		`Board: ${topic.mode} #${topic.rank}`,
		"",
		"## Read",
		"",
		`${topic.name} is worth monitoring because Animeme sees active attention now. The agent should treat this as a watch candidate, not an execution signal.`,
		"",
		"## Signals",
		"",
		`- Attention score: ${topic.attentionScore}`,
		`- Linked tokens: ${topic.tokenCount}`,
		`- 1h net inflow: ${formatUsd(topic.netInflow1h)}`,
		`- Lead token: ${leadToken ? leadToken.symbol : "none"}`,
		"",
		"## Next Agent Task",
		"",
		"Run `npm run risk -- --topic " + topic.id + "` before escalating.",
	].join("\n");
}

function renderRiskMarkdown(
	topic: AgentContextTopic,
	context: AgentContextResponse,
) {
	const leadToken = topic.topTokens[0] || null;
	return [
		`# Risk Review: ${topic.name}`,
		"",
		`Generated: ${new Date().toISOString()}`,
		`Context: ${context.generatedAt}`,
		"",
		"## Checklist",
		"",
		`- Token surface: ${topic.topTokens.length > 0 ? "visible" : "missing"}`,
		`- Liquidity: ${leadToken ? formatUsd(leadToken.liquidity) : "not available"}`,
		`- Narrative summary: ${topic.summary.length > 120 ? "usable" : "thin"}`,
		`- Invalidation: stop if ${topic.name} drops out of rising/latest/viral boards.`,
		"",
		"## Safety",
		"",
		"This repo is read-only. Do not sign, trade, or request private keys.",
	].join("\n");
}

function renderWatchMarkdown(
	topic: AgentContextTopic,
	context: AgentContextResponse,
) {
	return [
		`# Watch Plan: ${topic.name}`,
		"",
		`Generated: ${new Date().toISOString()}`,
		`Context: ${context.generatedAt}`,
		"",
		"## Loop",
		"",
		"- Re-run `npm run scan` every 15 minutes.",
		`- Keep watching while ${topic.name} remains top 5 in any mode.`,
		"- Compare 1h inflow, liquidity, and lead token market cap before escalating.",
		"- Publish a short artifact only after risk review passes.",
	].join("\n");
}

async function writeArtifacts(
	kind: string,
	payload: ArtifactPayload & Record<string, unknown>,
) {
	await mkdir("artifacts", { recursive: true });
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	const slug = payload.topic ? slugify(payload.topic.name) : "context";
	const base = path.join("artifacts", `${timestamp}-${kind}-${slug}`);
	const jsonPath = `${base}.json`;
	const markdownPath = `${base}.md`;
	await writeFile(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
	await writeFile(markdownPath, renderArtifactSummary(payload), "utf8");
	return {
		jsonPath,
		markdownPath,
	};
}

function renderArtifactSummary(payload: ArtifactPayload & Record<string, unknown>) {
	if (payload.kind === "scan") {
		return "# Animeme Agent Scan\n\nJSON artifact contains the full spotlight payload.\n";
	}
	if (payload.topic) {
		return `# ${payload.kind}: ${payload.topic.name}\n\nJSON artifact contains the structured topic payload.\n`;
	}
	return `# ${payload.kind}\n\nJSON artifact contains the structured payload.\n`;
}

function readArg(args: string[], name: string) {
	const index = args.indexOf(name);
	if (index === -1) {
		return null;
	}
	return args[index + 1] || null;
}

function formatUsd(value: number) {
	if (!(value > 0)) {
		return "n/a";
	}
	return `$${Intl.NumberFormat("en", {
		compactDisplay: "short",
		maximumFractionDigits: 1,
		notation: "compact",
	}).format(value)}`;
}

function slugify(value: string) {
	return (
		value
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "")
			.slice(0, 48) || "topic"
	);
}

function printHelp() {
	console.log(`Animeme Agent

Commands:
  npm run scan
  npm run thesis -- --topic <topic-id>
  npm run risk -- --topic <topic-id>
  npm run watch -- --topic <topic-id>
`);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
