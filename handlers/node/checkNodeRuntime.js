export default function compareNodeVersions(
  requiredVersionString,
  installedVersionString,
) {
  const installedVersion = installedVersionString
    .trim()
    .split(".")
    .map((text) => Number(text));

  const regex = /^([^\d\s]+)?\s*(\d+(?:\.\d+){0,2})$/;
  const requiredVersionValues = requiredVersionString.trim().match(regex);

  if (!requiredVersionValues) {
    console.log(
      `Warning: Unable to evaluate the Node.js version requirement ${requiredVersionString} because its syntax is not supported.`,
    );
    return;
  }

  const requiredVersion = requiredVersionValues
    .at(-1)
    .trim()
    .split(".")
    .map((text) => Number(text));

  const versionLength = Math.min(
    requiredVersion.length,
    installedVersion.length,
  );

  let compareFlag = 0;
  for (let i = 0; i < versionLength; i++) {
    const installedVersionNumber = installedVersion[i];
    const requiredVersionNumber = requiredVersion[i];
    if (installedVersionNumber > requiredVersionNumber) {
      compareFlag = 1;
      break;
    }
    if (installedVersionNumber < requiredVersionNumber) {
      compareFlag = -1;
      break;
    }
  }

  const COMPARING_RULES = {
    ">=": (compareFlag, targetVersion) => {
      if (compareFlag === 1 || compareFlag === 0) {
        console.log("Node.js Runtime fulfills the required version.");
      } else {
        console.log(
          `WARNING! Installed Node.js runtime is older than what's required. Please update to ${targetVersion}.`,
        );
      }
    },
    "<=": (compareFlag, targetVersion) => {
      if (compareFlag === -1 || compareFlag === 0) {
        console.log("Node.js Runtime fulfills the required version.");
      } else {
        console.log(
          `WARNING! Installed Node.js runtime is newer than what's required. Please downgrade to ${targetVersion} or lower.`,
        );
      }
    },
    ">": (compareFlag, targetVersion) => {
      if (compareFlag === 1) {
        console.log("Node.js Runtime fulfills the required version.");
      } else {
        console.log(
          `WARNING! Installed Node.js runtime is older than or equal to what's required. Please update to a version newer than ${targetVersion}.`,
        );
      }
    },
    "<": (compareFlag, targetVersion) => {
      if (compareFlag === -1) {
        console.log("Node.js Runtime fulfills the required version.");
      } else {
        console.log(
          `WARNING! Installed Node.js runtime is newer than or equal to what's required. Please downgrade to a version lower than ${targetVersion}.`,
        );
      }
    },
    "=": (compareFlag, targetVersion) => {
      if (compareFlag === 0) {
        console.log("Node.js Runtime fulfills the required version.");
      } else {
        console.log(
          `WARNING! Installed Node.js runtime does not match the required version. Please use ${targetVersion}.`,
        );
      }
    },
    "": (compareFlag, targetVersion) => {
      //exact version like 18.0.0,
      if (compareFlag === 0) {
        console.log("Node.js Runtime fulfills the required version.");
      } else {
        console.log(
          `WARNING! Installed Node.js runtime does not match the required version. Please use ${targetVersion}.`,
        );
      }
    },
  };

  const operatorGroup = requiredVersionValues[1] ?? ""; // for exact version like 18.0.0
  if (COMPARING_RULES[operatorGroup]) {
    COMPARING_RULES[operatorGroup](compareFlag, requiredVersionValues[2]);
  } else {
    console.log(
      `Warning: Unable to evaluate the Node.js version requirement ${requiredVersionString} because its syntax is not supported. Automatic compatibility suggestions are unavailable. Please manually verify that the installed Node.js version ${installedVersionString} satisfies the requirement.`,
    );
  }
}
