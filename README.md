# yarn-fix-bin-cmds

Yarn currently has an issue \([#4564](https://github.com/yarnpkg/yarn/issues/4564)\) which can cause commands to fail
during lifecycle scripts or in other operations when working with a workspace on Windows.

This occurs because symlinked dependency directories created for workspaces are not resolved to the realpath in the 
output `node_modules/.bin/*.cmd` files.

Consequently, in some cases, the relative paths will fail, because it tries to resolve from the symlinked directory 
(eg. `root/node_modules/@my-scope/my-pkg/node_modules/.bin`) as opposed to the real path (eg. `root/workspaces/my-pkg/node_modules/.bin`).

## Scope

This appears to impact both Yarn 1 and Yarn 2+, however, this package was created for Yarn 1. We'd be happy to add Yarn 2+
support if a PR is submitted, or potentially a little later if you file an issue with a reproduction.

Additionally, if another version of yarn isn't working with this, please file an issue with the version.

## Issue Detail

A [preliminary PR](https://github.com/yarnpkg/yarn/pull/9078) has been submitted to Yarn 1, but it seems likely that it 
won't be addressed for some time. This package is a workaround for the issue until it is resolved.

## Usage

### Method 1 

You can generally use this package as a in a lifecycle script (eg `preinstall`, `postinstall`, `prepare`, etc,) in the 
`package.json` for the workspaces which need it.

eg.
```json
{
  "scripts": {
    "postinstall": "npx -y yarn-fix-bin-cmds"
  }
}
```

If you have any issues, you can also add a nohoist entry for this package in your root `package.json`:

eg.
```json
{
  "workspaces": {
    "nohoist": [
      "**/yarn-fix-bin-cmds"
    ]
  }
}
```

### Other Methods

You can also use the command-line options to specify specific `.bin` directories or command files to fix

To see all options, run 

```bash
npx -y yarn-fix-bin-cmds --help
```
