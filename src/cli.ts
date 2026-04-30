import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
	BINANCE_SPOT_PUBLIC_PATHS,
	checkBinancePublicAccess,
	fetchBinanceSpotPublicPath,
	fetchBinanceWeb3,
	getBinanceMarketBundle,
	type BinanceMarketBundle,
	type BinanceWeb3Mode,
} from "./binance-client.js";
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
	getDirectGmgnTokenMetrics,
	getGmgnCredentialState,
	type GmgnCredentialState,
} from "./gmgn-client.js";
import {
	buildTokenIntelligenceReport,
	findMetricForAddress,
	type TokenIntelligenceReport,
} from "./token-intelligence.js";

type ParsedArgs = {
	flags: Record<string, string | true>;
	positionals: string[];
};

type AnswerRoute =
	| "doctor"
	| "help"
	| "narrative"
	| "provider"
	| "spotlight"
	| "token"
	| "trending";

type ArtifactPayload = {
	address?: string;
	contextGeneratedAt?: string;
	createdAt: string;
	kind: string;
	prompt?: string;
	symbol?: string;
	topic?: AgentContextTopic | null;
};

type PromptAnswerResult = {
	address?: string;
	createdAt: string;
	markdown: string;
	payload: Record<string, unknown>;
	prompt: string;
	route: AnswerRoute;
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

type MetricSourceStatus =
	| "empty"
	| "failed"
	| "loaded"
	| "missing-key"
	| "partial";

type TokenMetricDiagnostics = {
	animemeMarket: {
		error?: string;
		status: MetricSourceStatus;
	};
	complete: boolean;
	gmgn: {
		credential: GmgnCredentialState;
		error?: string;
		missingFields: string[];
		status: MetricSourceStatus;
	};
};

type TokenAnalysisBundle = {
	address: string;
	animemeMetrics: TokenMetricsResponse | null;
	attentionTopics: AgentContextTopic[];
	context: AgentContextResponse | null;
	deep: boolean;
	gmgnMetrics: TokenMetricsResponse | null;
	learning: unknown;
	metricDiagnostics: TokenMetricDiagnostics;
	metrics: TokenMetricsResponse | null;
	report: TokenIntelligenceReport;
	warnings: string[];
};

const REQUIRED_GMGN_METRIC_FIELDS = [
	{
		keys: ["top10HolderPercent", "gmgnTop10HolderPercent"],
		label: "top-10 holder share",
	},
	{
		keys: ["creatorDevHoldingPercent", "gmgnCreatorDevHoldingPercent"],
		label: "creator/dev holding share",
	},
	{
		keys: ["insiderPercent", "gmgnInsiderPercent"],
		label: "insider pressure",
	},
	{
		keys: ["bundlerPercent", "gmgnBundlerPercent"],
		label: "bundled activity",
	},
] satisfies readonly { keys: readonly string[]; label: string }[];

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
		case "answer": {
			const answer = await buildPromptAnswer(client, args);
			const artifact = await writeArtifacts("answer", {
				...answer.payload,
				address: answer.address,
				createdAt: answer.createdAt,
				kind: "answer",
				prompt: answer.prompt,
				route: answer.route,
				topic: answer.topic,
			});
			await writeFile(artifact.markdownPath, answer.markdown, "utf8");
			console.log(answer.markdown);
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
			const limit = readNumberFlagOrPosition(args, "limit", 0, 10);
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
			const mode = readModeFlagOrPosition(args, "mode", 0, "latest");
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
				search: readStringFlagOrPosition(args, "search", 0),
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
			const topicId = readRequiredFlagOrPosition(args, "topic", 0);
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
			const address = readRequiredFlagOrPosition(args, "address", 0);
			const deep = command === "token-deep" || Boolean(args.flags.deep);
			const analysis = await loadTokenAnalysis(client, address, deep);
			const markdown = renderTokenMarkdown(analysis);
			const artifact = await writeArtifacts("token", {
				address,
				animemeMetrics: analysis.animemeMetrics,
				attentionTopics: analysis.attentionTopics,
				contextGeneratedAt: analysis.context?.generatedAt,
				createdAt: new Date().toISOString(),
				gmgnMetrics: analysis.gmgnMetrics,
				kind: command,
				learning: analysis.learning,
				metricDiagnostics: analysis.metricDiagnostics,
				metrics: analysis.metrics,
				report: analysis.report,
			});
			await writeFile(artifact.markdownPath, markdown, "utf8");
			console.log(markdown);
			console.log(`\nArtifacts written: ${artifact.markdownPath}, ${artifact.jsonPath}`);
			return;
		}
		case "gmgn": {
			const address = readRequiredFlagOrPosition(args, "address", 0);
			const metrics = await getDirectGmgnTokenMetrics([address]);
			const markdown = renderGmgnMarkdown(address, metrics);
			const artifact = await writeArtifacts("gmgn", {
				address,
				createdAt: new Date().toISOString(),
				kind: "gmgn",
				metrics,
			});
			await writeFile(artifact.markdownPath, markdown, "utf8");
			console.log(markdown);
			console.log(`\nArtifacts written: ${artifact.markdownPath}, ${artifact.jsonPath}`);
			return;
		}
		case "binance": {
			const symbol = readStringFlagOrPosition(args, "symbol", 0) || "SOLUSDT";
			const bundle = await getBinanceMarketBundle({
				address: readStringFlag(args, "address") || args.positionals[1],
				chainId:
					readStringFlag(args, "chain-id") ||
					readStringFlag(args, "chainId") ||
					args.positionals[2],
				interval: readStringFlag(args, "interval"),
				limit: readNumberFlag(args, "limit", 100),
				platform: readStringFlag(args, "platform"),
				symbol,
			});
			const markdown = renderBinanceBundleMarkdown(bundle);
			const artifact = await writeArtifacts("binance", {
				...bundle,
				createdAt: new Date().toISOString(),
				kind: "binance",
			});
			await writeFile(artifact.markdownPath, markdown, "utf8");
			console.log(markdown);
			console.log(`\nArtifacts written: ${artifact.markdownPath}, ${artifact.jsonPath}`);
			return;
		}
		case "binance-spot": {
			const apiPath = readRequiredFlagOrPosition(args, "path", 0);
			const payload = await fetchBinanceSpotPublicPath(
				apiPath,
				buildBinanceSpotQueryParams(args),
			);
			const markdown = renderProviderFetchMarkdown(
				"Binance Spot",
				apiPath,
				payload,
			);
			const artifact = await writeArtifacts("binance-spot", {
				apiPath,
				createdAt: new Date().toISOString(),
				kind: "binance-spot",
				payload,
			});
			await writeFile(artifact.markdownPath, markdown, "utf8");
			console.log(JSON.stringify(payload, null, 2));
			console.log(`\nArtifacts written: ${artifact.markdownPath}, ${artifact.jsonPath}`);
			return;
		}
		case "binance-web3": {
			const mode = readBinanceWeb3Mode(
				readStringFlagOrPosition(args, "mode", 0),
			);
			const payload = await fetchBinanceWeb3({
				chainId: readStringFlag(args, "chain-id") || readStringFlag(args, "chainId"),
				chainIds:
					readStringFlag(args, "chain-ids") ||
					readStringFlag(args, "chainIds") ||
					args.positionals[2],
				contractAddress:
					readStringFlag(args, "address") ||
					readStringFlag(args, "contract-address") ||
					readStringFlag(args, "contractAddress") ||
					(mode === "search" ? null : args.positionals[1]),
				from: readStringFlag(args, "from"),
				interval: readStringFlag(args, "interval"),
				keyword: readStringFlag(args, "keyword") || args.positionals[1],
				limit: readStringFlag(args, "limit"),
				mode,
				orderBy: readStringFlag(args, "order-by") || readStringFlag(args, "orderBy"),
				platform: readStringFlag(args, "platform"),
				pm: readStringFlag(args, "pm"),
				to: readStringFlag(args, "to"),
			});
			const markdown = renderProviderFetchMarkdown(
				"Binance Web3",
				mode,
				payload,
			);
			const artifact = await writeArtifacts("binance-web3", {
				createdAt: new Date().toISOString(),
				kind: "binance-web3",
				mode,
				payload,
			});
			await writeFile(artifact.markdownPath, markdown, "utf8");
			console.log(JSON.stringify(payload, null, 2));
			console.log(`\nArtifacts written: ${artifact.markdownPath}, ${artifact.jsonPath}`);
			return;
		}
		case "fetch": {
			const apiPath = readRequiredFlagOrPosition(args, "path", 0);
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
			const topic = findTopic(context, readStringFlagOrPosition(args, "topic", 0));
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
		"- Complete `token:deep` analysis also needs `GMGN_API_KEY` for direct GMGN market metrics.",
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
		"",
		"## Direct Provider Access",
		"",
		"- GMGN: `npm run gmgn -- --address <solana-token-address>` uses `GMGN_API_KEY` for raw token metrics.",
		"- Binance bundle: `npm run binance -- --symbol SOLUSDT` loads Spot ticker, book ticker, and klines.",
		"- Binance Spot raw: `npm run binance:spot -- --path /api/v3/ticker/24hr --symbol SOLUSDT`.",
		"- Binance Web3 raw: `npm run binance:web3 -- --mode search --keyword <token>`.",
		"",
		"Binance Spot public allowlist:",
		"",
		...BINANCE_SPOT_PUBLIC_PATHS.map((entry) => `- ${entry}`),
	].join("\n");
}

