import { spawnSync } from 'child_process';
import path from "path";
import { createProject, teardownProject } from "../src/create-project";
import * as os from "node:os";


/* ****************************************************************************************************************** */
// region: Config
/* ****************************************************************************************************************** */

const cmdNames = [ 'cmd1', 'cmd2', 'cmd3' ];

// endregion


/* ****************************************************************************************************************** */
// region: Helpers
/* ****************************************************************************************************************** */

function runCmd(argStr: string, cwd: string, pathExtra?: string) {
  const args = argStr.split(' ');
  const cmd = args.shift()!;

  const result = spawnSync(cmd, args, {
    env: {
      ...process.env,
      PATH: pathExtra ? `${pathExtra};${process.env.PATH}` : process.env.PATH
    },
    cwd,
    encoding: 'utf-8',
    stdio: 'pipe',
    shell: true
  });

  return {
    hasErrors: !!result.error || result.status !== 0, // true if the exit code was not 0
    stdOut: result.stdout,
    stdErr: result.stderr,
    error: result.error
  };
}

// endregion


/* ****************************************************************************************************************** */
// region: Tests
/* ****************************************************************************************************************** */

describe('CLI Tests', () => {
  describe(`Processes for PATH environment variable`, () => {
    let projectPath: string;
    let initialCmdResults: { cmdName: string, stdOut: string, stdErr: string, hasErrors: boolean, error: Error | undefined }[] = [];
    let fixedCmdResults: { cmdName: string, stdOut: string, stdErr: string, hasErrors: boolean, error: Error | undefined }[] = [];
    beforeAll(() => {
      projectPath = path.resolve(os.tmpdir(), `yarn-fix-bin-cmds-test-path`);
      createProject(cmdNames, [ projectPath ]);

      /* Get initial results */
      for (const cmdName of cmdNames) {
        const cmdRes = runCmd(
          `${cmdName}.cmd`,
          path.join(projectPath, 'node_modules/@org/pkg/node_modules/.bin')
        );
        initialCmdResults.push({ ...cmdRes, cmdName });
      }

      /* Fix cmd files */
      const fixRes = runCmd(
        'node dist/main.js --verbose',
        path.join(projectPath, 'node_modules/yarn-fix-bin-cmds'),
        path.join(projectPath, 'node_modules/@org/pkg/node_modules/.bin')
      );
      expect(fixRes.hasErrors).toBe(false);

      /* Get fixed results */
      for (const cmdName of cmdNames) {
        const cmdRes = runCmd(
          `${cmdName}.cmd`,
          path.join(projectPath, 'node_modules/@org/pkg/node_modules/.bin')
        );
        fixedCmdResults.push({ ...cmdRes, cmdName });
      }
    });

    afterAll(() => {
      teardownProject([ projectPath ]);
    });

    test(`Original cmd files fail`, () => {
      for (const res of initialCmdResults) {
        expect(res.hasErrors).toBe(true);
        expect(res.error).toBeUndefined();
        expect(res.stdErr).toMatch(/Cannot find module \S+[\\/]node_modules[\\/]node_modules/gm);
      }
    });

    test(`All cmd files execute correctly`, () => {
      for (const res of fixedCmdResults) {
        expect(res.hasErrors).toBe(false);
        expect(res.stdOut).toBe('ok\n');
        expect(res.stdErr).not.toMatch(/Cannot find module \S+[\\/]node_modules[\\/]node_modules/gm);
      }
    });
  });

  describe(`Processes all manually specified cmd files (via --file)`, () => {
    const fixCmds = cmdNames.slice(0, 2);
    const nofixCmds = cmdNames.slice(2);
    let projectPath: string;
    let initialCmdResults: { cmdName: string, stdOut: string, stdErr: string, hasErrors: boolean, error: Error | undefined }[] = [];
    let fixedCmdResults: { cmdName: string, stdOut: string, stdErr: string, hasErrors: boolean, error: Error | undefined }[] = [];
    beforeAll(() => {
      projectPath = path.resolve(os.tmpdir(), `yarn-fix-bin-cmds-file`);
      createProject(cmdNames, [ projectPath ]);

      /* Get initial results */
      for (const cmdName of cmdNames) {
        const cmdRes = runCmd(
          `${cmdName}.cmd`,
          path.join(projectPath, 'node_modules/@org/pkg/node_modules/.bin')
        );
        initialCmdResults.push({ ...cmdRes, cmdName });
      }

      /* Fix cmd files */
      const fixRes = runCmd(
        `node ../../../../node_modules/yarn-fix-bin-cmds/dist/main.js --verbose ${fixCmds.map(p => `--file ${p}.cmd`).join(' ')}`,
        path.join(projectPath, 'repositories/pkg/node_modules/.bin')
      );
      expect(fixRes.hasErrors).toBe(false);

      /* Get fixed results */
      for (const cmdName of cmdNames) {
        const cmdRes = runCmd(
          `${cmdName}.cmd`,
          path.join(projectPath, 'node_modules/@org/pkg/node_modules/.bin')
        );
        fixedCmdResults.push({ ...cmdRes, cmdName });
      }
    });

    afterAll(() => {
      teardownProject([ projectPath ]);
    });

    test(`Original cmd files fail`, () => {
      for (const res of initialCmdResults) {
        expect(res.hasErrors).toBe(true);
        expect(res.error).toBeUndefined();
        expect(res.stdErr).toMatch(/Cannot find module \S+[\\/]node_modules[\\/]node_modules/gm);
      }
    });

    test(`All cmd files execute correctly`, () => {
      for (let i = 0; i < fixCmds.length; i++) {
        const res = fixedCmdResults[i];
        expect(res.hasErrors).toBe(false);
        expect(res.stdOut).toBe('ok\n');
        expect(res.stdErr).not.toMatch(/Cannot find module \S+[\\/]node_modules[\\/]node_modules/gm);
      }

      for (let i = fixCmds.length; i < cmdNames.length; i++) {
        const res = fixedCmdResults[i];
        expect(res.hasErrors).toBe(true);
        expect(res.error).toBeUndefined();
        expect(res.stdErr).toMatch(/Cannot find module \S+[\\/]node_modules[\\/]node_modules/gm);
      }
    });
  });

  describe(`Processes all manually specified bin paths (via --path)`, () => {
    const projectPaths = Array.from({ length: 3 }, (_, i) => path.resolve(os.tmpdir(), `yarn-fix-bin-cmds-path-${i}`));
    let initialCmdResults: { cmdName: string, stdOut: string, stdErr: string, hasErrors: boolean, error: Error | undefined }[] = [];
    let fixedCmdResults: { cmdName: string, stdOut: string, stdErr: string, hasErrors: boolean, error: Error | undefined }[] = [];
    beforeAll(() => {
      createProject(cmdNames, projectPaths);

      /* Get initial results */
      for (const projectPath of projectPaths) {
        for (const cmdName of cmdNames) {
          const cmdRes = runCmd(
            `${cmdName}.cmd`,
            path.join(projectPath, 'node_modules/@org/pkg/node_modules/.bin')
          );
          initialCmdResults.push({ ...cmdRes, cmdName });
        }
      }

      /* Fix cmd files */
      const fixRes = runCmd(
        `node ../../../../node_modules/yarn-fix-bin-cmds/dist/main.js --verbose ${
          projectPaths.map(p => `--path ${path.join(p, `/repositories/pkg/node_modules/.bin`)}`).join(' ')
        }`,
        path.join(projectPaths[0], 'repositories/pkg/node_modules/.bin')
      );
      expect(fixRes.hasErrors).toBe(false);

      /* Get fixed results */
      for (const projectPath of projectPaths) {
        for (const cmdName of cmdNames) {
          const cmdRes = runCmd(
            `${cmdName}.cmd`,
            path.join(projectPath, 'node_modules/@org/pkg/node_modules/.bin')
          );
          fixedCmdResults.push({ ...cmdRes, cmdName });
        }
      }
    });

    afterAll(() => {
      teardownProject(projectPaths);
    });

    test(`Original cmd files fail`, () => {
      for (const res of initialCmdResults) {
        expect(res.hasErrors).toBe(true);
        expect(res.error).toBeUndefined();
        expect(res.stdErr).toMatch(/Cannot find module \S+[\\/]node_modules[\\/]node_modules/gm);
      }
    });

    test(`All cmd files execute correctly`, () => {
      for (const res of fixedCmdResults) {
        expect(res.hasErrors).toBe(false);
        expect(res.stdOut).toBe('ok\n');
        expect(res.stdErr).not.toMatch(/Cannot find module \S+[\\/]node_modules[\\/]node_modules/gm);
      }
    });
  });
});

// endregion
