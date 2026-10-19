import { Cpu, Loader2, MemoryStick } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { api } from "@/utils/api";

interface Props {
	serverId: string;
}

const formatGiB = (bytes: number) => `${(bytes / 1024 ** 3).toFixed(1)} GiB`;

export const ServerResourceUsage = ({ serverId }: Props) => {
	const { data, isPending, isError } = api.server.resourceUsage.useQuery(
		{ serverId },
		{
			refetchInterval: 15000,
			retry: false,
		},
	);

	if (isPending) {
		return (
			<div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
				<Loader2 className="size-3 animate-spin" />
				Loading resource usage...
			</div>
		);
	}

	if (isError || !data) {
		return (
			<div className="text-xs text-muted-foreground pt-2 border-t">
				Resource usage unavailable
			</div>
		);
	}

	return (
		<div className="space-y-2 pt-2 border-t">
			<div className="space-y-1">
				<div className="flex items-center justify-between text-sm">
					<span className="flex items-center gap-2 text-muted-foreground">
						<Cpu className="size-4" />
						CPU
					</span>
					<span className="font-medium">
						{data.cpuPercent}%
						<span className="text-xs text-muted-foreground">
							{" "}
							of {data.cpuCores} cores
						</span>
					</span>
				</div>
				<Progress value={data.cpuPercent} className="h-2" />
			</div>
			<div className="space-y-1">
				<div className="flex items-center justify-between text-sm">
					<span className="flex items-center gap-2 text-muted-foreground">
						<MemoryStick className="size-4" />
						RAM
					</span>
					<span className="font-medium">
						{formatGiB(data.memUsedBytes)}
						<span className="text-xs text-muted-foreground">
							{" "}
							/ {formatGiB(data.memTotalBytes)}
						</span>
					</span>
				</div>
				<Progress value={data.memPercent} className="h-2" />
			</div>
		</div>
	);
};
