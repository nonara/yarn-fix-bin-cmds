#!/usr/bin/env node

import os from 'os';
import fs from 'fs';
import path from 'path';
import { program } from "commander";
import { fixCmdFile, fixCmdFilesInBin } from "./utils/fix-cmd-file";


/* ****************************************************************************************************************** */
// region: Types
/* ****************************************************************************************************************** */

export interface Options {
  path?: string[];
  verbose?: boolean;
  file?: string[];
}

// endregion


/* ****************************************************************************************************************** */
// region: Helpers
/* ****************************************************************************************************************** */

function findFirstJunction(paths: string[], isVerbose?: boolean): string | undefined {
  for (const fullPath of paths) {
    const pathTail = /^.+(node_modules[\\/].+)/.exec(fullPath)?.[1];
    if (!pathTail) continue;

    const p = fullPath.slice(0, fullPath.indexOf(pathTail));

    try {
      const stats = fs.lstatSync(p);
      if (stats.isSymbolicLink()) {
        const realPath = fs.realpathSync(p);
        if (isVerbose) console.log(`Found junction at: ${p}, real path: ${realPath}`);
        return path.join(realPath, pathTail);
      }
    } catch (error) {
      console.error(`Error checking path ${p}: ${error}`);
    }
  }

  return undefined;
}

// endregion


/* ****************************************************************************************************************** */
// region: Utils
/* ****************************************************************************************************************** */

export function run(opt: Options) {
  let binPaths: string[];

  if (opt.file) {
    opt.file.forEach(file => {
      const fullPath = path.resolve(process.cwd(), file);
      fixCmdFile(fullPath, opt.verbose);
    });
  } else {
    if (opt.path) {
      binPaths = opt.path;

      if (opt.verbose) console.log('binPaths:', binPaths);

      binPaths.forEach(p => {
        fixCmdFilesInBin(p, opt.verbose);
      });
    } else {
      if (!process.env.PATH) throw new Error('No PATH environment variable found.');
      binPaths = process.env.PATH?.split(path.delimiter).filter(p => p.includes('\\node_modules\\.bin'));

      if (opt.verbose) console.log('binPaths:', binPaths);

      const junctionPath = findFirstJunction(binPaths, opt.verbose);
      if (!junctionPath) {
        if (opt.verbose) console.log('No junction found in PATH');
        return;
      }

      fixCmdFilesInBin(junctionPath, opt.verbose);
    }
  }
}

// endregion


/* ****************************************************************************************************************** */
// Entry
/* ****************************************************************************************************************** */

// Run if called directly
if (require.main == module) {
  program
    .name('yarn-fix-bin-cmds')
    .version(require('../package.json').version)
    .description('Fixes the bin .cmd files for windows systems to work when executed from symlink dir (see yarn issue: #4564)');

  program
    .option('--path <paths...>', 'Specify bin paths directly instead of searching in PATH')
    .option('--verbose', 'Enable verbose output for debugging')
    .option('--file <files...>', 'Specific .cmd files to process');

  program.parse(process.argv);
  const options = program.opts() as Options;

  if (options.verbose) console.log('Options:', options);

  if (os.platform() !== 'win32') {
    if (options.verbose) console.log('Skipping yarn-fix-bin-cmds, as the OS is not Windows.');
    process.exit(1);
  }

  run(options);
}
