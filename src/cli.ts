import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
	createAnimemeClient,
	DEFAULT_ANIMEME_API_BASE_URL,
	findTopic,
	findTopicsByTokenAddress,
	PUBLIC_DATA_CATALOG,
	rankHotTopics,
	type AgentContextResponse,
	type AgentContextTopic,
	type AnimemeClient,
	type AttentionMode,
	type TokenMetricsResponse,
} from "./animeme-client.js";
import {
	buildTokenIntelligenceReport,
	findMetricForAddress,
	type TokenIntelligenceReport,
} from "./token-intelligence.js";

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

type OptionalFailure = {
	error: string;
};

type PublicContextBundle = {
	agentContext: AgentContextResponse | OptionalFailure;
	createdAt: string;
	learningAttentionDistribution: unknown;
	learningKeyResources: unknown;
	learningSpotlightOutcomes: unknown;
	learningSummary: unknown;
	learningTopics: unknown;
	spotlight: unknown;
	spotlightNotifications: unknown;
};

type DoctorCheck = {
	detail: string;
	endpoint?: string;
	label: string;
	status: "fail" | "ok" | "warn";
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
		case "doctor": {
			const report = await runDoctor(client);
			const markdown = renderDoctorMarkdown(report);
			const artifact = await writeArtifacts("doctor", {
				...report,
				kind: "doctor",
			});
			await writeFile(artifact.markdownPath, markdown, "utf8");
			console.log(markdown);
			console.log(`\nArtifacts written: ${artifact.markdownPath}, ${artifact.jsonPath}`);
			return;
		}
		case "brief":
		case "context":
		case "demo": {
			const bundle = await loadPublicContextBundle(client, args);
			const markdown = renderPublicContextMarkdown(bundle, command);
			const artifact = await writeArtifacts(command, {
				...bundle,
				contextGeneratedAt: isAgentContextResponse(bundle.agentContext)
					? bundle.agentContext.generatedAt
					: undefined,
				kind: command,
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
		case "token":
		case "token-deep": {
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
			const learningItems = extractItems(learning);
			const report = buildTokenIntelligenceReport({
				address,
				attentionTopics,
				learningItems,
				metrics,
			});
			const markdown = renderTokenMarkdown({
				address,
				attentionTopics,
				context,
				deep: command === "token-deep" || Boolean(args.flags.deep),
				learning,
				metrics,
				report,
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
				kind: command,
				learning,
				metrics,
				report,
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
		"One clone, all public Animeme data. These are read-only endpoints for user-controlled agents.",
		"",
		"Fast start:",
		"",
		"- `npm run doctor` checks local setup and public API reachability.",
		"- `npm run demo` builds one full public context bundle for a new user.",
		"- `npm run brief` is the daily operator brief.",
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

async function runDoctor(client: AnimemeClient) {
	const createdAt = new Date().toISOString();
	const nodeMajor = Number(process.versions.node.split(".")[0]);
	const baseUrl =
		process.env.ANIMEME_API_BASE_URL || DEFAULT_ANIMEME_API_BASE_URL;
	const checks: DoctorCheck[] = [
		{
			detail: `Detected ${process.version}. This kit expects Node 20 or newer.`,
			label: "Node runtime",
			status: nodeMajor >= 20 ? "ok" : "fail",
		},
		{
			detail: `Using ${baseUrl}. Override with ANIMEME_API_BASE_URL when testing another deployment.`,
			label: "Base URL",
			status: "ok",
		},
	];

	const endpointChecks = await Promise.allSettled([
		client.getAgentContext(),
		client.getSpotlight({ historyLimit: 1, limit: 1 }),
		client.getLearningSummary(),
		client.getLearningTopics({ pageSize: 1 }),
	]);
	const labels = [
		{
			endpoint: "/api/now-attention-feed",
			label: "Now Attention",
			summarize: (value: unknown) =>
				isAgentContextResponse(value)
					? `${value.topics.length} current topics across rising/latest/viral.`
					: "Public attention endpoint returned data.",
		},
		{
			endpoint: "/api/spotlight",
			label: "Attention Spotlight",
			summarize: (value: unknown) =>
				`${extractItems(value).length || "unknown"} spotlight items available.`,
		},
		{
			endpoint: "/api/learning/summary",
			label: "Narrative Learning summary",
			summarize: (value: unknown) => `Top-level keys: ${describeKeys(value)}.`,
		},
		{
			endpoint: "/api/learning/topics",
			label: "Explore Narrative topics",
			summarize: (value: unknown) =>
				`${extractItems(value).length || "unknown"} topic items available.`,
		},
	];

	for (const [index, result] of endpointChecks.entries()) {
		const meta = labels[index];
		checks.push({
			detail:
				result.status === "fulfilled"
					? meta.summarize(result.value)
					: result.reason instanceof Error
						? result.reason.message
						: String(result.reason),
			endpoint: meta.endpoint,
			label: meta.label,
			status: result.status === "fulfilled" ? "ok" : "warn",
		});
	}

	return {
		baseUrl,
		checks,
		createdAt,
		ready:
			checks.some(
				(check) => check.status === "ok" && check.endpoint === "/api/now-attention-feed",
			) && nodeMajor >= 20,
	};
}

function renderDoctorMarkdown(report: {
	baseUrl: string;
	checks: DoctorCheck[];
	createdAt: string;
	ready: boolean;
}) {
	return [
		"# Animeme Agent Doctor",
		"",
		`Generated: ${report.createdAt}`,
		`Base URL: ${report.baseUrl}`,
		`Status: ${report.ready ? "ready" : "degraded"}`,
		"",
		"## Checks",
		"",
		...report.checks.map(
			(check) =>
				`- ${check.status.toUpperCase()} ${check.label}: ${check.detail}`,
		),
		"",
		"## Next",
		"",
		report.ready
			? "- Run `npm run demo` to load the full public ANIMEME context bundle."
			: "- Fix failed checks, then run `npm run doctor` again. Optional endpoint warnings can still be used as missing-data notes.",
	].join("\n");
}

async function loadPublicContextBundle(
	client: AnimemeClient,
	args: ParsedArgs,
): Promise<PublicContextBundle> {
	const [
		agentContext,
		spotlight,
		spotlightNotifications,
		learningSummary,
		learningTopics,
		learningKeyResources,
		learningSpotlightOutcomes,
		learningAttentionDistribution,
	] = await Promise.all([
		settleOptional(() => client.getAgentContext()),
		settleOptional(() =>
			client.getSpotlight({
				historyLimit: readNumberFlag(args, "history-limit", 30),
				limit: readNumberFlag(args, "spotlight-limit", 15),
			}),
		),
		settleOptional(() => client.getSpotlightPerformanceNotifications()),
		settleOptional(() => client.getLearningSummary()),
		settleOptional(() =>
			client.getLearningTopics({
				pageSize: readNumberFlag(args, "page-size", 20),
				search: readStringFlag(args, "search"),
			}),
		),
		settleOptional(() =>
			client.getLearningKeyResources(readStringFlag(args, "bucket") ?? undefined),
		),
		settleOptional(() => client.getLearningSpotlightOutcomes()),
		settleOptional(() => client.getLearningAttentionDistribution()),
	]);

	return {
		agentContext,
		createdAt: new Date().toISOString(),
		learningAttentionDistribution,
		learningKeyResources,
		learningSpotlightOutcomes,
		learningSummary,
		learningTopics,
		spotlight,
		spotlightNotifications,
	};
}

function renderPublicContextMarkdown(
	bundle: PublicContextBundle,
	command: string,
) {
	const context = isAgentContextResponse(bundle.agentContext)
		? bundle.agentContext
		: null;
	const hotTopics = context ? rankHotTopics(context, 8) : [];
	const strongestTopic = hotTopics[0] || null;
	const leadToken = strongestTopic?.topTokens[0] || null;
	const learningItems = extractItems(bundle.learningTopics);
	const spotlightItems = extractItems(bundle.spotlight);
	const modeLabel =
		command === "demo"
			? "Demo"
			: command === "context"
				? "Full Public Context"
				: "Daily Brief";

	return [
		`# Animeme Agent ${modeLabel}`,
		"",
		`Generated: ${bundle.createdAt}`,
		context ? `Attention context: ${context.generatedAt}` : "Attention context: unavailable",
		context ? `Source: ${context.source}` : formatMissing(bundle.agentContext),
		"",
		"## What Is Loaded",
		"",
		`- Now Attention: ${context ? `${context.topics.length} topics across rising/latest/viral` : formatMissing(bundle.agentContext)}`,
		`- Attention Spotlight: ${describeItemsOrMissing(bundle.spotlight)}`,
		`- Spotlight notifications: ${describeItemsOrMissing(bundle.spotlightNotifications)}`,
		`- Learning summary: ${describeKeysOrMissing(bundle.learningSummary)}`,
		`- Narrative topics: ${describeItemsOrMissing(bundle.learningTopics)}`,
		`- Key resources: ${describeKeysOrMissing(bundle.learningKeyResources)}`,
		`- Spotlight outcomes: ${describeKeysOrMissing(bundle.learningSpotlightOutcomes)}`,
		`- Attention distribution: ${describeKeysOrMissing(bundle.learningAttentionDistribution)}`,
		"",
		"## Strongest Current Attention Reads",
		"",
		...(hotTopics.length
			? hotTopics.map((topic) => {
					const token = topic.topTokens[0];
					const tokenText = token?.address
						? ` lead ${token.symbol} ${token.address}`
						: " no lead token";
					return `- ${topic.name} (${topic.mode} #${topic.rank}, id ${topic.id}) score ${topic.attentionScore}, ${formatUsd(topic.netInflow1h)} 1h inflow,${tokenText}`;
				})
			: ["- No live topics available from Now Attention."]),
		"",
		"## Spotlight Preview",
		"",
		...previewItems(spotlightItems, 6),
		"",
		"## Narrative Memory Preview",
		"",
		...previewItems(learningItems, 6),
		"",
		"## Easiest Next Commands",
		"",
		strongestTopic
			? `- Topic thesis: \`npm run thesis -- --topic ${strongestTopic.id}\``
			: "- Topic thesis: run `npm run scan` after public attention data returns.",
		strongestTopic
			? `- Topic risk: \`npm run risk -- --topic ${strongestTopic.id}\``
			: "- Topic risk: run after selecting a topic id.",
		leadToken?.address
			? `- Lead token deep review: \`npm run token:deep -- --address ${leadToken.address}\``
			: "- Token deep review: `npm run token:deep -- --address <token-address>`",
		"- Search memory: `npm run topics -- --search <narrative>`",
		"- Raw endpoint: `npm run fetch -- --path /api/learning/topics?pageSize=5`",
		"",
		"## Agent Guidance",
		"",
		"- Explain attention, catalyst, crowd state, confirmation, and invalidation.",
		"- Treat missing public data as missing data, not as a bullish signal.",
		"- Keep outputs advisory. Do not trade, sign, or request private keys.",
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
	deep?: boolean;
	learning: unknown;
	metrics: TokenMetricsResponse | null;
	report: TokenIntelligenceReport;
	warnings: string[];
}) {
	const metric = findMetricForAddress(options.metrics, options.address);
	const learningItems = extractItems(options.learning);
	return [
		`# Animeme Token Analysis: ${options.address}`,
		"",
		`Generated: ${new Date().toISOString()}`,
		options.context ? `Attention context: ${options.context.generatedAt}` : "Attention context: unavailable",
		`Animeme Intelligence Score: ${options.report.score}/100 (${options.report.verdict}, ${options.report.confidence} confidence)`,
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
		"## Intelligence Read",
		"",
		`- Verdict: ${options.report.verdict}`,
		`- Confidence: ${options.report.confidence}`,
		`- Score: ${options.report.score}/100`,
		...(options.report.strengths.length
			? options.report.strengths.map((item) => `- Strength: ${item}`)
			: ["- Strength: No confirmed strength yet."]),
		...(options.report.warnings.length
			? options.report.warnings.map((item) => `- Warning: ${item}`)
			: ["- Warning: No major warning from available neutral metrics."]),
		...(options.report.hardStops.length
			? options.report.hardStops.map((item) => `- Hard stop: ${item}`)
			: []),
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
		...(options.deep
			? renderDeepTokenChecklist(options.report)
			: ["Run `npm run token:deep -- --address " + options.address + "` for the full due-diligence checklist."]),
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

function isOptionalFailure(value: unknown): value is OptionalFailure {
	return Boolean(
		value &&
			typeof value === "object" &&
			typeof (value as OptionalFailure).error === "string",
	);
}

function isAgentContextResponse(value: unknown): value is AgentContextResponse {
	return Boolean(
		value &&
			typeof value === "object" &&
			Array.isArray((value as AgentContextResponse).topics) &&
			Array.isArray((value as AgentContextResponse).spotlight),
	);
}

function formatMissing(value: unknown) {
	return isOptionalFailure(value) ? `unavailable (${value.error})` : "unavailable";
}

function describeKeysOrMissing(value: unknown) {
	return isOptionalFailure(value) ? formatMissing(value) : describeKeys(value);
}

function describeItemsOrMissing(value: unknown) {
	if (isOptionalFailure(value)) {
		return formatMissing(value);
	}
	const items = extractItems(value);
	return items.length > 0 ? `${items.length} items` : `keys: ${describeKeys(value)}`;
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

function renderDeepTokenChecklist(report: TokenIntelligenceReport) {
	return [
		"## Deep Due-Diligence Checklist",
		"",
		`- Concentration: ${formatProfileValue(report.marketProfile.top10HolderPercent)} top-10 holder share.`,
		`- Creator/dev exposure: ${formatProfileValue(report.marketProfile.creatorDevHoldingPercent)}.`,
		`- Insider pressure: ${formatProfileValue(report.marketProfile.insiderPercent)}.`,
		`- Bundled activity: ${formatProfileValue(report.marketProfile.bundlerPercent)}.`,
		`- Fresh-wallet mix: ${formatProfileValue(report.marketProfile.freshWalletPercent)}.`,
		`- Smart holders: ${formatCountValue(report.marketProfile.smartHolders)}.`,
		`- KOL holders: ${formatCountValue(report.marketProfile.kolHolders)}.`,
		"- Next step: compare this score against live attention. Do not escalate if the token has no attention match and weak neutral metrics.",
	];
}

function getField(record: Record<string, unknown>, keys: readonly string[]) {
	for (const key of keys) {
		if (record[key] != null && record[key] !== "") {
			return record[key];
		}
	}
	return null;
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

function formatProfileValue(value: number | null) {
	if (value == null) {
		return "unavailable";
	}
	return `${Intl.NumberFormat("en", {
		maximumFractionDigits: 2,
	}).format(value)}%`;
}

function formatCountValue(value: number | null) {
	if (value == null) {
		return "unavailable";
	}
	return Intl.NumberFormat("en", {
		maximumFractionDigits: 0,
	}).format(value);
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
  npm run doctor
  npm run demo
  npm run brief
  npm run context
  npm run catalog
  npm run scan
  npm run hot -- --limit 20
  npm run new -- --mode latest
  npm run spotlight
  npm run learning
  npm run topics -- --search <query>
  npm run topic -- --topic <topic-id>
  npm run token -- --address <token-address>
  npm run token:deep -- --address <token-address>
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
