export default function compareDependencies(
  declaredDependencies,
  lockedDependencies,
) {
  const regex = /^([^\d\s]+)?\s*(\d+(?:\.\d+){0,2})$/;
  let isSame = true;
  const differentDependenciesArr = [];

  for (const [name, ver] of declaredDependencies) {
    const entry = lockedDependencies.get(name);
    if (!entry) {
      console.log(
        `${name} is in the package.json file but missing from the lockfile please check.`,
      );
      continue;
    }
    const declaredDependenciesVersion = ver.trim().match(regex);
    if (entry.specifier !== ver) {
      console.log(`Warning! check ${name}`);
      isSame = false;
      differentDependenciesArr.push(name);
    }
    if (!declaredDependenciesVersion) {
      console.log(
        `Warning: Unable to evaluate the version specifier ${ver} of ${name} because its syntax is not supported. Please check it manually.`,
      );
      continue;
    }
    const operator = declaredDependenciesVersion[1];
    const declaredVersion = declaredDependenciesVersion[2]
      .trim()
      .split(".")
      .map((text) => Number(text));
    const lockedVersion = entry.version
      .trim()
      .split(".")
      .map((text) => Number(text));
    if (operator) COMPARING_RULES[operator](declaredVersion, lockedVersion);
  }
}

const COMPARING_RULES = {
  "^": (declaredVersion, lockedVersion) => {
    let doesSatisfy = true;

    for (let i = 0; i < 3; i++) {
      const declared = declaredVersion[i] ?? 0;
      const locked = lockedVersion[i] ?? 0;
      if (locked < declared) {
        doesSatisfy = false;
        break;
      }
      if (locked > declared) break;
    }
    let upperVersionLimit;
    for (let i = 0; i < 3; i++) {
      if (declaredVersion[i] === 0) continue;
      upperVersionLimit = [0, 0, 0];
      upperVersionLimit[i] = declaredVersion[i] + 1;
      break;
    }

    let counter = 0;
    for (let i = 0; i < 3; i++) {
      const upper = upperVersionLimit?.[i] ?? 0;
      const locked = lockedVersion[i] ?? 0;
      if (locked > upper) {
        doesSatisfy = false;
        break;
      }
      if (locked === upper) counter++;
      if (locked < upper || counter === 3) break;
    }
    if (counter === 3) doesSatisfy = false; // upper limit is exclusive
    if (doesSatisfy) console.log("passes");
    else console.log("fails");
  },
  "~": (declaredVersion, lockedVersion) => {},
  "": (declaredVersion, lockedVersion) => {},
};
