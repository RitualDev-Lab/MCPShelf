import { run } from 'node:test';
import { spec } from 'node:test/reporters';
import * as fs from 'node:fs';
import * as path from 'node:path';

const testDir = path.resolve(process.cwd(), 'tests');
const testFiles = fs.readdirSync(testDir)
  .filter((f: string) => f.endsWith('.test.ts'))
  .map((f: string) => path.join(testDir, f));

console.log(`🚀 [Test Suite] Running ${testFiles.length} test suites across MCPShelf...`);

run({ files: testFiles })
  .on('test:fail', () => {
    process.exitCode = 1;
  })
  .compose(new spec())
  .pipe(process.stdout);
