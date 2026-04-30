import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import type { JsonObject, TokenMetricsResponse } from "./animeme-client.js";

const GMGN_API_ORIGIN = "https://openapi.gmgn.ai";
const GMGN_CHAIN = "sol";
const GMGN_LOCAL_ENV_PATH = path.join(os.homedir(), ".config", "gmgn", ".env");
const GMGN_REQUEST_TIMEOUT_MS = 8_000;
const GMGN_MAX_ADDRESSES = 20;

type GmgnTokenInfoResponse = {
	stat?: {
		creator_hold_rate?: number | string | null;
		dev_team_hold_rate?: number | string | null;
		fresh_wallet_rate?: number | string | null;
		top_10_holder_rate?: number | string | null;
		top_bundler_trader_percentage?: number | string | null;
		top_rat_trader_percentage?: number | string | null;
	} | null;
	total_fee?: number | string | null;
	wallet_tags_stat?: {
		renowned_wallets?: number | string | null;
		smart_wallets?: number | string | null;
	} | null;
};

type GmgnOpenApiEnvelope<T> = {
	code?: number | null;
	data?: T;
	error?: string | null;
	message?: string | null;
};

export type GmgnCredentialState = {
	configured: boolean;
	localEnvPath: string;
	source: "env" | "local-file" | "missing";
};

export function getGmgnCredentialState(): GmgnCredentialState {
	if (process.env.GMGN_API_KEY?.trim()) {
		return {
			configured: true,
			localEnvPath: GMGN_LOCAL_ENV_PATH,
			source: "env",
		};
	}

	return readLocalGmgnApiKey()
		? {
				configured: true,
				localEnvPath: GMGN_LOCAL_ENV_PATH,
				source: "local-file",
			}
		: {
				configured: false,
				localEnvPath: GMGN_LOCAL_ENV_PATH,
				source: "missing",
			};
}

export async function getDirectGmgnTokenMetrics(
	addresses: readonly string[],
): Promise<TokenMetricsResponse> {
	const apiKey = readGmgnApiKey();
	const normalizedAddresses = normalizeGmgnTokenAddresses([...addresses]);
	if (!apiKey) {
		return {
			errors: Object.fromEntries(
				normalizedAddresses.map((address) => [
					address,
					"GMGN_API_KEY is not configured.",
				]),
			),
			items: {},
			pendingAddresses: normalizedAddresses,
			rateLimitedUntil: null,
			source: "gmgn-openapi",
			version: 1,
		};
	}

	const entries = await Promise.allSettled(
		normalizedAddresses.map(async (address) => {
			const info = await requestGmgnOpenApi<GmgnTokenInfoResponse>(
				"/v1/token/info",
				{
					address,
					chain: GMGN_CHAIN,
				},
				apiKey,
			);
			return [address, mapGmgnTokenInfoToMetrics(address, info)] as const;
		}),
	);
	const items: Record<string, JsonObject> = {};
	const errors: Record<string, string> = {};

	for (const [index, result] of entries.entries()) {
		const address = normalizedAddresses[index];
		if (!address) continue;
		if (result.status === "fulfilled") {
			items[result.value[0]] = result.value[1];
			continue;
		}
		errors[address] =
			result.reason instanceof Error ? result.reason.message : String(result.reason);
	}

	return {
		errors,
		items,
		pendingAddresses: normalizedAddresses.filter((address) => !items[address]),
		rateLimitedUntil: null,
		source: "gmgn-openapi",
		version: 1,
	};
}

function readGmgnApiKey() {
	return process.env.GMGN_API_KEY?.trim() || readLocalGmgnApiKey();
}

