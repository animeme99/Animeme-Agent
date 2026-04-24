export const DEFAULT_ANIMEME_API_BASE_URL = "https://animeme.app";
export const AGENT_CONTEXT_MODES = ["rising", "latest", "viral"] as const;

export type AgentContextMode = (typeof AGENT_CONTEXT_MODES)[number];

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
	mode: AgentContextMode;
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
	freshness: {
		generatedAt: string;
		maxAgeSeconds: number;
		status: "degraded" | "fresh";
	};
	generatedAt: string;
	recommendedPrompts: string[];
	source: "fallback" | "live" | "unavailable";
	spotlight: AgentContextTopic[];
	topics: AgentContextTopic[];
	topicsByMode: Partial<Record<AgentContextMode, AgentContextTopic[]>>;
};

export type AnimemeClient = {
	getAgentContext: () => Promise<AgentContextResponse>;
	getLearningSummary: () => Promise<unknown>;
	getLearningTopics: () => Promise<unknown>;
	getNowAttentionFeed: () => Promise<NowAttentionFeedResponse>;
	getSpotlight: () => Promise<unknown>;
};

export type AnimemeClientOptions = {
	baseUrl?: string;
	fetchImpl?: typeof fetch;
	timeoutMs?: number;
};

type NowAttentionFeedResponse = {
	boards?: Partial<Record<AgentContextMode, RawAttentionTopic[]>>;
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
		options.baseUrl || process.env.ANIMEME_API_BASE_URL || DEFAULT_ANIMEME_API_BASE_URL,
	);
	const fetchImpl = options.fetchImpl || fetch;
	const timeoutMs = options.timeoutMs || 10_000;

	const requestJson = async <T>(path: string) => {
		const controller = new AbortController();
		const timeout = setTimeout(
			() => controller.abort("Animeme request timeout"),
			timeoutMs,
		);
		try {
			const response = await fetchImpl(new URL(path, baseUrl), {
				headers: {
					accept: "application/json",
					"user-agent": "Animeme-Agent/0.1",
				},
				signal: controller.signal,
			});
			if (!response.ok) {
				throw new Error(`${path} responded with ${response.status}`);
			}
			return (await response.json()) as T;
		} finally {
			clearTimeout(timeout);
		}
	};

	return {
		async getAgentContext() {
			try {
				return await requestJson<AgentContextResponse>("/api/agent/context");
			} catch {
				const fallback = await requestJson<NowAttentionFeedResponse>(
					"/api/now-attention-feed?modes=rising,latest,viral",
				);
				return buildAgentContextFromNowAttentionFeed(fallback);
			}
		},
		getLearningSummary: () => requestJson<unknown>("/api/learning/summary"),
		getLearningTopics: () => requestJson<unknown>("/api/learning/topics"),
		getNowAttentionFeed: () =>
			requestJson<NowAttentionFeedResponse>(
				"/api/now-attention-feed?modes=rising,latest,viral",
			),
		getSpotlight: () => requestJson<unknown>("/api/spotlight"),
	};
}

export function buildAgentContextFromNowAttentionFeed(
	payload: NowAttentionFeedResponse,
): AgentContextResponse {
	const boards = payload.boards || {};
	const topicsByMode = Object.fromEntries(
		AGENT_CONTEXT_MODES.map((mode) => [
			mode,
			(boards[mode] || [])
				.slice(0, 12)
				.map((topic, index) => toAgentTopic(topic, mode, index + 1)),
		]),
	) as AgentContextResponse["topicsByMode"];
	const seen = new Set<string>();
	const topics = AGENT_CONTEXT_MODES.flatMap((mode) => topicsByMode[mode] || [])
		.filter((topic) => {
			if (seen.has(topic.id)) {
				return false;
			}
			seen.add(topic.id);
			return true;
		})
		.slice(0, 24);
	const spotlight = [...topics]
		.sort((left, right) => right.attentionScore - left.attentionScore)
		.slice(0, 5);
	const generatedAt = payload.lastUpdatedAt
		? new Date(payload.lastUpdatedAt).toISOString()
		: new Date().toISOString();

	return {
		freshness: {
			generatedAt,
			maxAgeSeconds: 60,
			status: topics.length > 0 ? "fresh" : "degraded",
		},
		generatedAt,
		recommendedPrompts: [
			"Scan rising topics and identify the strongest meme thesis.",
			"Pick one topic and build a token launch watch plan.",
			"Review risk for the hottest narrative before I act.",
			"Turn current Animeme attention into three agent tasks.",
		],
		source: topics.length > 0 ? "fallback" : "unavailable",
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
		const match = context.topics.find((topic) => topic.id === topicId);
		if (match) {
			return match;
		}
	}
	return context.spotlight[0] || context.topics[0] || null;
}

function toAgentTopic(
	topic: RawAttentionTopic,
	mode: AgentContextMode,
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
		.slice(0, 3)
		.reduce((total, token) => total + token.marketCap, 0);

	return {
		attentionScore: Math.round(
			Math.max(0, netInflow1h) / 1_000 +
				Math.max(0, marketCapScore) / 100_000 +
				Math.max(0, tokens.length) * 4 +
				(20 - Math.min(rank, 20)),
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
			.slice(0, 6),
		tokenCount: topic.tokenSize || tokens.length,
		topTokens: tokens.slice(0, 4),
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