async function buildPromptAnswer(
	client: AnimemeClient,
	args: ParsedArgs,
): Promise<PromptAnswerResult> {
	const createdAt = new Date().toISOString();
	const prompt = readPrompt(args);
	const route = prompt ? detectAnswerRoute(prompt) : "help";

	if (!prompt || route === "help") {
		return buildHelpPromptAnswer(prompt || "help", createdAt);
	}

	if (route === "doctor") {
		const report = await runDoctor(client);
		return {
			createdAt,
			markdown: renderDoctorMarkdown(report),
			payload: {
				report,
			},
			prompt,
			route,
		};
	}

	if (route === "trending") {
		return buildTrendingPromptAnswer(client, prompt, createdAt);
	}

	if (route === "spotlight") {
		return buildSpotlightPromptAnswer(client, args, prompt, createdAt);
	}

	if (route === "narrative") {
		const query = extractNarrativeQuery(prompt);
		if (!query) {
			return buildTrendingPromptAnswer(client, prompt, createdAt);
		}
		return buildNarrativePromptAnswer(client, prompt, query, createdAt);
	}

	const address =
		extractSolanaAddress(prompt) ||
		readStringFlag(args, "address") ||
		readStringFlag(args, "token");
	if (!address) {
		return buildMissingAddressPromptAnswer(prompt, route, createdAt);
	}

	if (route === "provider") {
		return buildProviderPromptAnswer(client, args, prompt, address, createdAt);
	}

	return buildTokenPromptAnswer(client, args, prompt, address, createdAt);
}

async function buildTokenPromptAnswer(
	client: AnimemeClient,
	args: ParsedArgs,
	prompt: string,
	address: string,
	createdAt: string,
): Promise<PromptAnswerResult> {
	const symbol = readStringFlag(args, "symbol") || "SOLUSDT";
	const [analysis, binanceBundle] = await Promise.all([
		loadTokenAnalysis(client, address, true),
		settleOptional(() =>
			getBinanceMarketBundle({
				address,
				limit: readNumberFlag(args, "limit", 50),
				symbol,
			}),
		),
	]);
	const markdown = renderTokenPromptAnswerMarkdown({
		analysis,
		binanceBundle,
		createdAt,
		prompt,
		symbol,
	});
	return {
		address,
		createdAt,
		markdown,
		payload: {
			analysis,
			binanceBundle,
			symbol,
		},
		prompt,
		route: "token",
		topic: analysis.attentionTopics[0] || null,
	};
}

async function buildTrendingPromptAnswer(
	client: AnimemeClient,
	prompt: string,
	createdAt: string,
): Promise<PromptAnswerResult> {
	const context = await client.getAgentContext();
	const topics = rankHotTopics(context, 8);
	const markdown = renderTrendingPromptAnswerMarkdown({
		context,
		createdAt,
		prompt,
		topics,
	});
	return {
		createdAt,
		markdown,
		payload: {
			contextGeneratedAt: context.generatedAt,
			topics,
		},
		prompt,
		route: "trending",
		topic: topics[0] || null,
	};
}

async function buildSpotlightPromptAnswer(
	client: AnimemeClient,
	args: ParsedArgs,
	prompt: string,
	createdAt: string,
): Promise<PromptAnswerResult> {
	const [spotlight, notifications] = await Promise.all([
		client.getSpotlight({
			historyLimit: readNumberFlag(args, "history-limit", 30),
			limit: readNumberFlag(args, "limit", 15),
		}),
		settleOptional(() => client.getSpotlightPerformanceNotifications()),
	]);
	const markdown = renderSpotlightPromptAnswerMarkdown({
		createdAt,
		notifications,
		prompt,
		spotlight,
	});
	return {
		createdAt,
		markdown,
		payload: {
			notifications,
			spotlight,
		},
		prompt,
		route: "spotlight",
	};
}

async function buildNarrativePromptAnswer(
	client: AnimemeClient,
	prompt: string,
	query: string,
	createdAt: string,
): Promise<PromptAnswerResult> {
	const [contextResult, learningResult] = await Promise.allSettled([
		client.getAgentContext(),
		client.getLearningTopics({
			pageSize: 8,
			search: query,
		}),
	]);
	const context =
		contextResult.status === "fulfilled" ? contextResult.value : null;
	const liveTopic = context ? findLiveTopicByQuery(context, query) : null;
	const signals = liveTopic
		? await settleOptional(() => client.getSpotlightTopicSignals([liveTopic.id]))
		: null;
	const learning =
		learningResult.status === "fulfilled" ? learningResult.value : null;
	const markdown = renderNarrativePromptAnswerMarkdown({
		context,
		createdAt,
		learning,
		liveTopic,
		prompt,
		query,
		signals,
		warnings: collectSettledWarnings({
			context: contextResult,
			learning: learningResult,
		}),
	});
	return {
		createdAt,
		markdown,
		payload: {
			contextGeneratedAt: context?.generatedAt,
			learning,
			query,
			signals,
			warnings: collectSettledWarnings({
				context: contextResult,
				learning: learningResult,
			}),
		},
		prompt,
		route: "narrative",
		topic: liveTopic,
	};
}

