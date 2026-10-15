import semver from "semver";

const GHCR_PREFIX = "ghcr.io/";

const MANIFEST_ACCEPT = [
	"application/vnd.oci.image.index.v1+json",
	"application/vnd.docker.distribution.manifest.list.v2+json",
	"application/vnd.docker.distribution.manifest.v2+json",
	"application/vnd.oci.image.manifest.v1+json",
].join(", ");

export const isGhcrRepository = (repository: string) =>
	repository.startsWith(GHCR_PREFIX);

export const findLatestVersionTag = (tags: string[]) =>
	tags
		.filter((tag) => tag.startsWith("v") && semver.valid(tag))
		.sort(semver.rcompare)[0] ?? null;

export const getGhcrUpdateData = async (
	repository: string,
	currentVersion: string,
	getCurrentDigest: () => Promise<string>,
) => {
	const name = repository.slice(GHCR_PREFIX.length);

	// Public ghcr.io packages still require an anonymous bearer token.
	const tokenResponse = await fetch(
		`https://ghcr.io/token?scope=repository:${name}:pull`,
	);
	const { token } = (await tokenResponse.json()) as { token: string };
	const headers = { Authorization: `Bearer ${token}` };

	const tagsResponse = await fetch(
		`https://ghcr.io/v2/${name}/tags/list?n=1000`,
		{ headers },
	);
	const { tags } = (await tagsResponse.json()) as { tags?: string[] };

	const latestVersion = findLatestVersionTag(tags ?? []);
	const cleanedCurrent = semver.clean(currentVersion);
	if (!latestVersion || !cleanedCurrent) {
		return { latestVersion: null, updateAvailable: false };
	}

	if (semver.gt(latestVersion, cleanedCurrent)) {
		return { latestVersion, updateAvailable: true };
	}
	if (semver.lt(latestVersion, cleanedCurrent)) {
		return { latestVersion, updateAvailable: false };
	}

	// Same upstream version: a fork rebuild only shows up as a new digest.
	const manifestResponse = await fetch(
		`https://ghcr.io/v2/${name}/manifests/${latestVersion}`,
		{ method: "HEAD", headers: { ...headers, Accept: MANIFEST_ACCEPT } },
	);
	const latestDigest = manifestResponse.headers.get("docker-content-digest");
	const currentDigest = await getCurrentDigest().catch(() => null);

	return {
		latestVersion,
		updateAvailable:
			!!latestDigest && !!currentDigest && latestDigest !== currentDigest,
	};
};
