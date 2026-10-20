export default function compareDependencies(
  declaredDependencies,
  lockedDependencies,
) {
  const regex = /^([^\d\s]+)?\s*(\d+(?:\.\d+){0,2})$/;
  const COMPARING_RULES = {};
  for (const [name, ver] of declaredDependencies) {
    const entry = lockedDependencies.get(name);
    if (!entry) {
      console.log(
        `${name} is in the package.json file but missing from the lockfile please check.`,
      );
    }
    const version = ver.match(regex);
    console.log(version);
  }
}
