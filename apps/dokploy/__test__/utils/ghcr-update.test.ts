import {
	findLatestVersionTag,
	getGhcrUpdateData,
} from "@dokploy/server/services/ghcr-update";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockRegistry = (tags: string[], digest = "sha256:new") => {
	vi.stubGlobal(
		"fetch",
		vi.fn(async (url: string) => {
			if (url.includes("/token")) {
				return new Response(JSON.stringify({ token: "t" }));
			}
			if (url.includes("/tags/list")) {
				return new Response(JSON.stringify({ tags }));
			}
			return new Response(null, {
				headers: { "docker-content-digest": digest },
			});
		}),
	);
};

describe("findLatestVersionTag", () => {
	it("picks the highest semver tag and ignores others", () => {
		expect(
			findLatestVersionTag(["latest", "v0.9.0", "v0.10.1", "v0.10.0", "foo"]),
		).toBe("v0.10.1");
	});

	it("returns null without version tags", () => {
		expect(findLatestVersionTag(["latest"])).toBeNull();
	});
});

describe("getGhcrUpdateData", () => {
	afterEach(() => vi.unstubAllGlobals());

	const repo = "ghcr.io/someone/dokploy";
	const currentDigest = async () => "sha256:old";

	it("reports a newer version", async () => {
		mockRegistry(["latest", "v0.25.0", "v0.26.0"]);
		expect(await getGhcrUpdateData(repo, "v0.25.0", currentDigest)).toEqual({
			latestVersion: "v0.26.0",
			updateAvailable: true,
		});
	});

	it("reports a rebuild of the same version by digest", async () => {
		mockRegistry(["v0.26.0"], "sha256:new");
		expect(
			(await getGhcrUpdateData(repo, "v0.26.0", currentDigest)).updateAvailable,
		).toBe(true);
	});

	it("reports no update when the digest matches", async () => {
		mockRegistry(["v0.26.0"], "sha256:old");
		expect(
			(await getGhcrUpdateData(repo, "v0.26.0", currentDigest)).updateAvailable,
		).toBe(false);
	});

	it("never offers a downgrade", async () => {
		mockRegistry(["v0.24.0"]);
		expect(
			(await getGhcrUpdateData(repo, "v0.26.0", currentDigest)).updateAvailable,
		).toBe(false);
	});
});