function readLocalGmgnApiKey() {
	if (!existsSync(GMGN_LOCAL_ENV_PATH)) {
		return null;
	}

	const fileContents = readFileSync(GMGN_LOCAL_ENV_PATH, "utf8");
	for (const rawLine of fileContents.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) continue;

		const separatorIndex = line.indexOf("=");
		if (separatorIndex <= 0) continue;

		const key = line.slice(0, separatorIndex).trim();
		if (key !== "GMGN_API_KEY") continue;

		const rawValue = line.slice(separatorIndex + 1).trim();
		return rawValue.replace(/^['"]|['"]$/g, "") || null;
	}
	return null;
}

function mapGmgnTokenInfoToMetrics(
	address: string,
	info: GmgnTokenInfoResponse,
): JsonObject {
	const bundlerPercent = ratioToPercent(
		info.stat?.top_bundler_trader_percentage,
	);
	const creatorDevHoldingPercent = maxMetricValue([
		ratioToPercent(info.stat?.creator_hold_rate),
		ratioToPercent(info.stat?.dev_team_hold_rate),
	]);
	const freshWalletPercent = ratioToPercent(info.stat?.fresh_wallet_rate);
	const insiderPercent = ratioToPercent(info.stat?.top_rat_trader_percentage);
	const kolHolders = toFiniteInteger(info.wallet_tags_stat?.renowned_wallets);
	const smartHolders = toFiniteInteger(info.wallet_tags_stat?.smart_wallets);
	const top10HolderPercent = ratioToPercent(info.stat?.top_10_holder_rate);
	const totalFeesPaidSol = toFiniteNumber(info.total_fee);
	return {
		address,
		bundlerPercent,
		creatorDevHoldingPercent,
		freshWalletPercent,
		gmgnBundlerPercent: bundlerPercent,
		gmgnCreatorDevHoldingPercent: creatorDevHoldingPercent,
		gmgnFreshWalletPercent: freshWalletPercent,
		gmgnInsiderPercent: insiderPercent,
		gmgnKolHolders: kolHolders,
		gmgnRaw: info as JsonObject,
		gmgnSmartHolders: smartHolders,
		gmgnTop10HolderPercent: top10HolderPercent,
		gmgnTotalFeesPaid: totalFeesPaidSol,
		insiderPercent,
		kolHolders,
		smartHolders,
		source: "gmgn-openapi",
		top10HolderPercent,
		totalFeesPaidSol,
	};
}

async function requestGmgnOpenApi<T>(
	subPath: string,
	query: Record<string, string>,
	apiKey: string,
): Promise<T> {
	const requestUrl = new URL(subPath, GMGN_API_ORIGIN);
	for (const [key, value] of Object.entries({
		...query,
		client_id: randomUUID(),
		timestamp: String(Math.floor(Date.now() / 1000)),
	})) {
		requestUrl.searchParams.set(key, value);
	}

	const controller = new AbortController();
	const timeout = setTimeout(
		() => controller.abort("GMGN token metrics timed out"),
		GMGN_REQUEST_TIMEOUT_MS,
	);
	try {
		const response = await fetch(requestUrl, {
			headers: {
				"Content-Type": "application/json",
				"X-APIKEY": apiKey,
				accept: "application/json",
				"user-agent": "Animeme-Agent/0.3",
			},
			method: "GET",
			signal: controller.signal,
		});
		const body = await response.text();
		if (!response.ok) {
			throw new Error(
				`GMGN token metrics responded with ${response.status}: ${body
					.replace(/\s+/g, " ")
					.trim()
					.slice(0, 300)}`,
			);
		}

		let payload: GmgnOpenApiEnvelope<T>;
		try {
			payload = JSON.parse(body) as GmgnOpenApiEnvelope<T>;
		} catch {
			throw new Error("GMGN token metrics returned non-JSON data.");
		}

		if (payload.code !== 0 || typeof payload.data === "undefined") {
			throw new Error(
				payload.message ||
					payload.error ||
					"GMGN token metrics returned no data.",
			);
		}

		return payload.data;
	} finally {
		clearTimeout(timeout);
	}
}

function normalizeGmgnTokenAddresses(addresses: string[]) {
	return [...new Set(addresses.map((address) => address.trim()))]
		.filter(Boolean)
		.filter(isLikelySolanaAddress)
		.slice(0, GMGN_MAX_ADDRESSES);
}

function isLikelySolanaAddress(value: string) {
	return (
		value.length >= 32 &&
		value.length <= 44 &&
		/^[1-9A-HJ-NP-Za-km-z]+$/.test(value)
	);
}

function maxMetricValue(values: Array<number | null>) {
	const numericValues = values.filter(
		(value): value is number =>
			typeof value === "number" && Number.isFinite(value),
	);
	return numericValues.length > 0 ? Math.max(...numericValues) : null;
}

function ratioToPercent(value?: number | string | null) {
	const numericValue = toFiniteNumber(value);
	return numericValue == null ? null : numericValue * 100;
}

function toFiniteInteger(value?: number | string | null) {
	const numericValue = toFiniteNumber(value);
	return numericValue == null ? null : Math.max(0, Math.round(numericValue));
}

function toFiniteNumber(value?: number | string | null) {
	if (typeof value === "number") {
		return Number.isFinite(value) ? value : null;
	}
	if (typeof value === "string") {
		const parsed = Number(value.trim());
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}
