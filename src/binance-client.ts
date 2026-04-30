import type { JsonObject } from "./animeme-client.js";

export const DEFAULT_BINANCE_SPOT_BASE_URL = "https://api.binance.com";
const BINANCE_WEB3_BASE_URL = "https://web3.binance.com";
const BINANCE_KLINE_BASE_URL = "https://dquery.sintral.io";
const BINANCE_REQUEST_TIMEOUT_MS = 12_000;

export const BINANCE_SPOT_PUBLIC_PATHS = [
	"/api/v3/aggTrades",
	"/api/v3/avgPrice",
	"/api/v3/depth",
	"/api/v3/exchangeInfo",
	"/api/v3/klines",
	"/api/v3/ping",
	"/api/v3/ticker",
	"/api/v3/ticker/24hr",
	"/api/v3/ticker/bookTicker",
	"/api/v3/ticker/price",
	"/api/v3/ticker/tradingDay",
	"/api/v3/time",
	"/api/v3/trades",
	"/api/v3/uiKlines",
] as const;

export type BinanceWeb3Mode = "dynamic" | "kline" | "meta" | "search";

export type BinanceMarketBundle = {
	generatedAt: string;
	source: "binance-public";
	spot: Record<string, unknown>;
	symbol: string;
	web3?: Record<string, unknown>;
};

type QueryValue =
	| boolean
	| null
	| number
	| readonly (boolean | number | string)[]
	| string
	| undefined;

type QueryParams = Record<string, QueryValue>;

type BinanceWeb3Options = {
	chainId?: string | null;
	chainIds?: string | null;
	contractAddress?: string | null;
	from?: number | string | null;
	interval?: string | null;
	keyword?: string | null;
	limit?: number | string | null;
	mode: BinanceWeb3Mode;
	orderBy?: string | null;
	platform?: string | null;
	pm?: string | null;
	to?: number | string | null;
};

export async function checkBinancePublicAccess() {
	const [spotTime, web3Search] = await Promise.allSettled([
		fetchBinanceSpotPublicPath("/api/v3/time"),
		fetchBinanceWeb3({
			chainIds: "CT_501",
			keyword: "SOL",
			mode: "search",
			orderBy: "volume24h",
		}),
	]);
	return {
		spotTime,
		web3Search,
	};
}

export async function getBinanceMarketBundle(options: {
	address?: string | null;
	chainId?: string | null;
	interval?: string | null;
	limit?: number | null;
	platform?: string | null;
	symbol?: string | null;
}): Promise<BinanceMarketBundle> {
	const symbol = normalizeBinanceSymbol(options.symbol || "SOLUSDT");
	const [time, price, ticker24h, bookTicker, klines] = await Promise.all([
		settleProvider(() => fetchBinanceSpotPublicPath("/api/v3/time")),
		settleProvider(() =>
			fetchBinanceSpotPublicPath("/api/v3/ticker/price", { symbol }),
		),
		settleProvider(() =>
			fetchBinanceSpotPublicPath("/api/v3/ticker/24hr", { symbol }),
		),
		settleProvider(() =>
			fetchBinanceSpotPublicPath("/api/v3/ticker/bookTicker", { symbol }),
		),
		settleProvider(() =>
			fetchBinanceSpotPublicPath("/api/v3/klines", {
				interval: "1h",
				limit: options.limit || 24,
				symbol,
			}),
		),
	]);

	const address = options.address?.trim();
	const chainId = options.chainId || "CT_501";
	const platform = options.platform || "solana";
	const web3 = address
		? {
				dynamic: await settleProvider(() =>
					fetchBinanceWeb3({
						chainId,
						contractAddress: address,
						mode: "dynamic",
					}),
				),
				kline: await settleProvider(() =>
					fetchBinanceWeb3({
						contractAddress: address,
						interval: options.interval || "1min",
						limit: options.limit || 100,
						mode: "kline",
						platform,
					}),
				),
				meta: await settleProvider(() =>
					fetchBinanceWeb3({
						chainId,
						contractAddress: address,
						mode: "meta",
					}),
				),
			}
		: undefined;

	return {
		generatedAt: new Date().toISOString(),
		source: "binance-public",
		spot: {
			bookTicker,
			klines,
			price,
			ticker24h,
			time,
		},
		symbol,
		web3,
	};
}

export async function fetchBinanceSpotPublicPath(
	rawPath: string,
	params: QueryParams = {},
) {
	const requestUrl = buildBinanceSpotUrl(rawPath, params);
	return requestJson<JsonObject | JsonObject[]>(requestUrl, {
		accept: "application/json",
		"user-agent": "Animeme-Agent/binance-spot-public",
	});
}