async function buildProviderPromptAnswer(
	client: AnimemeClient,
	args: ParsedArgs,
	prompt: string,
	address: string,
	createdAt: string,
): Promise<PromptAnswerResult> {
	const symbol = readStringFlag(args, "symbol") || "SOLUSDT";
	const [contextResult, gmgnMetricsResult, animemeMetricsResult, binanceResult] =
		await Promise.allSettled([
			client.getAgentContext(),
			getDirectGmgnTokenMetrics([address]),
			client.getTokenMetrics([address]),
			getBinanceMarketBundle({
				address,
				limit: readNumberFlag(args, "limit", 50),
				symbol,
			}),
		]);
	const context =
		contextResult.status === "fulfilled" ? contextResult.value : null;
	const gmgnMetrics =
		gmgnMetricsResult.status === "fulfilled" ? gmgnMetricsResult.value : null;
	const animemeMetrics =
		animemeMetricsResult.status === "fulfilled"
			? animemeMetricsResult.value
			: null;
	const binanceBundle =
		binanceResult.status === "fulfilled" ? binanceResult.value : null;
	const markdown = renderProviderPromptAnswerMarkdown({
		address,
		animemeMetrics,
		binanceBundle,
		binanceError:
			binanceResult.status === "rejected"
				? formatSettledReason(binanceResult.reason)
				: null,
		context,
		createdAt,
		gmgnMetrics,
		gmgnMetricsError:
			gmgnMetricsResult.status === "rejected"
				? formatSettledReason(gmgnMetricsResult.reason)
				: null,
		prompt,
		symbol,
	});
	return {
		address,
		createdAt,
		markdown,
		payload: {
			animemeMetrics,
			binanceBundle,
			contextGeneratedAt: context?.generatedAt,
			gmgnMetrics,
			symbol,
		},
		prompt,
		route: "provider",
	};
}

function buildHelpPromptAnswer(
	prompt: string,
	createdAt: string,
): PromptAnswerResult {
	return {
		createdAt,
		markdown: renderPromptHelpMarkdown(createdAt),
		payload: {},
		prompt,
		route: "help",
	};
}

function buildMissingAddressPromptAnswer(
	prompt: string,
	route: AnswerRoute,
	createdAt: string,
): PromptAnswerResult {
	return {
		createdAt,
		markdown: [
			"# Animeme Prompt Answer",
			"",
			`Generated: ${createdAt}`,
			`Prompt: ${prompt}`,
			"",
			"Thiếu token address. Hãy gửi lại theo một trong các mẫu:",
			"",
			"- `Phân tích token <solana-token-address>`",
			"- `Token <solana-token-address> có an toàn không?`",
			"- `GMGN và Binance data của <solana-token-address>`",
			"",
			"Repo này không đoán contract address từ ticker, vì ticker có thể trùng hoặc giả mạo.",
		].join("\n"),
		payload: {},
		prompt,
		route,
	};
}

async function loadTokenAnalysis(
	client: AnimemeClient,
	address: string,
	deep: boolean,
): Promise<TokenAnalysisBundle> {
	const gmgnCredential = getGmgnCredentialState();
	const [contextResult, gmgnMetricsResult, animemeMetricsResult, learningResult] =
		await Promise.allSettled([
			client.getAgentContext(),
			getDirectGmgnTokenMetrics([address]),
			client.getTokenMetrics([address]),
			client.getLearningTopics({
				pageSize: 10,
				tokenAddress: address,
			}),
		]);
	const context =
		contextResult.status === "fulfilled" ? contextResult.value : null;
	const gmgnMetrics =
		gmgnMetricsResult.status === "fulfilled" ? gmgnMetricsResult.value : null;
	const animemeMetrics =
		animemeMetricsResult.status === "fulfilled"
			? animemeMetricsResult.value
			: null;
	const metrics = mergeTokenMetrics(address, gmgnMetrics, animemeMetrics);
	const metricDiagnostics = buildTokenMetricDiagnostics({
		address,
		animemeMetrics,
		animemeMetricsResult,
		gmgnCredential,
		gmgnMetrics,
		gmgnMetricsResult,
	});
	const learning =
		learningResult.status === "fulfilled" ? learningResult.value : null;
	const attentionTopics = context ? findTopicsByTokenAddress(context, address) : [];
	const learningItems = extractItems(learning);
	const report = applyTokenMetricRequirement(
		buildTokenIntelligenceReport({
			address,
			attentionTopics,
			learningItems,
			metrics,
		}),
		metricDiagnostics,
		deep,
	);
	return {
		address,
		animemeMetrics,
		attentionTopics,
		context,
		deep,
		gmgnMetrics,
		learning,
		metricDiagnostics,
		metrics,
		report,
		warnings: collectSettledWarnings({
			animemeMarket: animemeMetricsResult,
			context: contextResult,
			gmgnMetrics: gmgnMetricsResult,
			learning: learningResult,
		}),
	};
}

