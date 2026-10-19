import { execAsyncRemote } from "../utils/process/execAsync";

export interface RemoteHostStats {
	cpuPercent: number;
	cpuCores: number;
	memTotalBytes: number;
	memUsedBytes: number;
	memPercent: number;
}

// CPU usage needs two /proc/stat samples; a single one only has totals since boot.
const REMOTE_STATS_COMMAND = [
	"head -n1 /proc/stat",
	"sleep 1",
	"head -n1 /proc/stat",
	"grep -E '^(MemTotal|MemAvailable):' /proc/meminfo",
	"nproc",
].join(" && ");

const parseCpuLine = (line: string) => {
	// user nice system idle iowait irq softirq steal
	const values = line.trim().split(/\s+/).slice(1, 9).map(Number);
	const idle = (values[3] ?? 0) + (values[4] ?? 0);
	const total = values.reduce((sum, v) => sum + (Number.isNaN(v) ? 0 : v), 0);
	return { idle, total };
};

export const parseRemoteHostStats = (output: string): RemoteHostStats => {
	const lines = output.split("\n").map((l) => l.trim());
	const cpuLines = lines.filter((l) => /^cpu\s/.test(l));
	if (cpuLines.length < 2) {
		throw new Error("Unable to read CPU stats from server");
	}

	const first = parseCpuLine(cpuLines[0] as string);
	const second = parseCpuLine(cpuLines[1] as string);
	const totalDelta = second.total - first.total;
	const idleDelta = second.idle - first.idle;
	const cpuPercent =
		totalDelta > 0 ? ((totalDelta - idleDelta) / totalDelta) * 100 : 0;

	const readMemKb = (key: string) => {
		const line = lines.find((l) => l.startsWith(`${key}:`));
		return line ? Number(line.split(/\s+/)[1]) : 0;
	};
	const memTotalBytes = readMemKb("MemTotal") * 1024;
	const memUsedBytes = memTotalBytes - readMemKb("MemAvailable") * 1024;

	const coresLine = lines.filter((l) => /^\d+$/.test(l)).pop();

	return {
		cpuPercent: Math.round(cpuPercent * 10) / 10,
		cpuCores: coresLine ? Number(coresLine) : 0,
		memTotalBytes,
		memUsedBytes,
		memPercent:
			memTotalBytes > 0
				? Math.round((memUsedBytes / memTotalBytes) * 1000) / 10
				: 0,
	};
};

export const getRemoteHostStats = async (serverId: string) => {
	const { stdout } = await execAsyncRemote(serverId, REMOTE_STATS_COMMAND);
	return parseRemoteHostStats(stdout);
};
