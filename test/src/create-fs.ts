import path from 'path';
import * as fs from "fs";


/* ****************************************************************************************************************** */
// region: Config
/* ****************************************************************************************************************** */

const createCmdFileContent = (path1: string, path2: string) => `
@IF EXIST "%~dp0\\node.exe" (
  "%~dp0\\node.exe"  "%~dp0\\${path1}" %*
) ELSE (
  @SETLOCAL
  @SET PATHEXT=%PATHEXT:;.JS;=;%
  node  "%~dp0\\${path2}" %*
)
`

const distPath = path.resolve(__dirname, '../../dist');

// endregion


/* ****************************************************************************************************************** */
// region: Utils
/* ****************************************************************************************************************** */

export function createProject(cmdNames: string[], rootPaths: string[]) {
  rootPaths.forEach(rootPath => {
    /* Create blank rootPath */
    if (fs.existsSync(rootPath)) fs.rmdirSync(rootPath, { recursive: true });
    fs.mkdirSync(rootPath, { recursive: true });

    /* Setup workspace root */
    fs.writeFileSync(path.join(rootPath, 'package.json'), JSON.stringify({
      name: "root",
      private: true,
      workspaces: {
        packages: [ "repositories/*" ],
        nohoist: [ "yarn-fix-bin-cmds" ]
      },
      devDependencies: {
        "yarn-fix-bin-cmds": "*"
      }
    }, null, 2));

    /* Create yarn-fix-bin-cmds dependency */
    const fixBinCmdsPath = path.join(rootPath, 'node_modules/yarn-fix-bin-cmds');
    fs.mkdirSync(fixBinCmdsPath, { recursive: true });
    fs.cpSync(distPath, path.join(fixBinCmdsPath, 'dist'), { recursive: true });
    fs.copyFileSync(
      path.resolve(distPath, '../package.json'),
      path.join(fixBinCmdsPath, 'package.json')
    );

    fs.cpSync(path.resolve(distPath, '../node_modules'), path.join(fixBinCmdsPath, 'node_modules'), { recursive: true });

    /* Create pkg repository */
    const pkgPath = path.join(rootPath, 'repositories/pkg');
    fs.mkdirSync(pkgPath, { recursive: true });
    fs.writeFileSync(path.join(pkgPath, 'package.json'), JSON.stringify({
      name: "@org/pkg",
      version: "1.0.0",
      scripts: {
        "fix": "yarn-fix-bin-cmds",
        ...(cmdNames.reduce((acc, cmdName) => {
          acc[`exec-${cmdName}`] = `${cmdName}`;
          return acc;
        }, <Record<string, string>>{}))
      },
      devDependencies: {
        "yarn-fix-bin-cmds": "*",
        "cmd-pkg": "*"
      }
    }, null, 2));

    /* Create yarn-fix-bin-cmds bin script */
    const pkgBinPath = path.join(pkgPath, 'node_modules/.bin');
    fs.mkdirSync(pkgBinPath, { recursive: true });

    const fixBinCmdsScriptPath = path.join(pkgBinPath, 'yarn-fix-bin-cmds.cmd');
    const cmdFileContent = createCmdFileContent(
      '..\\..\\..\\..\\node_modules\\yarn-fix-bin-cmds\\dist\\main.js',
      '..\\..\\..\\..\\node_modules\\yarn-fix-bin-cmds\\dist\\main.js'
    );
    fs.writeFileSync(fixBinCmdsScriptPath, cmdFileContent);

    /* Create Command files */
    cmdNames.forEach(cmdName => {
      const binPath = path.join(pkgPath, 'node_modules/.bin');
      fs.mkdirSync(binPath, { recursive: true });

      const cmdScriptPath = path.join(binPath, `${cmdName}.cmd`);

      const cmdContent = createCmdFileContent(
        `..\\..\\..\\..\\node_modules\\cmd-pkg\\${cmdName}.js`,
        `..\\..\\..\\..\\node_modules\\cmd-pkg\\${cmdName}.js`
      );
      fs.writeFileSync(cmdScriptPath, cmdContent);
    });

    /* Create cmd repository */
    const cmdPath = path.join(rootPath, 'node_modules/cmd-pkg');
    fs.mkdirSync(cmdPath, { recursive: true });
    fs.writeFileSync(path.join(cmdPath, 'package.json'), JSON.stringify({
      name: "cmd-pkg",
      version: "1.0.0",
      "bin": {
        ...(cmdNames.reduce((acc, cmdName) => {
          acc[cmdName] = `node ${cmdName}.js`;
          return acc;
        }, <Record<string, string>>{}))
      }
    }, null, 2));

    /* Create command .js files */
    cmdNames.forEach(cmdName => {
      const jsFilePath = path.join(cmdPath, `${cmdName}.js`);
      fs.writeFileSync(jsFilePath, "console.log('ok');");
    });

    /* Create workspaces links */
    fs.mkdirSync(path.join(rootPath, 'node_modules/@org'), { recursive: true });
    fs.symlinkSync(pkgPath, path.join(rootPath, 'node_modules/@org/pkg'), 'junction');
  });
}

export function teardownProject(rootPaths: string[]) {
  rootPaths.forEach(rootPath => {
    if (fs.existsSync(rootPath)) fs.rmdirSync(rootPath, { recursive: true });
  });
}

// endregion
