const { engines } = require('../package.json');
function assertRuntime(version = process.versions.node) {
  const minimum = engines.node
      .match(/\^(\d+)\.(\d+)\.(\d+)/)
      .slice(1)
      .map(Number),
    actual = version.split('.').map(Number);
  if (
    actual[0] !== minimum[0] ||
    actual[1] < minimum[1] ||
    (actual[1] === minimum[1] && actual[2] < minimum[2])
  )
    throw new Error(
      `Unsupported Node ${version}; use ${engines.node} (see .nvmrc). Docker supplies Node 24.`,
    );
}
module.exports = { assertRuntime };
