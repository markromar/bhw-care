import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '../../..');
const workflow = readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

describe('CI workflow', () => {
  it('runs on pushes to main and on pull requests', () => {
    expect(workflow).toMatch(/^on:/m);
    expect(workflow).toMatch(/push:\s*\n\s+branches: \[main\]/);
    expect(workflow).toMatch(/pull_request:/);
  });

  it('runs every check the Day 1 gate requires', () => {
    const commands = [
      'npm ci',
      'npm run typecheck',
      'npm run lint',
      'npx prettier --check',
      'npm test',
    ];

    for (const command of commands) {
      expect(workflow).toContain(`run: ${command}`);
    }
    expect(workflow).toMatch(/node-version: 22/);
  });

  it('uses least-privilege permissions and no secrets', () => {
    expect(workflow).toMatch(/permissions:\s*\n\s+contents: read/);
    expect(workflow).not.toMatch(/secrets\./);
    expect(workflow).not.toMatch(/pull_request_target/);
  });

  it('only calls npm scripts that exist', () => {
    expect(packageJson.scripts.typecheck).toBeDefined();
    expect(packageJson.scripts.lint).toBeDefined();
    expect(packageJson.scripts.test).toBeDefined();
  });
});
