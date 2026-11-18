const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path'),
  Module = require('node:module'),
  ts = require('typescript');
const fixture = require('../docs/contracts/domain-values.v1.json');
const file = path.resolve(__dirname, '../src/app/shared/models/domain.enums.ts'),
  compiled = new Module(file, module);
compiled.filename = file;
compiled.paths = module.paths;
compiled._compile(
  ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  file,
);
test('frontend canonical enums preserve the versioned API wire values', () => {
  for (const [name, values] of Object.entries(fixture.enums))
    assert.deepEqual(
      Object.values(compiled.exports[name]).filter((v) => typeof v === typeof values[0]),
      values,
      name,
    );
});
test('Skill and Meeting response interfaces retain required contract fields', () => {
  const config = ts.readConfigFile(path.resolve(__dirname, '../tsconfig.json'), ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    path.resolve(__dirname, '..'),
  );
  const files = ['skills/skill.models.ts', 'supervisor-meetings/meeting.models.ts'].map((f) =>
    path.resolve(__dirname, '../src/app/features/' + f),
  );
  const program = ts.createProgram(files, { ...parsed.options, noEmit: true }),
    checker = program.getTypeChecker(),
    types = new Map();
  for (const file of files) {
    const source = program.getSourceFile(file);
    for (const symbol of checker.getExportsOfModule(checker.getSymbolAtLocation(source)))
      types.set(symbol.name, checker.getDeclaredTypeOfSymbol(symbol));
  }
  for (const [name, fields] of Object.entries(fixture.responses)) {
    const type = types.get(name);
    assert.ok(type, name);
    const properties = checker.getPropertiesOfType(type).map((p) => p.name);
    for (const field of fields) assert.ok(properties.includes(field), name + '.' + field);
  }
  const history = checker.getPropertiesOfType(types.get('ProficiencyChange'));
  assert.ok(!history.some((p) => ['at', 'timestamp'].includes(p.name)));
  assert.ok(!(history.find((p) => p.name === 'changedAt').flags & ts.SymbolFlags.Optional));
});
