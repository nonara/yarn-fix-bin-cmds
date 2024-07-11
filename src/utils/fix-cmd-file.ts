import fs from "fs";
import path from "path";


/* ****************************************************************************************************************** */
// region: Config
/* ****************************************************************************************************************** */

export const getContent = (nodePath1: string, filePath1: string, nodePath2: string, filePath2: string) => `
@echo off
SETLOCAL
FOR /F "delims=" %%I IN ('powershell -Command "(Get-Item -Path '%~dp0').Target"') DO SET "RealPath=%%I"
IF "%RealPath%"=="" SET "RealPath=%~dp0"

@IF EXIST "${nodePath1}" (
  "%RealPath%\\${nodePath1}"  "%RealPath%\\${filePath1}" %*
) ELSE (
  ${nodePath2}  "%RealPath%\\${filePath2}" %*
)
ENDLOCAL
`;

// endregion


/* ****************************************************************************************************************** */
// region: Utils
/* ****************************************************************************************************************** */

export function fixCmdFile(filePath: string, isVerbose?: boolean): void {
  if (isVerbose) console.log(`Processing file: ${filePath}`);

  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

  /* Find paths */
  const content = fs.readFileSync(filePath, 'utf-8');

  const alreadyFixed = content.includes('powershell -Command "(Get-Item');
  if (alreadyFixed) {
    if (isVerbose) console.log(`File already fixed: ${filePath}`);
    return;
  }

  const regexOne = /^\s*"%~dp0\\(node\S*)"\s+"%~dp0\\(.+?)"/gm;
  const regexTwo = /^\s*(node\S*)\s+"%~dp0\\(.+?)"/gm;

  const { 1: matchOneNode, 2: matchOnePath } = regexOne.exec(content) ?? [];
  const { 1: matchTwoNode, 2: matchTwoPath } = regexTwo.exec(content) ?? [];

  if (!matchOneNode || !matchOnePath || !matchTwoNode || !matchTwoPath) {
    throw new Error(`No valid command found in ${filePath}. Please open an issue with your yarn version number.`);
  }

  const newContent = getContent(matchOneNode, matchOnePath, matchTwoNode, matchTwoPath);

  fs.writeFileSync(filePath, newContent);
}

export function fixCmdFilesInBin(binDir: string, isVerbose?: boolean): void {
  const files = fs.readdirSync(binDir);
  files.forEach(file => {
    if (file.endsWith('.cmd')) {
      fixCmdFile(path.join(binDir, file), isVerbose);
    }
  });
}

// endregion