async function runDoctor(client: AnimemeClient) {
	const createdAt = new Date().toISOString();
	const nodeMajor = Number(process.versions.node.split(".")[0]);
	const baseUrl =
		process.env.ANIMEME_API_BASE_URL || DEFAULT_ANIMEME_API_BASE_URL;
	const gmgnCredential = getGmgnCredentialState();
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
		{
			detail: gmgnCredential.configured
				? `Configured from ${gmgnCredential.source}. The value is never printed or written to artifacts.`
				: `Missing. Set GMGN_API_KEY or add it to ${gmgnCredential.localEnvPath} before complete token:deep analysis.`,
			label: "GMGN API key",
			status: gmgnCredential.configured ? "ok" : "warn",
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

	const binanceAccess = await checkBinancePublicAccess();
	checks.push({
		detail:
			binanceAccess.spotTime.status === "fulfilled"
				? `Public Spot API reachable. Keys available: ${describeKeys(binanceAccess.spotTime.value)}.`
				: `Public Spot API failed: ${formatSettledReason(binanceAccess.spotTime.reason)}.`,
		endpoint: "/api/v3/time",
		label: "Binance Spot public API",
		status: binanceAccess.spotTime.status === "fulfilled" ? "ok" : "warn",
	});
	checks.push({
		detail:
			binanceAccess.web3Search.status === "fulfilled"
				? `Public Web3 token API reachable. Keys: ${describeKeys(binanceAccess.web3Search.value)}.`
				: `Public Web3 token API failed: ${formatSettledReason(binanceAccess.web3Search.reason)}.`,
		endpoint:
			"/bapi/defi/v5/public/wallet-direct/buw/wallet/market/token/search/ai",
		label: "Binance Web3 public API",
		status: binanceAccess.web3Search.status === "fulfilled" ? "ok" : "warn",
	});

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
	const gmgnCheck = report.checks.find((check) => check.label === "GMGN API key");
	const nextLines = report.ready
		? [
				"- Run `npm run demo` to load the full public ANIMEME context bundle.",
				gmgnCheck?.status === "ok"
					? "- `token:deep` can use direct GMGN API-key metrics on this machine."
					: "- Configure `GMGN_API_KEY` before treating `token:deep` as complete.",
			]
		: [
				"- Fix failed checks, then run `npm run doctor` again. Optional endpoint warnings can still be used as missing-data notes.",
			];
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
		...nextLines,
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

function mergeTokenMetrics(
	address: string,
	gmgnMetrics: TokenMetricsResponse | null,
	animemeMetrics: TokenMetricsResponse | null,
): TokenMetricsResponse {
	const gmgnMetric = findMetricForAddress(gmgnMetrics, address);
	const animemeMetric = findMetricForAddress(animemeMetrics, address);
	const mergedMetric = {
		...(animemeMetric || {}),
		...(gmgnMetric || {}),
		source: gmgnMetric
			? "gmgn-openapi"
			: animemeMetric
				? "animeme-market-intelligence"
				: undefined,
	};

	return {
		errors: {
			...(animemeMetrics?.errors || {}),
			...(gmgnMetrics?.errors || {}),
		},
		items:
			gmgnMetric || animemeMetric
				? {
						[address]: mergedMetric,
					}
				: {},
		pendingAddresses: [
			...(gmgnMetrics?.pendingAddresses || []),
			...(animemeMetrics?.pendingAddresses || []),
		],
		rateLimitedUntil:
			gmgnMetrics?.rateLimitedUntil ?? animemeMetrics?.rateLimitedUntil ?? null,
		solUsdPrice: gmgnMetrics?.solUsdPrice ?? animemeMetrics?.solUsdPrice ?? null,
		source: gmgnMetric
			? "gmgn-openapi"
			: animemeMetric
				? "animeme-market-intelligence"
				: "unavailable",
		version: 1,
	};
}

function buildTokenMetricDiagnostics(options: {
	address: string;
	animemeMetrics: TokenMetricsResponse | null;
	animemeMetricsResult: PromiseSettledResult<TokenMetricsResponse>;
	gmgnCredential: GmgnCredentialState;
	gmgnMetrics: TokenMetricsResponse | null;
	gmgnMetricsResult: PromiseSettledResult<TokenMetricsResponse>;
}): TokenMetricDiagnostics {
	const gmgnMetric = findMetricForAddress(options.gmgnMetrics, options.address);
	const gmgnCoverage = inspectGmgnMetricCoverage(gmgnMetric);
	const animemeMetric = findMetricForAddress(
		options.animemeMetrics,
		options.address,
	);
	return {
		animemeMarket: {
			error: getMetricError(
				options.animemeMetricsResult,
				options.animemeMetrics,
				options.address,
			),
			status: resolveMetricStatus({
				hasMetric: Boolean(animemeMetric),
				result: options.animemeMetricsResult,
			}),
		},
		complete: Boolean(gmgnMetric) && gmgnCoverage.complete,
		gmgn: {
			credential: options.gmgnCredential,
			error: getMetricError(
				options.gmgnMetricsResult,
				options.gmgnMetrics,
				options.address,
			),
			missingFields: gmgnCoverage.missingFields,
			status: resolveMetricStatus({
				completeMetric: gmgnCoverage.complete,
				credential: options.gmgnCredential,
				hasMetric: Boolean(gmgnMetric),
				result: options.gmgnMetricsResult,
			}),
		},
	};
}

function applyTokenMetricRequirement(
	report: TokenIntelligenceReport,
	diagnostics: TokenMetricDiagnostics,
	deep: boolean,
): TokenIntelligenceReport {
	if (diagnostics.complete) {
		return {
			...report,
			strengths: uniqueStrings([
				...report.strengths,
				"Required GMGN API-key metrics are loaded for holder, insider, and bundler hard-stop checks.",
			]),
		};
	}

	const missingReason =
		diagnostics.gmgn.status === "missing-key"
			? "GMGN_API_KEY is not configured"
			: diagnostics.gmgn.missingFields.length > 0
				? `missing ${diagnostics.gmgn.missingFields.join(", ")}`
				: diagnostics.gmgn.error || "GMGN API-key metrics returned no token data";
	const nextScore = Math.min(report.score, deep ? 44 : 60);
	return {
		...report,
		confidence: deep ? "low" : report.confidence,
		score: nextScore,
		verdict: report.hardStops.length
			? "avoid"
			: nextScore < 45
				? "high-risk"
				: "watch",
		warnings: uniqueStrings([
			...report.warnings,
			`Full GMGN API-key metrics are incomplete: ${missingReason}. Do not treat hard-stop checks as cleared.`,
		]),
	};
}

function inspectGmgnMetricCoverage(metric: Record<string, unknown> | null) {
	const missingFields = REQUIRED_GMGN_METRIC_FIELDS.flatMap((field) =>
		metric && getField(metric, field.keys) != null ? [] : [field.label],
	);
	return {
		complete: missingFields.length === 0,
		missingFields,
	};
}

function resolveMetricStatus(options: {
	completeMetric?: boolean;
	credential?: GmgnCredentialState;
	hasMetric: boolean;
	result: PromiseSettledResult<TokenMetricsResponse>;
}): MetricSourceStatus {
	if (options.hasMetric) {
		return options.completeMetric === false ? "partial" : "loaded";
	}
	if (options.credential && !options.credential.configured) {
		return "missing-key";
	}
	return options.result.status === "rejected" ? "failed" : "empty";
}

function getMetricError(
	result: PromiseSettledResult<TokenMetricsResponse>,
	response: TokenMetricsResponse | null,
	address: string,
) {
	if (result.status === "rejected") {
		return result.reason instanceof Error ? result.reason.message : String(result.reason);
	}
	const normalized = address.trim().toLowerCase();
	for (const [key, value] of Object.entries(response?.errors || {})) {
		if (key.toLowerCase() === normalized) {
			return value;
		}
	}
	return undefined;
}

function uniqueStrings(values: string[]) {
	return [...new Set(values.filter(Boolean))];
}

function renderTokenMarkdown(options: {
	address: string;
	animemeMetrics: TokenMetricsResponse | null;
	attentionTopics: AgentContextTopic[];
	context: AgentContextResponse | null;
	deep?: boolean;
	gmgnMetrics: TokenMetricsResponse | null;
	learning: unknown;
	metricDiagnostics: TokenMetricDiagnostics;
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
		"## Required Data Sources",
		"",
		...renderTokenDataSourceLines(options),
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
		"## Market Metrics (GMGN First)",
		"",
		...(metric
			? renderMetricLines(metric)
			: [
					"- GMGN API-key metrics are not available for this address. This is incomplete token due diligence.",
				]),
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
			: ["- Warning: No major warning from available GMGN/Animeme metrics."]),
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
		"- If GMGN API-key holder, insider, or bundler fields are unavailable, keep the token in observation mode.",
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

function renderTokenPromptAnswerMarkdown(options: {
	analysis: TokenAnalysisBundle;
	binanceBundle: BinanceMarketBundle | OptionalFailure;
	createdAt: string;
	prompt: string;
	symbol: string;
}) {
	const { analysis } = options;
	const metric = findMetricForAddress(analysis.metrics, analysis.address);
	const topTopic = analysis.attentionTopics[0] || null;
	const report = analysis.report;
	const verdictText = translateVerdict(report.verdict);
	const binanceLines = renderBinancePromptLines(
		options.binanceBundle,
		options.symbol,
	);
	return [
		`# Phân tích token: ${analysis.address}`,
		"",
		`Generated: ${options.createdAt}`,
		`Prompt: ${options.prompt}`,
		"",
		"## Kết luận nhanh",
		"",
		`- Verdict: ${report.verdict} - ${verdictText}.`,
		`- Score: ${report.score}/100, confidence ${translateConfidence(report.confidence)}.`,
		topTopic
			? `- Narrative match mạnh nhất: ${topTopic.name} (${topTopic.mode} #${topTopic.rank}, score ${topTopic.attentionScore}, ${formatUsd(topTopic.netInflow1h)} 1h inflow).`
			: "- Chưa thấy token này gắn với live Now Attention topic; coi đây là thiếu tín hiệu, không phải điểm cộng.",
		"- Đây là research context, không phải tín hiệu mua/bán.",
		"",
		"## Dữ liệu đã dùng",
		"",
		analysis.context
			? `- Animeme Now Attention: loaded (${analysis.context.source}, ${analysis.context.topics.length} topics, generated ${analysis.context.generatedAt}).`
			: "- Animeme Now Attention: unavailable, thiếu live trend context.",
		`- GMGN API-key metrics: ${formatGmgnMetricStatus(
			analysis.metricDiagnostics,
			analysis.gmgnMetrics,
			analysis.address,
		)}`,
		`- Animeme market fallback: ${formatAnimemeMarketStatus(
			analysis.metricDiagnostics,
			analysis.animemeMetrics,
			analysis.address,
		)}`,
		...binanceLines,
		"",
		"## Vì sao đáng chú ý",
		"",
		...(report.strengths.length
			? report.strengths.map((item) => `- ${translateReportLine(item)}`)
			: ["- Chưa có strength đủ rõ từ dữ liệu hiện có."]),
		"",
		"## Cảnh báo và hard stops",
		"",
		...(report.warnings.length
			? report.warnings.map((item) => `- Warning: ${translateReportLine(item)}`)
			: ["- Không có warning lớn từ dữ liệu đã load, nhưng vẫn cần theo dõi liquidity, holder, và live narrative."]),
		...(report.hardStops.length
			? report.hardStops.map((item) => `- Hard stop: ${translateReportLine(item)}`)
			: ["- Hard stop: chưa có hard stop từ các field GMGN/Animeme đã load."]),
		"",
		"## GMGN market snapshot",
		"",
		...(metric
			? renderMetricLines(metric)
			: [
					"- Chưa có structured GMGN/Animeme metric cho token này; không được coi hard-stop là đã clear.",
				]),
		"",
		"## Next prompts cho demo",
		"",
		topTopic
			? `- \`Narrative ${topTopic.name} nói về cái gì?\``
			: "- `Trending Narrative hiện là gì?`",
		`- \`GMGN và Binance data của ${analysis.address}\``,
		`- \`Token ${analysis.address} có an toàn không?\``,
		"",
		...(analysis.warnings.length
			? ["## Request warnings", "", ...analysis.warnings.map((warning) => `- ${warning}`)]
			: []),
	].join("\n");
}

function renderTrendingPromptAnswerMarkdown(options: {
	context: AgentContextResponse;
	createdAt: string;
	prompt: string;
	topics: AgentContextTopic[];
}) {
	const topTopic = options.topics[0] || null;
	return [
		"# Trending Narrative hiện tại",
		"",
		`Generated: ${options.createdAt}`,
		`Prompt: ${options.prompt}`,
		`Attention context: ${options.context.generatedAt}`,
		"",
		"## Trả lời ngắn",
		"",
		topTopic
			? `Narrative mạnh nhất hiện tại là **${topTopic.name}**: ${topTopic.mode} #${topTopic.rank}, score ${topTopic.attentionScore}, ${formatUsd(topTopic.netInflow1h)} net inflow 1h.`
			: "Chưa có narrative đủ rõ trong live Now Attention payload.",
		topTopic?.summary
			? `Tóm tắt: ${topTopic.summary}`
			: "Tóm tắt: chưa có summary đủ rõ từ payload.",
		"",
		"## Top narratives",
		"",
		...(options.topics.length
			? options.topics.map((topic, index) => {
					const lead = topic.topTokens[0];
					const leadText = lead?.address
						? `${lead.symbol} (${formatUsd(lead.marketCap)} mcap, ${formatUsd(lead.liquidity)} liq)`
						: "no lead token";
					return `${index + 1}. ${topic.name} - ${topic.mode} #${topic.rank}, score ${topic.attentionScore}, ${formatUsd(topic.netInflow1h)} 1h inflow, lead ${leadText}.`;
				})
			: ["- No live topics available."]),
		"",
		"## Cách đọc",
		"",
		"- Trending trong Animeme nghĩa là attention đang legible trên Now Attention, chưa phải tín hiệu mua.",
		"- Ưu tiên topic có summary rõ, inflow còn tăng, token surface thật, và không bị holder/insider hard-stop khi phân tích token.",
		"",
		"## Next prompts cho demo",
		"",
		topTopic
			? `- \`Narrative ${topTopic.name} nói về cái gì?\``
			: "- `Narrative <name> nói về cái gì?`",
		topTopic?.topTokens[0]?.address
			? `- \`Phân tích token ${topTopic.topTokens[0].address}\``
			: "- `Phân tích token <solana-token-address>`",
		"- `Attention Spotlight đang highlight gì?`",
	].join("\n");
}

function renderSpotlightPromptAnswerMarkdown(options: {
	createdAt: string;
	notifications: unknown;
	prompt: string;
	spotlight: unknown;
}) {
	const spotlightItems = extractItems(options.spotlight);
	const notificationItems = extractItems(options.notifications);
	return [
		"# Attention Spotlight hiện tại",
		"",
		`Generated: ${options.createdAt}`,
		`Prompt: ${options.prompt}`,
		"",
		"## Trả lời ngắn",
		"",
		spotlightItems.length
			? `Spotlight đang có ${spotlightItems.length} item. Item nổi bật đầu tiên là **${pickTitle(spotlightItems[0]) || "unnamed"}**.`
			: "Spotlight payload hiện chưa có item previewable.",
		"",
		"## Spotlight preview",
		"",
		...previewItems(spotlightItems, 8),
		"",
		"## Recent performance notifications",
		"",
		...previewItems(notificationItems, 5),
		"",
		"## Cách đọc",
		"",
		"- Spotlight dùng để xem narrative nào đã có trigger đủ rõ và đang được theo dõi qua signal history.",
		"- Nếu muốn xuống token-level, hãy lấy lead token của narrative rồi chạy `Phân tích token <address>`.",
	].join("\n");
}

function renderNarrativePromptAnswerMarkdown(options: {
	context: AgentContextResponse | null;
	createdAt: string;
	learning: unknown;
	liveTopic: AgentContextTopic | null;
	prompt: string;
	query: string;
	signals: unknown;
	warnings: string[];
}) {
	const learningItems = extractItems(options.learning);
	const bestLearning = learningItems[0] || null;
	const lead = options.liveTopic?.topTokens[0] || null;
	const summary =
		options.liveTopic?.summary ||
		pickSummary(bestLearning) ||
		"Chưa có summary đủ rõ từ live topic hoặc learning archive.";
	return [
		`# Narrative: ${options.query}`,
		"",
		`Generated: ${options.createdAt}`,
		`Prompt: ${options.prompt}`,
		options.context
			? `Attention context: ${options.context.generatedAt}`
			: "Attention context: unavailable",
		"",
		"## Narrative này nói về gì?",
		"",
		summary,
		"",
		"## Live status",
		"",
		options.liveTopic
			? `- Live match: ${options.liveTopic.name} (${options.liveTopic.mode} #${options.liveTopic.rank}, score ${options.liveTopic.attentionScore}, ${formatUsd(options.liveTopic.netInflow1h)} 1h inflow).`
			: "- Không thấy live topic match đủ rõ trong Now Attention hiện tại.",
		lead?.address
			? `- Lead token: ${lead.symbol} ${lead.address} (${formatUsd(lead.marketCap)} mcap, ${formatUsd(lead.liquidity)} liquidity).`
			: "- Lead token: chưa có hoặc không đủ rõ.",
		options.liveTopic?.tags?.length
			? `- Tags: ${options.liveTopic.tags.join(", ")}.`
			: "- Tags: unavailable.",
		"",
		"## Learning / archive",
		"",
		...(learningItems.length
			? learningItems.slice(0, 5).map((item, index) => {
					const title = pickTitle(item) || `Learning item ${index + 1}`;
					const itemSummary = pickSummary(item);
					return itemSummary
						? `- ${title}: ${itemSummary}`
						: `- ${title}`;
				})
			: ["- Không có learning archive match cho query này."]),
		"",
		"## Spotlight / signal context",
		"",
		options.signals
			? `- Signal payload keys: ${describeKeys(options.signals)}.`
			: "- Chưa có signal context vì không tìm thấy live topic id đủ rõ.",
		"",
		"## Cách demo tiếp",
		"",
		options.liveTopic?.topTokens[0]?.address
			? `- \`Phân tích token ${options.liveTopic.topTokens[0].address}\``
			: "- `Phân tích token <solana-token-address>`",
		`- \`Trending Narrative hiện là gì?\``,
		options.liveTopic
			? `- \`npm run thesis -- --topic ${options.liveTopic.id}\``
			: "- `npm run topics -- --search <query>`",
		"",
		...(options.warnings.length
			? ["## Request warnings", "", ...options.warnings.map((warning) => `- ${warning}`)]
			: []),
	].join("\n");
}

function renderProviderPromptAnswerMarkdown(options: {
	address: string;
	animemeMetrics: TokenMetricsResponse | null;
	binanceBundle: BinanceMarketBundle | null;
	binanceError: string | null;
	context: AgentContextResponse | null;
	createdAt: string;
	gmgnMetrics: TokenMetricsResponse | null;
	gmgnMetricsError: string | null;
	prompt: string;
	symbol: string;
}) {
	const gmgnMetric = findMetricForAddress(options.gmgnMetrics, options.address);
	const animemeMetric = findMetricForAddress(
		options.animemeMetrics,
		options.address,
	);
	const price = getNestedField(options.binanceBundle?.spot.price, ["price"]);
	return [
		`# Provider data: ${options.address}`,
		"",
		`Generated: ${options.createdAt}`,
		`Prompt: ${options.prompt}`,
		"",
		"## Animeme",
		"",
		options.context
			? `- Now Attention: loaded (${options.context.source}, ${options.context.topics.length} topics, generated ${options.context.generatedAt}).`
			: "- Now Attention: unavailable.",
		animemeMetric
			? `- Market fallback: loaded (${describeKeys(animemeMetric)}).`
			: "- Market fallback: no metric item for this token.",
		"",
		"## GMGN",
		"",
		gmgnMetric
			? `- Direct GMGN API-key metrics: loaded (${describeKeys(gmgnMetric)}).`
			: options.gmgnMetricsError
				? `- Direct GMGN API-key metrics: failed (${options.gmgnMetricsError}).`
				: "- Direct GMGN API-key metrics: no token item returned.",
		"",
		"## Binance",
		"",
		options.binanceBundle
			? `- Spot baseline ${options.symbol}: price ${price ? String(price) : "unavailable"}, spot keys ${describeKeys(options.binanceBundle.spot)}.`
			: options.binanceError
				? `- Binance public bundle: failed (${options.binanceError}).`
				: "- Binance public bundle: unavailable.",
		options.binanceBundle?.web3
			? `- Web3 token context: loaded (${describeKeys(options.binanceBundle.web3)}).`
			: "- Web3 token context: unavailable or no match.",
		"",
		"## Next",
		"",
		`- \`Phân tích token ${options.address}\``,
		`- \`npm run token:deep -- --address ${options.address}\``,
		`- \`npm run binance -- --symbol ${options.symbol} --address ${options.address}\``,
	].join("\n");
}

function renderPromptHelpMarkdown(createdAt: string) {
	return [
		"# Animeme Prompt Answer",
		"",
		`Generated: ${createdAt}`,
		"",
		"Use `npm run answer -- --prompt \"...\"` for demo-friendly natural-language answers.",
		"",
		"## Demo prompts",
		"",
		"- `Phân tích token <solana-token-address>`",
		"- `Token <solana-token-address> có an toàn không?`",
		"- `Trending Narrative hiện là gì?`",
		"- `Narrative LUNCHMONEY nói về cái gì?`",
		"- `GMGN và Binance data của <solana-token-address>`",
		"- `Attention Spotlight đang highlight gì?`",
		"- `Topic nào đang rising mạnh nhất?`",
		"",
		"## What the router loads",
		"",
		"- Token prompts: Animeme Now Attention, Narrative Learning, direct GMGN API-key metrics, Animeme market fallback, and Binance public Spot/Web3 context.",
		"- Trending prompts: live Now Attention ranking and lead token surfaces.",
		"- Narrative prompts: live topic match, Narrative Learning search, and Spotlight signal keys when a live topic is found.",
		"- Provider prompts: Animeme, GMGN, and Binance sections kept separate.",
	].join("\n");
}

function renderTokenDataSourceLines(options: {
	address: string;
	animemeMetrics: TokenMetricsResponse | null;
	context: AgentContextResponse | null;
	gmgnMetrics: TokenMetricsResponse | null;
	metricDiagnostics: TokenMetricDiagnostics;
}) {
	return [
		options.context
			? `- Animeme trending: loaded (${options.context.source}, ${options.context.topics.length} topics, generated ${options.context.generatedAt}).`
			: "- Animeme trending: unavailable. Token analysis is missing live Now Attention context.",
		`- GMGN API-key metrics: ${formatGmgnMetricStatus(
			options.metricDiagnostics,
			options.gmgnMetrics,
			options.address,
		)}`,
		`- Animeme market fallback: ${formatAnimemeMarketStatus(
			options.metricDiagnostics,
			options.animemeMetrics,
			options.address,
		)}`,
		`- Complete token due diligence: ${
			options.metricDiagnostics.complete
				? "yes, GMGN API-key metrics are present."
				: "no, GMGN API-key metrics are missing or incomplete."
		}`,
	];
}

function formatGmgnMetricStatus(
	diagnostics: TokenMetricDiagnostics,
	metrics: TokenMetricsResponse | null,
	address: string,
) {
	const sourceText = diagnostics.gmgn.credential.configured
		? `key source ${diagnostics.gmgn.credential.source}`
		: `missing key; set GMGN_API_KEY or ${diagnostics.gmgn.credential.localEnvPath}`;
	const metric = findMetricForAddress(metrics, address);
	if (diagnostics.gmgn.status === "loaded") {
		return `loaded from GMGN OpenAPI (${sourceText}, ${describeKeys(metric)}).`;
	}
	if (diagnostics.gmgn.status === "partial") {
		return `partial from GMGN OpenAPI (${sourceText}, missing ${diagnostics.gmgn.missingFields.join(", ")}).`;
	}
	if (diagnostics.gmgn.error) {
		return `${diagnostics.gmgn.status} (${sourceText}; ${diagnostics.gmgn.error}).`;
	}
	return `${diagnostics.gmgn.status} (${sourceText}).`;
}

function formatAnimemeMarketStatus(
	diagnostics: TokenMetricDiagnostics,
	metrics: TokenMetricsResponse | null,
	address: string,
) {
	const metric = findMetricForAddress(metrics, address);
	if (diagnostics.animemeMarket.status === "loaded") {
		return `loaded from /api/market/token-metrics (${describeKeys(metric)}).`;
	}
	if (diagnostics.animemeMarket.error) {
		return `${diagnostics.animemeMarket.status} (${diagnostics.animemeMarket.error}).`;
	}
	return `${diagnostics.animemeMarket.status}.`;
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

function renderGmgnMarkdown(address: string, metrics: TokenMetricsResponse) {
	const metric = findMetricForAddress(metrics, address);
	return [
		`# GMGN Token Metrics: ${address}`,
		"",
		`Generated: ${new Date().toISOString()}`,
		`Source: ${metrics.source || "gmgn-openapi"}`,
		"",
		"## Status",
		"",
		metric
			? `- Loaded direct GMGN API-key metrics. Keys: ${describeKeys(metric)}.`
			: "- No GMGN metric item returned for this address.",
		...(metrics.pendingAddresses?.length
			? [`- Pending: ${metrics.pendingAddresses.join(", ")}`]
			: []),
		...(Object.keys(metrics.errors || {}).length
			? [
					"- Errors:",
					...Object.entries(metrics.errors || {}).map(
						([key, value]) => `  - ${key}: ${value}`,
					),
				]
			: []),
		"",
		"## Preview",
		"",
		shortJson(metric || metrics, 1_500),
	].join("\n");
}

function renderBinanceBundleMarkdown(bundle: BinanceMarketBundle) {
	const price = getNestedField(bundle.spot.price, ["price"]);
	const ticker = isRecord(bundle.spot.ticker24h) ? bundle.spot.ticker24h : null;
	const web3Keys = bundle.web3 ? describeKeys(bundle.web3) : "not requested";
	return [
		`# Binance Market Bundle: ${bundle.symbol}`,
		"",
		`Generated: ${bundle.generatedAt}`,
		`Source: ${bundle.source}`,
		"",
		"## Spot",
		"",
		`- Price: ${price ? String(price) : "unavailable"}`,
		`- 24h change: ${getNestedField(ticker, ["priceChangePercent"]) ?? "unavailable"}`,
		`- 24h volume: ${getNestedField(ticker, ["volume"]) ?? "unavailable"}`,
		`- Quote volume: ${getNestedField(ticker, ["quoteVolume"]) ?? "unavailable"}`,
		`- Spot payload keys: ${describeKeys(bundle.spot)}`,
		"",
		"## Web3",
		"",
		`- Web3 payload keys: ${web3Keys}`,
		"",
		"## Next",
		"",
		"- Use `npm run binance:spot -- --path /api/v3/ticker/24hr --symbol <SYMBOL>` for a raw Spot endpoint.",
		"- Use `npm run binance:web3 -- --mode dynamic --address <token> --chain-id CT_501` for raw Web3 token data.",
	].join("\n");
}

function renderProviderFetchMarkdown(
	provider: string,
	descriptor: string,
	payload: unknown,
) {
	return [
		`# ${provider} Fetch: ${descriptor}`,
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
	const slug = payload.address
		? slugify(payload.address)
		: payload.topic
			? slugify(payload.topic.name)
			: payload.symbol
				? slugify(payload.symbol)
				: payload.prompt
					? slugify(payload.prompt)
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
	if (payload.kind === "answer") {
		return "# Animeme Prompt Answer\n\nJSON artifact contains the structured prompt answer payload.\n";
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

function flagsToQueryParams(args: ParsedArgs, excludedNames: string[]) {
	const excluded = new Set(excludedNames);
	return Object.fromEntries(
		Object.entries(args.flags)
			.filter(([key]) => !excluded.has(key))
			.map(([key, value]) => [key, value === true ? "true" : value]),
	);
}

function buildBinanceSpotQueryParams(args: ParsedArgs) {
	const params = flagsToQueryParams(args, ["path"]);
	const positionalSymbol = args.positionals[1];
	if (!params.symbol && positionalSymbol) {
		params.symbol = positionalSymbol;
	}
	return params;
}

function readBinanceWeb3Mode(value: string | null): BinanceWeb3Mode {
	if (
		value === "dynamic" ||
		value === "kline" ||
		value === "meta" ||
		value === "search"
	) {
		return value;
	}
	return "search";
}

function readStringFlagOrPosition(
	args: ParsedArgs,
	name: string,
	positionIndex: number,
) {
	const value = readStringFlag(args, name);
	if (value) {
		return value;
	}
	const positional = args.positionals[positionIndex];
	return typeof positional === "string" && positional.trim()
		? positional.trim()
		: null;
}

function readRequiredFlagOrPosition(
	args: ParsedArgs,
	name: string,
	positionIndex: number,
) {
	const value = readStringFlagOrPosition(args, name, positionIndex);
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

function readNumberFlagOrPosition(
	args: ParsedArgs,
	name: string,
	positionIndex: number,
	fallback: number,
) {
	const value = readStringFlagOrPosition(args, name, positionIndex);
	if (!value) {
		return fallback;
	}
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readModeFlagOrPosition(
	args: ParsedArgs,
	name: string,
	positionIndex: number,
	fallback: AttentionMode,
): AttentionMode {
	const value = readStringFlagOrPosition(args, name, positionIndex);
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

function formatSettledReason(reason: unknown) {
	return reason instanceof Error ? reason.message : String(reason);
}

function collectSettledWarnings(
	results: Record<string, PromiseSettledResult<unknown>>,
) {
	return Object.entries(results).flatMap(([label, result]) =>
		result.status === "rejected"
			? [`${label} request failed: ${formatSettledReason(result.reason)}`]
			: [],
	);
}

function readPrompt(args: ParsedArgs) {
	const flagPrompt =
		readStringFlag(args, "prompt") ||
		readStringFlag(args, "q") ||
		readStringFlag(args, "question");
	if (flagPrompt) {
		return flagPrompt;
	}
	return args.positionals.join(" ").trim();
}

function detectAnswerRoute(prompt: string): AnswerRoute {
	const text = normalizePromptText(prompt);
	const hasAddress = Boolean(extractSolanaAddress(prompt));
	if (/\b(doctor|setup|health|check|kiem tra|cai dat|san sang)\b/.test(text)) {
		return "doctor";
	}
	if (
		hasAddress &&
		/\b(gmgn|binance|provider|raw|data|du lieu|metrics?|nguon)\b/.test(text)
	) {
		return "provider";
	}
	if (
		hasAddress ||
		/\b(phan tich|analyze|analysis|token|contract|ca|dia chi|safe|an toan)\b/.test(
			text,
		)
	) {
		return "token";
	}
	if (/\b(spotlight|highlight|signal|tin hieu)\b/.test(text)) {
		return "spotlight";
	}
	if (
		/\b(narrative|topic|chu de)\b/.test(text) &&
		extractNarrativeQuery(prompt) &&
		!/\b(trending narrative|narrative nao|topic nao|chu de nao)\b/.test(text)
	) {
		return "narrative";
	}
	if (
		/\b(trending|trend|hot|hien|hien tai|dang|top|xu huong|chu de nao|narrative nao|rising)\b/.test(
			text,
		) &&
		/\b(narrative|topic|chu de|attention|trend|hot|rising)\b/.test(text)
	) {
		return "trending";
	}
	if (/\b(watch|theo doi|nen xem|tiep theo)\b/.test(text)) {
		return "trending";
	}
	if (
		/\b(narrative|topic|chu de|noi ve|la gi|giai thich|explain|what is|meaning|about)\b/.test(
			text,
		)
	) {
		return "narrative";
	}
	return "help";
}

function extractSolanaAddress(value: string) {
	return value.match(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/)?.[0] || null;
}

function extractNarrativeQuery(prompt: string) {
	const withoutAddress = prompt.replace(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g, " ");
	const quoted = withoutAddress.match(/["'`](.+?)["'`]/)?.[1];
	if (quoted) {
		return cleanNarrativeQuery(quoted);
	}
	const markerMatch = withoutAddress.match(
		/(?:narrative|topic|chủ đề|chu de)\s+(.+)/i,
	)?.[1];
	return cleanNarrativeQuery(markerMatch || withoutAddress);
}

function cleanNarrativeQuery(value: string) {
	const stopwords = new Set([
		"a",
		"about",
		"cai",
		"chu",
		"compare",
		"con",
		"current",
		"dang",
		"de",
		"explain",
		"gi",
		"giai",
		"hien",
		"hot",
		"is",
		"khong",
		"la",
		"manh",
		"meaning",
		"narrative",
		"noi",
		"now",
		"tai",
		"the",
		"thich",
		"nhat",
		"topic",
		"trending",
		"ve",
		"voi",
		"what",
		"xu",
		"huong",
		"sanh",
		"so",
	]);
	return value
		.split(/\s+/)
		.map((word) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
		.filter((word) => word && !stopwords.has(normalizePromptText(word)))
		.join(" ")
		.trim();
}

function normalizePromptText(value: string) {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/đ/g, "d")
		.replace(/Đ/g, "D")
		.toLowerCase();
}

function findLiveTopicByQuery(
	context: AgentContextResponse,
	query: string,
): AgentContextTopic | null {
	const normalizedQuery = normalizeForMatch(query);
	if (!normalizedQuery) {
		return null;
	}
	const queryWords = normalizedQuery.split(" ").filter((word) => word.length > 1);
	const scored = context.topics
		.map((topic) => ({
			score: scoreTopicMatch(topic, normalizedQuery, queryWords),
			topic,
		}))
		.filter((entry) => entry.score > 0)
		.sort((a, b) => b.score - a.score || a.topic.rank - b.topic.rank);
	return scored[0]?.topic || null;
}

function scoreTopicMatch(
	topic: AgentContextTopic,
	normalizedQuery: string,
	queryWords: string[],
) {
	const name = normalizeForMatch(topic.name);
	const tags = normalizeForMatch(topic.tags.join(" "));
	const summary = normalizeForMatch(topic.summary);
	if (name === normalizedQuery) {
		return 100;
	}
	if (name.includes(normalizedQuery) || normalizedQuery.includes(name)) {
		return 80;
	}
	if (tags.includes(normalizedQuery)) {
		return 55;
	}
	if (summary.includes(normalizedQuery)) {
		return 45;
	}
	const haystack = `${name} ${tags} ${summary}`;
	const overlap = queryWords.filter((word) => haystack.includes(word)).length;
	return overlap >= 2 ? 20 + overlap : overlap;
}

function normalizeForMatch(value: string) {
	return normalizePromptText(value).replace(/[^a-z0-9]+/g, " ").trim();
}

function renderBinancePromptLines(
	bundle: BinanceMarketBundle | OptionalFailure,
	symbol: string,
) {
	if (isOptionalFailure(bundle)) {
		return [`- Binance public market/Web3: unavailable (${bundle.error}).`];
	}
	const price = getNestedField(bundle.spot.price, ["price"]);
	return [
		`- Binance public Spot baseline ${symbol}: loaded (price ${price ? String(price) : "unavailable"}, keys ${describeKeys(bundle.spot)}).`,
		bundle.web3
			? `- Binance public Web3 token context: loaded (${describeKeys(bundle.web3)}).`
			: "- Binance public Web3 token context: unavailable or no token match.",
	];
}

function translateVerdict(verdict: TokenIntelligenceReport["verdict"]) {
	if (verdict === "researchable") {
		return "có đủ tín hiệu sạch để tiếp tục research";
	}
	if (verdict === "watch") {
		return "đáng theo dõi nhưng chưa đủ để kết luận mạnh";
	}
	if (verdict === "high-risk") {
		return "rủi ro cao hoặc dữ liệu chưa đủ";
	}
	return "nên dừng escalation vì có hard-stop";
}

function translateConfidence(confidence: TokenIntelligenceReport["confidence"]) {
	if (confidence === "high") {
		return "cao";
	}
	if (confidence === "medium") {
		return "trung bình";
	}
	return "thấp";
}

function translateReportLine(value: string) {
	return value
		.replace(
			"Linked to live Animeme attention topics.",
			"Token đang gắn với live Now Attention của Animeme.",
		)
		.replace(
			"Has matching Animeme learning archive context.",
			"Có context trong Narrative Learning archive.",
		)
		.replace(
			"GMGN/Animeme market metrics are available.",
			"Đã có market metrics từ GMGN/Animeme.",
		)
		.replace(
			"Required GMGN API-key metrics are loaded for holder, insider, and bundler hard-stop checks.",
			"GMGN API-key đã trả đủ holder, insider, và bundler fields để kiểm hard-stop.",
		)
		.replace(
			"No live Animeme attention topic currently links this token.",
			"Chưa có live Animeme topic gắn trực tiếp với token.",
		)
		.replace(
			"GMGN/Animeme market metrics are not available yet.",
			"Chưa có GMGN/Animeme market metrics.",
		)
		.replace(
			"Fresh-wallet share is high; verify that activity is organic.",
			"Fresh-wallet share cao; cần kiểm tra activity có organic không.",
		)
		.replace(
			"Fresh-wallet share is not unusually high.",
			"Fresh-wallet share chưa cao bất thường.",
		)
		.replace(
			"Smart holder count is meaningful.",
			"Smart holder count đủ đáng chú ý.",
		)
		.replace(
			"Smart holder count is present but thin.",
			"Có smart holder nhưng còn mỏng.",
		)
		.replace(
			"No smart holders detected in the GMGN metrics snapshot.",
			"GMGN snapshot chưa thấy smart holder.",
		)
		.replace(
			"KOL holder presence is visible.",
			"Có KOL holder presence.",
		)
		.replace(
			"Full GMGN API-key metrics are incomplete:",
			"GMGN API-key metrics chưa đủ:",
		)
		.replace(
			"Do not treat hard-stop checks as cleared.",
			"Không được coi hard-stop checks là đã clear.",
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

function pickSummary(item: unknown): string | null {
	if (!item || typeof item !== "object") {
		return null;
	}
	const record = item as Record<string, unknown>;
	for (const key of [
		"summary",
		"description",
		"aiSummary",
		"analysis",
		"takeaway",
		"thesis",
	]) {
		const value = record[key];
		if (typeof value === "string" && value.trim()) {
			return compactText(value.trim(), 260);
		}
		if (value && typeof value === "object") {
			const nested = value as Record<string, unknown>;
			for (const nestedKey of ["aiSummaryEn", "text", "summary"]) {
				const nestedValue = nested[nestedKey];
				if (typeof nestedValue === "string" && nestedValue.trim()) {
					return compactText(nestedValue.trim(), 260);
				}
			}
		}
	}
	const nestedItem = record.item;
	if (nestedItem && typeof nestedItem === "object") {
		return pickSummary(nestedItem);
	}
	return null;
}

function compactText(value: string, maxLength: number) {
	const singleLine = value.replace(/\s+/g, " ");
	return singleLine.length > maxLength
		? `${singleLine.slice(0, maxLength - 3)}...`
		: singleLine;
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
		["Creator/dev holding share", ["creatorDevHoldingPercent"]],
		["Fresh wallet share", ["freshWalletPercent"]],
		["Insider share", ["insiderPercent"]],
		["Bundled activity share", ["bundlerPercent"]],
		["Smart holders", ["smartHolders"]],
		["KOL holders", ["kolHolders"]],
		["Total fees paid", ["totalFeesPaidSol"]],
	] satisfies readonly [string, readonly string[]][];
	const lines = fields.flatMap(([label, keys]) => {
		const value = getField(metric, keys);
		return value == null ? [] : [`- ${label}: ${formatMetricValue(value, label)}`];
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
		"- Next step: compare this score against live attention. Do not escalate if the token has no attention match and weak GMGN/Animeme metrics.",
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

function getNestedField(record: unknown, keys: readonly string[]) {
	if (!isRecord(record)) {
		return null;
	}
	return getField(record, keys);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value && typeof value === "object" && !Array.isArray(value));
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

function formatMetricValue(value: unknown, label = "") {
	if (typeof value === "number") {
		if (isPercentMetricLabel(label)) {
			return `${Intl.NumberFormat("en", {
				maximumFractionDigits: 2,
			}).format(value)}%`;
		}
		if (Math.abs(value) >= 1_000) {
			return formatUsd(value);
		}
		return Intl.NumberFormat("en", {
			maximumFractionDigits: 6,
		}).format(value);
	}
	return String(value);
}

function isPercentMetricLabel(label: string) {
	return /share|change/i.test(label);
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
  npm run gmgn -- --address <token-address>
  npm run binance -- --symbol SOLUSDT
  npm run binance:spot -- --path /api/v3/ticker/24hr --symbol SOLUSDT
  npm run binance:web3 -- --mode search --keyword <query>
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
