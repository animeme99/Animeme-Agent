export const DEFAULT_ANIMEME_API_BASE_URL = "https://animeme.app";
export const ATTENTION_MODES = ["rising", "latest", "viral"] as const;
export const DEFAULT_ATTENTION_MODES = ATTENTION_MODES;

export type AttentionMode = (typeof ATTENTION_MODES)[number];
export type JsonObject = Record<string, unknown>;

export type PublicDataCatalogEntry = {
	description: string;
	id: string;
	method: "GET";
	path: string;
	useFor: string[];
};

export const PUBLIC_DATA_CATALOG: PublicDataCatalogEntry[] = [
	{
		description: "Live Now Attention boards by mode with topic summaries and token surfaces.",
		id: "now-attention-feed",
		method: "GET",
		path: "/api/now-attention-feed?modes=rising,latest,viral",
		useFor: ["Attention Reads", "new topics", "viral boards", "topic tokens"],
	},
	{
		description: "Canonical Attention Spotlight rail, recent history, and breakout signal context.",
		id: "spotlight",
		method: "GET",
		path: "/api/spotlight?limit=15&historyLimit=30",
		useFor: ["Attention Spotlight", "breakout topics", "recent signals"],
	},
	{
		description: "Historical spotlight signals for specific topic ids.",
		id: "spotlight-topic-signals",
		method: "GET",
		path: "/api/spotlight-topic-signals?topicIds=<topic-id>",
		useFor: ["topic spotlight history", "first signal", "performance context"],
	},
	{
		description: "Recent public performance milestone notifications.",
		id: "spotlight-performance-notifications",
		method: "GET",
		path: "/api/spotlight-performance-notifications",
		useFor: ["milestone alerts", "recent winners"],
	},
	{
		description: "Narrative Learning summary across tracked attention cycles.",
		id: "learning-summary",
		method: "GET",
		path: "/api/learning/summary",
		useFor: ["learning overview", "best performance", "market lessons"],
	},
	{
		description: "Searchable Explore Narrative and Narrative Learning topic archive.",
		id: "learning-topics",
		method: "GET",
		path: "/api/learning/topics?page=1&pageSize=20&search=<query>",
		useFor: ["topic search", "token address lookup", "new archived topics"],
	},
	{
		description: "Full detail for one narrative learning topic.",
		id: "learning-topic-detail",
		method: "GET",
		path: "/api/learning/topics/<topic-id>",
		useFor: ["topic detail", "post-mortem", "resource extraction"],
	},
	{
		description: "Curated key-resource buckets from learning data.",
		id: "learning-key-resources",
		method: "GET",
		path: "/api/learning/key-resources?bucket=bestPerformance",
		useFor: ["best examples", "strong resources", "agent research seeds"],
	},
	{
		description: "Spotlight outcome dataset used by learning surfaces.",
		id: "learning-spotlight-outcomes",
		method: "GET",
		path: "/api/learning/spotlight-outcomes",
		useFor: ["outcome analysis", "attention-to-performance checks"],
	},
	{
		description: "Optional attention distribution snapshot when the public API provides it.",
		id: "learning-attention-distribution",
		method: "GET",
		path: "/api/learning/attention-distribution",
		useFor: ["distribution diagnostics", "winner score", "attention share"],
	},
	{
		description: "Animeme market fallback metrics for arbitrary token addresses and Animeme Intelligence scoring.",
		id: "market-token-metrics",
		method: "GET",
		path: "/api/market/token-metrics?addresses=<address>",
		useFor: [
			"token analysis",
			"holder-quality checks",
			"market risk review",
			"deep due diligence",
		],
	},
];

export type AgentContextToken = {
	address: string;
	holders: number;
	liquidity: number;
	marketCap: number;
	netInflow1h: number;
	priceChange24h: number;
	protocol: string | null;
	symbol: string;
	volume1h: number;
};

export type AgentContextTopic = {
	attentionScore: number;
	id: string;
	mode: AttentionMode;
	name: string;
	netInflow1h: number;
	netInflowTotal: number;
	primaryLink: string | null;
	progress: number;
	rank: number;
	summary: string;
	tags: string[];
	tokenCount: number;
	topTokens: AgentContextToken[];
	type: string | null;
};

export type AgentContextResponse = {
	endpoints: string[];
	freshness: {
		generatedAt: string;
		maxAgeSeconds: number;
		status: "degraded" | "fresh";
	};
	generatedAt: string;
	recommendedPrompts: string[];
	source: "live" | "partial" | "unavailable";
	spotlight: AgentContextTopic[];
	topics: AgentContextTopic[];
	topicsByMode: Partial<Record<AttentionMode, AgentContextTopic[]>>;
};