export async function fetchBinanceWeb3(options: BinanceWeb3Options) {
	switch (options.mode) {
		case "search":
			return requestJson<JsonObject | JsonObject[]>(
				buildUrl(
					BINANCE_WEB3_BASE_URL,
					"/bapi/defi/v5/public/wallet-direct/buw/wallet/market/token/search/ai",
					{
						chainIds: options.chainIds || "56,8453,CT_501",
						keyword: requireParam(options.keyword, "keyword"),
						orderBy: options.orderBy || "volume24h",
					},
				),
				binanceWeb3Headers(),
			);
		case "meta":
			return requestJson<JsonObject>(
				buildUrl(
					BINANCE_WEB3_BASE_URL,
					"/bapi/defi/v1/public/wallet-direct/buw/wallet/dex/market/token/meta/info/ai",
					{
						chainId: options.chainId || "CT_501",
						contractAddress: requireParam(
							options.contractAddress,
							"contractAddress",
						),
					},
				),
				binanceWeb3Headers(),
			);
		case "dynamic":
			return requestJson<JsonObject>(
				buildUrl(
					BINANCE_WEB3_BASE_URL,
					"/bapi/defi/v4/public/wallet-direct/buw/wallet/market/token/dynamic/info/ai",
					{
						chainId: options.chainId || "CT_501",
						contractAddress: requireParam(
							options.contractAddress,
							"contractAddress",
						),
					},
				),
				binanceWeb3Headers(),
			);
		case "kline":
			return requestJson<JsonObject>(
				buildUrl(BINANCE_KLINE_BASE_URL, "/u-kline/v1/k-line/candles", {
					address: requireParam(options.contractAddress, "contractAddress"),
					from: options.from,
					interval: options.interval || "1min",
					limit: options.limit || 500,
					platform: options.platform || "solana",
					pm: options.pm,
					to: options.to,
				}),
				binanceWeb3Headers(),
			);
	}
}

function buildBinanceSpotUrl(rawPath: string, params: QueryParams) {
	const baseUrl = normalizeBaseUrl(
		process.env.BINANCE_SPOT_BASE_URL || DEFAULT_BINANCE_SPOT_BASE_URL,
	);
	const requestUrl = new URL(rawPath.trim(), baseUrl);
	if (!isBinanceSpotPublicPath(requestUrl.pathname)) {
		throw new Error(
			`Binance Spot path is not in the read-only public allowlist: ${requestUrl.pathname}`,
		);
	}
	for (const [key, value] of requestUrl.searchParams.entries()) {
		if (params[key] == null) {
			params[key] = value;
		}
	}
	return buildUrl(baseUrl, requestUrl.pathname, params);
}

function isBinanceSpotPublicPath(pathname: string) {
	return BINANCE_SPOT_PUBLIC_PATHS.some((path) => path === pathname);
}

async function requestJson<T>(
	url: URL,
	headers: Record<string, string>,
): Promise<T> {
	const controller = new AbortController();
	const timeout = setTimeout(
		() => controller.abort("Binance request timeout"),
		BINANCE_REQUEST_TIMEOUT_MS,
	);
	try {
		const response = await fetch(url, {
			headers,
			signal: controller.signal,
		});
		const body = await response.text();
		if (!response.ok) {
			throw new Error(
				`${url.pathname} responded with ${response.status}: ${body
					.replace(/\s+/g, " ")
					.trim()
					.slice(0, 300)}`,
			);
		}
		try {
			return JSON.parse(body) as T;
		} catch {
			throw new Error(`${url.pathname} returned non-JSON data.`);
		}
	} finally {
		clearTimeout(timeout);
	}
}

async function settleProvider(loader: () => Promise<unknown>) {
	try {
		return await loader();
	} catch (error) {
		return {
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

function buildUrl(origin: string, path: string, params: QueryParams) {
	const requestUrl = new URL(path, normalizeBaseUrl(origin));
	for (const [key, value] of Object.entries(params)) {
		if (value == null || value === "") {
			continue;
		}
		if (Array.isArray(value)) {
			requestUrl.searchParams.set(key, value.map(String).join(","));
			continue;
		}
		requestUrl.searchParams.set(key, String(value));
	}
	return requestUrl;
}

function requireParam(value: string | null | undefined, name: string) {
	const normalized = value?.trim();
	if (!normalized) {
		throw new Error(`Missing required Binance parameter: ${name}.`);
	}
	return normalized;
}

function normalizeBinanceSymbol(symbol: string) {
	return symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") || "SOLUSDT";
}

function normalizeBaseUrl(value: string) {
	const normalized = value.trim();
	const withProtocol = /^https?:\/\//i.test(normalized)
		? normalized
		: `https://${normalized}`;
	return withProtocol.endsWith("/") ? withProtocol : `${withProtocol}/`;
}

function binanceWeb3Headers() {
	return {
		"accept-encoding": "identity",
		accept: "application/json",
		"user-agent": "binance-web3/1.1 (Skill)",
	};
}
