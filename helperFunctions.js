function resolveProjectFilePath(fileName) {
  return process.cwd().concat(`/${fileName}`);
}

export { resolveProjectFilePath };
