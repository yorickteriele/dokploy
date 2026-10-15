import { parseRemoteHostStats } from "@dokploy/server/monitoring/remote-host-stats";
import { describe, expect, it } from "vitest";

const output = [
	"cpu  1000 0 1000 8000 0 0 0 0 0 0",
	"cpu  1100 0 1100 8800 0 0 0 0 0 0",
	"MemTotal:        8000000 kB",
	"MemAvailable:    6000000 kB",
	"4",
].join("\n");

describe("parseRemoteHostStats", () => {
	it("computes CPU usage from the delta between two samples", () => {
		expect(parseRemoteHostStats(output).cpuPercent).toBe(20);
	});

	it("reads memory and core count", () => {
		const stats = parseRemoteHostStats(output);
		expect(stats.cpuCores).toBe(4);
		expect(stats.memTotalBytes).toBe(8000000 * 1024);
		expect(stats.memUsedBytes).toBe(2000000 * 1024);
		expect(stats.memPercent).toBe(25);
	});

	it("throws when CPU samples are missing", () => {
		expect(() => parseRemoteHostStats("MemTotal: 1 kB")).toThrow();
	});
});