export type LearningTopicsParams = {
	attentionTheme?: string | null;
	page?: number | null;
	pageSize?: number | null;
	search?: string | null;
	tokenAddress?: string | null;
	topicType?: string | null;
};

export type SpotlightParams = {
	historyLimit?: number | null;
	limit?: number | null;
	lookbackHours?: number | null;
};

export type TokenMetricsResponse = {
	errors?: Record<string, string>;
	items?: Record<string, JsonObject>;
	pendingAddresses?: string[];
	rateLimitedUntil?: number | null;
	solUsdPrice?: number | null;
	source?: string;
	version?: number;
};

export type AnimemeClient = {
	fetchPublicPath: <T = unknown>(path: string) => Promise<T>;
	getAgentContext: () => Promise<AgentContextResponse>;
	getLearningAttentionDistribution: () => Promise<unknown>;
	getLearningKeyResources: (bucket?: string) => Promise<unknown>;
	getLearningSpotlightOutcomes: () => Promise<unknown>;
	getLearningSummary: () => Promise<unknown>;
	getLearningTopic: (topicId: string) => Promise<unknown>;
	getLearningTopics: (params?: LearningTopicsParams) => Promise<unknown>;
	getNowAttentionFeed: (
		modes?: readonly AttentionMode[],
	) => Promise<NowAttentionFeedResponse>;
	getSpotlight: (params?: SpotlightParams) => Promise<unknown>;
	getSpotlightPerformanceNotifications: () => Promise<unknown>;
	getSpotlightTopicSignals: (topicIds: readonly string[]) => Promise<unknown>;
	getTokenMetrics: (
		addresses: readonly string[],
	) => Promise<TokenMetricsResponse>;
};

export type AnimemeClientOptions = {
	baseUrl?: string;
	fetchImpl?: typeof fetch;
	timeoutMs?: number;
};

type QueryValue =
	| boolean
	| null
	| number
	| readonly (boolean | number | string)[]
	| string
	| undefined;

type QueryParams = Record<string, QueryValue>;

type NowAttentionFeedResponse = {
	boards?: Partial<Record<AttentionMode, RawAttentionTopic[]>>;
	lastUpdatedAt?: number;
};

type RawAttentionTopic = {
	aiSummary?: {
		aiSummaryCn?: string | null;
		aiSummaryEn?: string | null;
	} | null;
	name?: {
		topicNameCn?: string | null;
		topicNameEn?: string | null;
	} | null;
	progress?: number | string | null;
	tokenList?: RawAttentionToken[] | null;
	tokenSize?: number | null;
	topicId?: string | null;
	topicLink?: string | null;
	topicNetInflow?: number | string | null;
	topicNetInflow1h?: number | string | null;
	topicTags?: string[] | null;
	type?: string | null;
};

type RawAttentionToken = {
	contractAddress?: string | null;
	holders?: number | string | null;
	liquidity?: number | string | null;
	marketCap?: number | string | null;
	netInflow1h?: number | string | null;
	previewLink?: {
		x?: string[] | null;
	} | null;
	priceChange24h?: number | string | null;
	protocol?: number | string | null;
	symbol?: string | null;
	volume1hBuy?: number | string | null;
	volume1hSell?: number | string | null;
};

