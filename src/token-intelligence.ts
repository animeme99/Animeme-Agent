import type { AgentContextTopic, TokenMetricsResponse } from "./animeme-client.js";

export type TokenIntelligenceInput = {
	address: string;
	attentionTopics: AgentContextTopic[];
	learningItems: unknown[];
	metrics: TokenMetricsResponse | null;
};

export type TokenIntelligenceReport = {
	address: string;
	confidence: "high" | "low" | "medium";
	hardStops: string[];
	marketProfile: Record<string, number | null>;
	score: number;
	strengths: string[];
	verdict: "avoid" | "high-risk" | "researchable" | "watch";
	warnings: string[];
};

export function buildTokenIntelligenceReport(
	input: TokenIntelligenceInput,
): TokenIntelligenceReport {
	const metric = findMetricForAddress(input.metrics, input.address);
	const marketProfile = {
		bundlerPercent: readNumber(metric, [
			"bundlerPercent",
			"gmgnBundlerPercent",
		]),
		creatorDevHoldingPercent: readNumber(metric, [
			"creatorDevHoldingPercent",
			"gmgnCreatorDevHoldingPercent",
		]),
		freshWalletPercent: readNumber(metric, [
			"freshWalletPercent",
			"gmgnFreshWalletPercent",
		]),
		insiderPercent: readNumber(metric, ["insiderPercent", "gmgnInsiderPercent"]),
		kolHolders: readNumber(metric, ["kolHolders", "gmgnKolHolders"]),
		smartHolders: readNumber(metric, ["smartHolders", "gmgnSmartHolders"]),
		top10HolderPercent: readNumber(metric, [
			"top10HolderPercent",
			"gmgnTop10HolderPercent",
		]),
		totalFeesPaidSol: readNumber(metric, [
			"totalFeesPaidSol",
			"gmgnTotalFeesPaid",
		]),
	};
	const strengths: string[] = [];
	const warnings: string[] = [];
	const hardStops: string[] = [];
	let score = 50;

	if (input.attentionTopics.length > 0) {
		score += 16;
		strengths.push("Linked to live Animeme attention topics.");
	} else {
		score -= 8;
		warnings.push("No live Animeme attention topic currently links this token.");
	}

	if (input.learningItems.length > 0) {
		score += 8;
		strengths.push("Has matching Animeme learning archive context.");
	}

	if (!metric) {
		score -= 12;
		warnings.push("GMGN/Animeme market metrics are not available yet.");
	} else {
		score += 4;
		strengths.push("GMGN/Animeme market metrics are available.");
	}

	score += scoreConcentration("Top 10 holder share", marketProfile.top10HolderPercent, {
		dangerAbove: 50,
		warningAbove: 20,
		warnings,
		hardStops,
	});
	score += scoreConcentration(
		"Creator/dev holding share",
		marketProfile.creatorDevHoldingPercent,
		{
			dangerAbove: 30,
			warningAbove: 10,
			warnings,
			hardStops,
		},
	);
	score += scoreConcentration("Insider share", marketProfile.insiderPercent, {
		dangerAbove: 30,
		warningAbove: 10,
		warnings,
		hardStops,
	});
	score += scoreConcentration("Bundled activity share", marketProfile.bundlerPercent, {
		dangerAbove: 35,
		warningAbove: 15,
		warnings,
		hardStops,
	});

	if (marketProfile.freshWalletPercent != null) {
		if (marketProfile.freshWalletPercent > 70) {
			score -= 8;
			warnings.push("Fresh-wallet share is high; verify that activity is organic.");
		} else if (marketProfile.freshWalletPercent < 35) {
			score += 3;
			strengths.push("Fresh-wallet share is not unusually high.");
		}
	}

	if (marketProfile.smartHolders != null) {
		if (marketProfile.smartHolders >= 3) {
			score += 12;
			strengths.push("Smart holder count is meaningful.");
		} else if (marketProfile.smartHolders > 0) {
			score += 4;
			warnings.push("Smart holder count is present but thin.");
		} else {
			score -= 6;
			warnings.push("No smart holders detected in the GMGN metrics snapshot.");
		}
	}

	if (marketProfile.kolHolders != null && marketProfile.kolHolders > 0) {
		score += Math.min(8, marketProfile.kolHolders * 2);
		strengths.push("KOL holder presence is visible.");
	}

	const boundedScore = Math.max(0, Math.min(100, Math.round(score)));
	const verdict = hardStops.length
		? "avoid"
		: boundedScore >= 72
			? "researchable"
			: boundedScore >= 45
				? "watch"
				: "high-risk";
	const confidence = metric && input.attentionTopics.length > 0
		? "high"
		: metric || input.attentionTopics.length > 0
			? "medium"
			: "low";

	return {
		address: input.address,
		confidence,
		hardStops,
		marketProfile,
		score: boundedScore,
		strengths,
		verdict,
		warnings,
	};
}

export function findMetricForAddress(
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

function scoreConcentration(
	label: string,
	value: number | null,
	options: {
		dangerAbove: number;
		hardStops: string[];
		warningAbove: number;
		warnings: string[];
	},
) {
	if (value == null) {
		return 0;
	}
	if (value > options.dangerAbove) {
		options.hardStops.push(`${label} is above ${options.dangerAbove}%.`);
		return -24;
	}
	if (value > options.warningAbove) {
		options.warnings.push(`${label} is above ${options.warningAbove}%.`);
		return -10;
	}
	return 5;
}

function readNumber(record: Record<string, unknown> | null, keys: readonly string[]) {
	if (!record) {
		return null;
	}
	const value = getField(record, keys);
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === "string") {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
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
