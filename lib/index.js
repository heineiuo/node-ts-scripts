"use strict";

var argv = require("yargs").argv;
var shelljs = require("shelljs");
var findUp = require("find-up");
var path = require("path");
var fs = require("fs");

async function main() {
  if (argv._.length === 0) {
    console.log("node-ts-scripts command: dev, build, eject");
    return;
  }

  if (argv._[0] === "eject") {
    const nodeModule = await findUp("node_modules", { type: "directory" });
    const dir = path.dirname(nodeModule);
    shelljs.cp(
      path.resolve(__dirname, "../rollup.config.js"),
      path.resolve(dir, "./rollup.config.js")
    );
    return;
  }
  if (argv._[0] === "dev") {
    const nodeModule = await findUp("node_modules", { type: "directory" });
    const dir = path.dirname(nodeModule);
    shelljs.cd(dir);
    shelljs.exec(
      `NODE_ENV=development nodemon --watch package.json --watch src --watch .env* --exec 'babel src -d build/debug && node -r dotenv/config build/debug'`
    );
    return;
  }

  if (argv._[0] === "build") {
    const nodeModule = await findUp("node_modules", { type: "directory" });
    const dir = path.dirname(nodeModule);
    shelljs.cd(dir);
    shelljs.exec(
      `NODE_ENV=production rollup -c rollup.config.js --environment INCLUDE_DEPS,BUILD:production`
    );
    return;
  }
}

main();