export function createAnimemeClient(
	options: AnimemeClientOptions = {},
): AnimemeClient {
	const baseUrl = normalizeBaseUrl(
		options.baseUrl ||
			process.env.ANIMEME_API_BASE_URL ||
			DEFAULT_ANIMEME_API_BASE_URL,
	);
	const fetchImpl = options.fetchImpl || fetch;
	const timeoutMs = options.timeoutMs || 20_000;

	const requestJson = async <T>(path: string, params: QueryParams = {}) => {
		const controller = new AbortController();
		const timeout = setTimeout(
			() => controller.abort("Animeme request timeout"),
			timeoutMs,
		);
		const url = buildUrl(baseUrl, normalizeApiPath(path), params);
		try {
			const response = await fetchImpl(url, {
				headers: {
					accept: "application/json",
					"user-agent": "Animeme-Agent/0.2",
				},
				signal: controller.signal,
			});
			if (!response.ok) {
				throw new Error(`${url.pathname} responded with ${response.status}`);
			}
			const contentType = response.headers.get("content-type") || "";
			if (!contentType.toLowerCase().includes("application/json")) {
				throw new Error(`${url.pathname} did not return JSON`);
			}
			return (await response.json()) as T;
		} finally {
			clearTimeout(timeout);
		}
	};

	return {
		fetchPublicPath: <T = unknown>(path: string) => requestJson<T>(path),
		async getAgentContext() {
			const feed = await requestJson<NowAttentionFeedResponse>(
				"/api/now-attention-feed",
				{ modes: DEFAULT_ATTENTION_MODES.join(",") },
			);
			return buildAgentContextFromNowAttentionFeed(feed);
		},
		getLearningAttentionDistribution: () =>
			requestJson<unknown>("/api/learning/attention-distribution"),
		getLearningKeyResources: (bucket = "bestPerformance") =>
			requestJson<unknown>("/api/learning/key-resources", { bucket }),
		getLearningSpotlightOutcomes: () =>
			requestJson<unknown>("/api/learning/spotlight-outcomes"),
		getLearningSummary: () => requestJson<unknown>("/api/learning/summary"),
		getLearningTopic: (topicId: string) =>
			requestJson<unknown>(
				`/api/learning/topics/${encodeURIComponent(topicId)}`,
			),
		getLearningTopics: (params: LearningTopicsParams = {}) =>
			requestJson<unknown>("/api/learning/topics", {
				attentionTheme: params.attentionTheme,
				page: params.page ?? 1,
				pageSize: params.pageSize ?? 20,
				search: params.search,
				tokenAddress: params.tokenAddress,
				topicType: params.topicType,
			}),
		getNowAttentionFeed: (modes = DEFAULT_ATTENTION_MODES) =>
			requestJson<NowAttentionFeedResponse>("/api/now-attention-feed", {
				modes: modes.join(","),
			}),
		getSpotlight: (params: SpotlightParams = {}) =>
			requestJson<unknown>("/api/spotlight", {
				historyLimit: params.historyLimit ?? 30,
				limit: params.limit ?? 15,
				lookbackHours: params.lookbackHours,
			}),
		getSpotlightPerformanceNotifications: () =>
			requestJson<unknown>("/api/spotlight-performance-notifications"),
		getSpotlightTopicSignals: (topicIds: readonly string[]) =>
			requestJson<unknown>("/api/spotlight-topic-signals", {
				topicIds: topicIds.join(","),
			}),
		getTokenMetrics: (addresses: readonly string[]) =>
			requestJson<TokenMetricsResponse>("/api/market/token-metrics", {
				addresses: addresses.join(","),
			}),
	};
}

export function buildAgentContextFromNowAttentionFeed(
	payload: NowAttentionFeedResponse,
): AgentContextResponse {
	const boards = payload.boards || {};
	const topicsByMode = Object.fromEntries(
		ATTENTION_MODES.map((mode) => [
			mode,
			(boards[mode] || [])
				.slice(0, 18)
				.map((topic, index) => toAgentTopic(topic, mode, index + 1)),
		]),
	) as AgentContextResponse["topicsByMode"];
	const seen = new Set<string>();
	const topics = ATTENTION_MODES.flatMap((mode) => topicsByMode[mode] || [])
		.filter((topic) => {
			const key = topic.id || topic.name.toLowerCase();
			if (seen.has(key)) {
				return false;
			}
			seen.add(key);
			return true;
		})
		.slice(0, 36);
	const spotlight = [...topics]
		.sort((left, right) => right.attentionScore - left.attentionScore)
		.slice(0, 8);
	const generatedAt = payload.lastUpdatedAt
		? new Date(payload.lastUpdatedAt).toISOString()
		: new Date().toISOString();

	return {
		endpoints: [
			"/api/now-attention-feed",
			"/api/spotlight",
			"/api/learning/summary",
			"/api/learning/topics",
			"/api/market/token-metrics",
		],
		freshness: {
			generatedAt,
			maxAgeSeconds: 60,
			status: topics.length > 0 ? "fresh" : "degraded",
		},
		generatedAt,
		recommendedPrompts: [
			"Scan hot Animeme topics and identify the strongest meme thesis.",
			"Analyze one token address against live attention and learning data.",
			"Find new topics now, then write a risk checklist before acting.",
			"Compare Attention Spotlight with the live rising/latest/viral boards.",
		],
		source: topics.length > 0 ? "live" : "unavailable",
		spotlight,
		topics,
		topicsByMode,
	};
}

export function findTopic(
	context: AgentContextResponse,
	topicId?: string | null,
) {
	if (topicId) {
		const normalized = topicId.trim().toLowerCase();
		const match = context.topics.find(
			(topic) =>
				topic.id.toLowerCase() === normalized ||
				topic.name.toLowerCase() === normalized,
		);
		if (match) {
			return match;
		}
	}
	return context.spotlight[0] || context.topics[0] || null;
}

export function findTopicsByTokenAddress(
	context: AgentContextResponse,
	address: string,
) {
	const normalized = address.trim().toLowerCase();
	if (!normalized) {
		return [];
	}
	return context.topics.filter((topic) =>
		topic.topTokens.some((token) => token.address.toLowerCase() === normalized),
	);
}

