import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
	createAnimemeClient,
	findTopic,
	findTopicsByTokenAddress,
	PUBLIC_DATA_CATALOG,
	rankHotTopics,
	type AgentContextResponse,
	type AgentContextTopic,
	type AttentionMode,
	type TokenMetricsResponse,
} from "./animeme-client.js";

type ParsedArgs = {
	flags: Record<string, string | true>;
	positionals: string[];
};

type ArtifactPayload = {
	address?: string;
	contextGeneratedAt?: string;
	createdAt: string;
	kind: string;
	topic?: AgentContextTopic | null;
};

async function main() {
	const [command = "scan", ...rawArgs] = process.argv.slice(2);
	const args = parseArgs(rawArgs);
	const client = createAnimemeClient();

	switch (command) {
		case "catalog": {
			const markdown = renderCatalogMarkdown();
			const artifact = await writeArtifacts("catalog", {
				catalog: PUBLIC_DATA_CATALOG,
				createdAt: new Date().toISOString(),
				kind: "catalog",
			});
			await writeFile(artifact.markdownPath, markdown, "utf8");
			console.log(markdown);
			console.log(`\nArtifacts written: ${artifact.markdownPath}, ${artifact.jsonPath}`);
			return;
		}
		case "scan":
		case "hot": {
			const context = await client.getAgentContext();
			const limit = readNumberFlag(args, "limit", 10);
			const markdown = renderScanMarkdown(context, limit);
			const artifact = await writeArtifacts("scan", {
				contextGeneratedAt: context.generatedAt,
				createdAt: new Date().toISOString(),
				kind: "scan",
				topics: rankHotTopics(context, limit),
			});
			await writeFile(artifact.markdownPath, markdown, "utf8");
			console.log(markdown);
			console.log(`\nArtifacts written: ${artifact.markdownPath}, ${artifact.jsonPath}`);
			return;
		}
		case "new": {
			const context = await client.getAgentContext();
			const mode = readModeFlag(args, "mode", "latest");
			const topics = context.topicsByMode[mode] || [];
			const markdown = renderModeMarkdown(context, mode, topics);
			const artifact = await writeArtifacts("new", {
				contextGeneratedAt: context.generatedAt,
				createdAt: new Date().toISOString(),
				kind: "new",
				mode,
				topics,
			});
			await writeFile(artifact.markdownPath, markdown, "utf8");
			console.log(markdown);
			console.log(`\nArtifacts written: ${artifact.markdownPath}, ${artifact.jsonPath}`);
			return;
		}
		case "spotlight": {
			const [spotlight, notifications] = await Promise.all([
				client.getSpotlight({
					historyLimit: readNumberFlag(args, "history-limit", 30),
					limit: readNumberFlag(args, "limit", 15),
				}),
				settleOptional(() => client.getSpotlightPerformanceNotifications()),
			]);
			const markdown = renderSpotlightMarkdown(spotlight, notifications);
			const artifact = await writeArtifacts("spotlight", {
				createdAt: new Date().toISOString(),
				kind: "spotlight",
				notifications,
				spotlight,
			});
			await writeFile(artifact.markdownPath, markdown, "utf8");
			console.log(markdown);
			console.log(`\nArtifacts written: ${artifact.markdownPath}, ${artifact.jsonPath}`);
			return;
		}
		case "learning": {
			const [summary, topics, distribution, keyResources, outcomes] =
				await Promise.all([
					client.getLearningSummary(),
					client.getLearningTopics({
						pageSize: readNumberFlag(args, "page-size", 10),
					}),
					settleOptional(() => client.getLearningAttentionDistribution()),
					settleOptional(() =>
						client.getLearningKeyResources(readStringFlag(args, "bucket") ?? undefined),
					),
					settleOptional(() => client.getLearningSpotlightOutcomes()),
				]);
			const markdown = renderLearningMarkdown({
				distribution,
				keyResources,
				outcomes,
				summary,
				topics,
			});
			const artifact = await writeArtifacts("learning", {
				createdAt: new Date().toISOString(),
				distribution,
				keyResources,
				kind: "learning",
				outcomes,
				summary,
				topics,
			});
			await writeFile(artifact.markdownPath, markdown, "utf8");
			console.log(markdown);
			console.log(`\nArtifacts written: ${artifact.markdownPath}, ${artifact.jsonPath}`);
			return;
		}
		case "topics": {
			const topics = await client.getLearningTopics({
				attentionTheme: readStringFlag(args, "attention-theme"),
				page: readNumberFlag(args, "page", 1),
				pageSize: readNumberFlag(args, "page-size", 20),
				search: readStringFlag(args, "search"),
				tokenAddress: readStringFlag(args, "token"),
				topicType: readStringFlag(args, "topic-type"),
			});
			const markdown = renderTopicsMarkdown(topics);
			const artifact = await writeArtifacts("topics", {
				createdAt: new Date().toISOString(),
				filters: args.flags,
				kind: "topics",
				topics,
			});
			await writeFile(artifact.markdownPath, markdown, "utf8");
			console.log(markdown);
			console.log(`\nArtifacts written: ${artifact.markdownPath}, ${artifact.jsonPath}`);
			return;
		}
		case "topic": {
			const topicId = readRequiredFlag(args, "topic");
			const detail = await client.getLearningTopic(topicId);
			const signals = await settleOptional(() =>
				client.getSpotlightTopicSignals([topicId]),
			);
			const markdown = renderTopicDetailMarkdown(topicId, detail, signals);
			const artifact = await writeArtifacts("topic", {
				createdAt: new Date().toISOString(),
				detail,
				kind: "topic",
				signals,
				topicId,
			});
			await writeFile(artifact.markdownPath, markdown, "utf8");
			console.log(markdown);
			console.log(`\nArtifacts written: ${artifact.markdownPath}, ${artifact.jsonPath}`);
			return;
		}
		case "token": {
			const address = readRequiredFlag(args, "address");
			const [contextResult, metricsResult, learningResult] =
				await Promise.allSettled([
					client.getAgentContext(),
					client.getTokenMetrics([address]),
					client.getLearningTopics({
						pageSize: 10,
						tokenAddress: address,
					}),
				]);
			if (contextResult.status === "rejected" && metricsResult.status === "rejected") {
				throw new Error("Token analysis needs at least live attention or market metrics.");
			}
			const context =
				contextResult.status === "fulfilled" ? contextResult.value : null;
			const metrics =
				metricsResult.status === "fulfilled" ? metricsResult.value : null;
			const learning =
				learningResult.status === "fulfilled" ? learningResult.value : null;
			const attentionTopics = context
				? findTopicsByTokenAddress(context, address)
				: [];
			const markdown = renderTokenMarkdown({
				address,
				attentionTopics,
				context,
				learning,
				metrics,
				warnings: collectSettledWarnings({
					context: contextResult,
					learning: learningResult,
					metrics: metricsResult,
				}),
			});
			const artifact = await writeArtifacts("token", {
				address,
				attentionTopics,
				contextGeneratedAt: context?.generatedAt,
				createdAt: new Date().toISOString(),
				kind: "token",
				learning,
				metrics,
			});
			await writeFile(artifact.markdownPath, markdown, "utf8");
			console.log(markdown);
			console.log(`\nArtifacts written: ${artifact.markdownPath}, ${artifact.jsonPath}`);
			return;
		}
		case "fetch": {
			const apiPath = readRequiredFlag(args, "path");
			const payload = await client.fetchPublicPath(apiPath);
			const artifact = await writeArtifacts("fetch", {
				apiPath,
				createdAt: new Date().toISOString(),
				kind: "fetch",
				payload,
			});
			await writeFile(artifact.markdownPath, renderFetchMarkdown(apiPath, payload), "utf8");
			console.log(JSON.stringify(payload, null, 2));
			console.log(`\nArtifacts written: ${artifact.markdownPath}, ${artifact.jsonPath}`);
			return;
		}
		case "thesis":
		case "risk":
		case "watch": {
			const context = await client.getAgentContext();
			const topic = findTopic(context, readStringFlag(args, "topic"));
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
		default:
			printHelp();
			process.exitCode = 1;
	}
}

function renderCatalogMarkdown() {
	return [
		"# Animeme Public Data Catalog",
		"",
		"One clone, all public Animeme data. These are read-only endpoints for local agents.",
		"",
		...PUBLIC_DATA_CATALOG.flatMap((entry) => [
			`## ${entry.id}`,
			"",
			`- ${entry.method} ${entry.path}`,
			`- ${entry.description}`,
			`- Use for: ${entry.useFor.join(", ")}`,
			"",
		]),
		"## Raw Fetch",
		"",
		"Use `npm run fetch -- --path /api/learning/topics?pageSize=5` for any public Animeme API path.",
	].join("\n");
}

function renderScanMarkdown(context: AgentContextResponse, limit = 10) {
	const hotTopics = rankHotTopics(context, limit);
	const lines = [
		"# Animeme Agent Scan",
		"",
		`Generated: ${context.generatedAt}`,
		`Source: ${context.source}`,
		"",
		"## Hot Topics",
		"",
		...hotTopics.map(
			(topic) =>
				`- ${topic.name} (${topic.mode} #${topic.rank}) score ${topic.attentionScore} / ${formatUsd(topic.netInflow1h)} 1h inflow / ${topic.tokenCount} tokens`,
		),
		"",
		"## Recommended Agent Prompts",
		"",
		...context.recommendedPrompts.map((prompt) => `- ${prompt}`),
		"",
		"## Next Commands",
		"",
		"- `npm run token -- --address <token-address>`",
		"- `npm run spotlight`",
		"- `npm run learning`",
		"- `npm run thesis -- --topic <topic-id>`",
	];
	return lines.join("\n");
}

function renderModeMarkdown(
	context: AgentContextResponse,
	mode: AttentionMode,
	topics: AgentContextTopic[],
) {
	return [
		`# Animeme ${mode} Topics`,
		"",
		`Generated: ${context.generatedAt}`,
		"",
		...topics.slice(0, 12).map(
			(topic) =>
				`- ${topic.name} (#${topic.rank}) score ${topic.attentionScore} / ${formatUsd(topic.netInflow1h)} 1h inflow`,
		),
	].join("\n");
}

function renderSpotlightMarkdown(spotlight: unknown, notifications: unknown) {
	const items = extractItems(spotlight);
	const noteItems = extractItems(notifications);
	return [
		"# Attention Spotlight",
		"",
		"Canonical spotlight payload from Animeme public data.",
		"",
		`Spotlight items detected: ${items.length || "unknown"}`,
		`Notification items detected: ${noteItems.length || "unknown"}`,
		"",
		"## Preview",
		"",
		...previewItems(items, 8),
	].join("\n");
}

function renderLearningMarkdown(payload: {
	distribution: unknown;
	keyResources: unknown;
	outcomes: unknown;
	summary: unknown;
	topics: unknown;
}) {
	return [
		"# Animeme Learning Data",
		"",
		"Loaded summary, topic archive, key resources, spotlight outcomes, and attention distribution where available.",
		"",
		`Summary keys: ${describeKeys(payload.summary)}`,
		`Topic items detected: ${extractItems(payload.topics).length || "unknown"}`,
		`Distribution keys: ${describeKeys(payload.distribution)}`,
		`Key resource keys: ${describeKeys(payload.keyResources)}`,
		`Outcome keys: ${describeKeys(payload.outcomes)}`,
		"",
		"## Topic Preview",
		"",
		...previewItems(extractItems(payload.topics), 8),
	].join("\n");
}

function renderTopicsMarkdown(topics: unknown) {
	const items = extractItems(topics);
	return [
		"# Animeme Learning Topics",
		"",
		`Items detected: ${items.length || "unknown"}`,
		"",
		...previewItems(items, 12),
	].join("\n");
}

function renderTopicDetailMarkdown(
	topicId: string,
	detail: unknown,
	signals: unknown,
) {
	return [
		`# Animeme Topic Detail: ${topicId}`,
		"",
		`Detail keys: ${describeKeys(detail)}`,
		`Signal keys: ${describeKeys(signals)}`,
		"",
		"## Detail Preview",
		"",
		shortJson(detail, 1_500),
	].join("\n");
}

function renderTokenMarkdown(options: {
	address: string;
	attentionTopics: AgentContextTopic[];
	context: AgentContextResponse | null;
	learning: unknown;
	metrics: TokenMetricsResponse | null;
	warnings: string[];
}) {
	const metric = findMetricForAddress(options.metrics, options.address);
	const learningItems = extractItems(options.learning);
	return [
		`# Animeme Token Analysis: ${options.address}`,
		"",
		`Generated: ${new Date().toISOString()}`,
		options.context ? `Attention context: ${options.context.generatedAt}` : "Attention context: unavailable",
		"",
		"## Live Attention Matches",
		"",
		...(options.attentionTopics.length
			? options.attentionTopics.map(
					(topic) =>
						`- ${topic.name} (${topic.mode} #${topic.rank}) score ${topic.attentionScore} / ${formatUsd(topic.netInflow1h)} 1h inflow`,
				)
			: ["- No live Now Attention topic currently links this address."]),
		"",
		"## Market Metrics",
		"",
		...(metric
			? renderMetricLines(metric)
			: ["- Structured market metrics are not available yet for this address."]),
		"",
		"## Learning Matches",
		"",
		...(learningItems.length
			? previewItems(learningItems, 6)
			: ["- No learning archive match returned for this token address."]),
		"",
		"## Risk Read",
		"",
		"- Treat this as research context, not an execution signal.",
		"- If live attention is missing, require an external narrative reason before escalating.",
		"- If liquidity, holder, or volume fields are unavailable, keep the token in observation mode.",
		"",
		...(options.warnings.length
			? ["## Warnings", "", ...options.warnings.map((warning) => `- ${warning}`)]
			: []),
	].join("\n");
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

function renderFetchMarkdown(apiPath: string, payload: unknown) {
	return [
		`# Animeme API Fetch: ${apiPath}`,
		"",
		`Generated: ${new Date().toISOString()}`,
		`Top-level keys: ${describeKeys(payload)}`,
		"",
		"## Preview",
		"",
		shortJson(payload, 1_500),
	].join("\n");
}

async function writeArtifacts(
	kind: string,
	payload: ArtifactPayload & Record<string, unknown>,
) {
	await mkdir("artifacts", { recursive: true });
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	const slug = payload.topic
		? slugify(payload.topic.name)
		: payload.address
			? slugify(payload.address)
			: "context";
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
		return "# Animeme Agent Scan\n\nJSON artifact contains the full scan payload.\n";
	}
	if (payload.topic) {
		return `# ${payload.kind}: ${payload.topic.name}\n\nJSON artifact contains the structured topic payload.\n`;
	}
	return `# ${payload.kind}\n\nJSON artifact contains the structured payload.\n`;
}

function parseArgs(args: string[]): ParsedArgs {
	const parsed: ParsedArgs = {
		flags: {},
		positionals: [],
	};
	for (let index = 0; index < args.length; index += 1) {
		const value = args[index];
		if (!value?.startsWith("--")) {
			parsed.positionals.push(value || "");
			continue;
		}
		const key = value.slice(2);
		const next = args[index + 1];
		if (!next || next.startsWith("--")) {
			parsed.flags[key] = true;
			continue;
		}
		parsed.flags[key] = next;
		index += 1;
	}
	return parsed;
}

function readStringFlag(args: ParsedArgs, name: string) {
	const value = args.flags[name];
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readRequiredFlag(args: ParsedArgs, name: string) {
	const value = readStringFlag(args, name);
	if (!value) {
		throw new Error(`Missing required flag --${name}.`);
	}
	return value;
}

function readNumberFlag(args: ParsedArgs, name: string, fallback: number) {
	const value = readStringFlag(args, name);
	if (!value) {
		return fallback;
	}
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readModeFlag(
	args: ParsedArgs,
	name: string,
	fallback: AttentionMode,
): AttentionMode {
	const value = readStringFlag(args, name);
	return value === "rising" || value === "latest" || value === "viral"
		? value
		: fallback;
}

async function settleOptional<T>(loader: () => Promise<T>) {
	try {
		return await loader();
	} catch (error) {
		return {
			error: error instanceof Error ? error.message : "Optional request failed.",
		};
	}
}

function collectSettledWarnings(
	results: Record<string, PromiseSettledResult<unknown>>,
) {
	return Object.entries(results).flatMap(([label, result]) =>
		result.status === "rejected"
			? [
					`${label} request failed: ${
						result.reason instanceof Error
							? result.reason.message
							: String(result.reason)
					}`,
				]
			: [],
	);
}

function extractItems(payload: unknown): unknown[] {
	if (Array.isArray(payload)) {
		return payload;
	}
	if (!payload || typeof payload !== "object") {
		return [];
	}
	const record = payload as Record<string, unknown>;
	for (const key of ["items", "topics", "data", "cards", "results", "feed"]) {
		const value = record[key];
		if (Array.isArray(value)) {
			return value;
		}
	}
	return [];
}

function previewItems(items: unknown[], limit: number) {
	const preview = items.slice(0, limit).map((item, index) => {
		const title = pickTitle(item) || `Item ${index + 1}`;
		return `- ${title}`;
	});
	return preview.length > 0 ? preview : ["- No previewable items found."];
}

function pickTitle(item: unknown): string | null {
	if (!item || typeof item !== "object") {
		return null;
	}
	const record = item as Record<string, unknown>;
	if (record.item && typeof record.item === "object") {
		const nestedTitle: string | null = pickTitle(record.item);
		if (nestedTitle) {
			return nestedTitle;
		}
	}
	for (const key of [
		"title",
		"name",
		"topicName",
		"topic_name",
		"topic",
		"symbol",
		"id",
	]) {
		const value = record[key];
		if (typeof value === "string" && value.trim()) {
			return value.trim();
		}
	}
	const nestedName = record.name;
	if (nestedName && typeof nestedName === "object") {
		const nested = nestedName as Record<string, unknown>;
		for (const key of ["topicNameEn", "topicNameCn"]) {
			const value = nested[key];
			if (typeof value === "string" && value.trim()) {
				return value.trim();
			}
		}
	}
	return null;
}

function findMetricForAddress(
	metrics: TokenMetricsResponse | null,
	address: string,
) {
	const items = metrics?.items || {};
	const normalized = address.trim().toLowerCase();
	for (const [key, value] of Object.entries(items)) {
		if (key.toLowerCase() === normalized) {
			return value;
		}
		const itemAddress = getStringField(value, ["address", "tokenAddress", "ca"]);
		if (itemAddress?.toLowerCase() === normalized) {
			return value;
		}
	}
	return null;
}

function renderMetricLines(metric: Record<string, unknown>) {
	const fields = [
		["Symbol", ["symbol", "ticker"]],
		["Price", ["priceUsd", "price", "usdPrice"]],
		["Market cap", ["marketCapUsd", "marketCap", "fdvUsd", "fdv"]],
		["Liquidity", ["liquidityUsd", "liquidity"]],
		["24h volume", ["volume24hUsd", "volume24h"]],
		["Holders", ["holders", "holderCount"]],
		["24h change", ["priceChange24h", "priceChange24hPct"]],
		["Top 10 holder share", ["top10HolderPercent"]],
		["Fresh wallet share", ["freshWalletPercent"]],
		["Insider share", ["insiderPercent"]],
		["Smart holders", ["smartHolders"]],
		["KOL holders", ["kolHolders"]],
		["Total fees paid", ["totalFeesPaidSol"]],
	] satisfies readonly [string, readonly string[]][];
	const lines = fields.flatMap(([label, keys]) => {
		const value = getField(metric, keys);
		return value == null ? [] : [`- ${label}: ${formatMetricValue(value)}`];
	});
	return lines.length > 0
		? lines
		: ["- Structured market metrics returned. See JSON artifact for raw fields."];
}

function getField(record: Record<string, unknown>, keys: readonly string[]) {
	for (const key of keys) {
		if (record[key] != null && record[key] !== "") {
			return record[key];
		}
	}
	return null;
}

function getStringField(record: Record<string, unknown>, keys: readonly string[]) {
	const value = getField(record, keys);
	return typeof value === "string" ? value : null;
}

function describeKeys(value: unknown) {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return "none";
	}
	return Object.keys(value as Record<string, unknown>).slice(0, 12).join(", ") || "none";
}

function shortJson(value: unknown, maxLength: number) {
	const text = JSON.stringify(value, null, 2);
	return text.length > maxLength ? `${text.slice(0, maxLength)}\n...` : text;
}

function formatMetricValue(value: unknown) {
	if (typeof value === "number") {
		if (Math.abs(value) >= 1_000) {
			return formatUsd(value);
		}
		return Intl.NumberFormat("en", {
			maximumFractionDigits: 6,
		}).format(value);
	}
	return String(value);
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
  npm run catalog
  npm run scan
  npm run hot -- --limit 20
  npm run new -- --mode latest
  npm run spotlight
  npm run learning
  npm run topics -- --search <query>
  npm run topic -- --topic <topic-id>
  npm run token -- --address <token-address>
  npm run fetch -- --path /api/learning/topics?pageSize=5
  npm run thesis -- --topic <topic-id>
  npm run risk -- --topic <topic-id>
  npm run watch -- --topic <topic-id>
`);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
