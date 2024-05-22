#!/bin/bash
rm build.cjs
rm build-linux
rm build-macos
rm build-win.exe

npx esbuild index.js  --bundle --outfile=build.cjs --format=cjs --platform=node
npx pkg build.cjs