export function rankHotTopics(context: AgentContextResponse, limit = 10) {
	return [...context.topics]
		.sort((left, right) => {
			const scoreDiff = right.attentionScore - left.attentionScore;
			if (scoreDiff !== 0) {
				return scoreDiff;
			}
			return right.netInflow1h - left.netInflow1h;
		})
		.slice(0, limit);
}

function toAgentTopic(
	topic: RawAttentionTopic,
	mode: AttentionMode,
	rank: number,
): AgentContextTopic {
	const tokens = (topic.tokenList || [])
		.map(toAgentToken)
		.sort((left, right) => right.marketCap - left.marketCap);
	const netInflow1h =
		parseNumber(topic.topicNetInflow1h) ||
		tokens.reduce((total, token) => total + token.netInflow1h, 0);
	const netInflowTotal =
		parseNumber(topic.topicNetInflow) ||
		tokens.reduce((total, token) => total + token.netInflow1h, 0);
	const marketCapScore = tokens
		.slice(0, 4)
		.reduce((total, token) => total + token.marketCap, 0);

	return {
		attentionScore: Math.round(
			Math.max(0, netInflow1h) / 1_000 +
				Math.max(0, marketCapScore) / 100_000 +
				Math.max(0, tokens.length) * 4 +
				(24 - Math.min(rank, 24)) +
				(mode === "rising" ? 8 : mode === "viral" ? 5 : 3),
		),
		id: topic.topicId || `${mode}-${rank}`,
		mode,
		name:
			topic.name?.topicNameEn?.trim() ||
			topic.name?.topicNameCn?.trim() ||
			"Untitled attention cluster",
		netInflow1h,
		netInflowTotal,
		primaryLink: getPrimaryLink(topic),
		progress: parseNumber(topic.progress),
		rank,
		summary:
			topic.aiSummary?.aiSummaryEn?.trim() ||
			topic.aiSummary?.aiSummaryCn?.trim() ||
			"Animeme has live attention for this topic, but no narrative summary has been published yet.",
		tags: [...new Set([...(topic.topicTags || []), topic.type || ""])]
			.map((tag) => tag.trim())
			.filter(Boolean)
			.slice(0, 8),
		tokenCount: topic.tokenSize || tokens.length,
		topTokens: tokens.slice(0, 6),
		type: topic.type?.trim() || null,
	};
}

function toAgentToken(token: RawAttentionToken): AgentContextToken {
	return {
		address: token.contractAddress?.trim() || "",
		holders: parseNumber(token.holders),
		liquidity: parseNumber(token.liquidity),
		marketCap: parseNumber(token.marketCap),
		netInflow1h: parseNumber(token.netInflow1h),
		priceChange24h: parseNumber(token.priceChange24h),
		protocol: token.protocol == null ? null : String(token.protocol),
		symbol: token.symbol?.trim() || "UNKNOWN",
		volume1h: parseNumber(token.volume1hBuy) + parseNumber(token.volume1hSell),
	};
}

function getPrimaryLink(topic: RawAttentionTopic) {
	if (topic.topicLink?.trim()) {
		return topic.topicLink.trim();
	}
	for (const token of topic.tokenList || []) {
		const xLink = token.previewLink?.x?.find(Boolean);
		if (xLink) {
			return xLink;
		}
	}
	return null;
}

function buildUrl(baseUrl: string, path: string, params: QueryParams) {
	const url = new URL(path, baseUrl);
	for (const [key, value] of Object.entries(params)) {
		if (value == null || value === "") {
			continue;
		}
		if (Array.isArray(value)) {
			url.searchParams.set(key, value.map(String).join(","));
			continue;
		}
		url.searchParams.set(key, String(value));
	}
	return url;
}

function normalizeApiPath(value: string) {
	const normalized = value.trim();
	if (!normalized.startsWith("/api/")) {
		throw new Error("Only Animeme public API paths under /api/ are allowed.");
	}
	return normalized;
}

function parseNumber(value: number | string | null | undefined) {
	if (typeof value === "number") {
		return Number.isFinite(value) ? value : 0;
	}
	if (typeof value === "string") {
		const parsed = Number(value.replace(/,/g, ""));
		return Number.isFinite(parsed) ? parsed : 0;
	}
	return 0;
}

function normalizeBaseUrl(value: string) {
	const normalized = value.trim() || DEFAULT_ANIMEME_API_BASE_URL;
	const withProtocol = /^https?:\/\//i.test(normalized)
		? normalized
		: `https://${normalized}`;
	return withProtocol.endsWith("/") ? withProtocol : `${withProtocol}/`;
}
