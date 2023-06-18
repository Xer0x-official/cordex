"use strict";

import clear from 'rollup-plugin-clear';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
// import typescript from '@rollup/plugin-typescript';
import screeps from 'rollup-plugin-screeps';
import glob from 'glob';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type } from 'node:os';

let cfg;
const dest = process.env.DEST;
/* if (!dest) {
	console.log("No destination specified - code will be compiled but not uploaded");
} else if ((cfg = require("./screeps.json")[dest]) == null) {
	throw new Error("Invalid upload destination");
} */

if (!dest) {
    console.log('\x1b[46m%s\x1b[0m \x1b[36m%s\x1b[0m', 'Compiling Cordex...', '(deploy destination: none)');
} else if ((cfg = require("./screeps")[dest]) == null) {
    throw new Error("Invalid upload destination");
} else {
    console.log('\x1b[46m%s\x1b[0m \x1b[36m%s\x1b[0m', 'Compiling Cordex...', `(deploy destination: ${dest})`);
}


const ignoreWarnings = ['commonjs-proxy',
    'Circular dependency',
    "The 'this' keyword is equivalent to 'undefined'",
    "Use of eval is strongly discouraged"];

export default {
	input: ["src/main.ts"],
	// input: Object.fromEntries(
		// glob.sync('src/**/*.ts').map(file => [
			// This remove `src/` as well as the file extension from each
			// file, so e.g. src/nested/foo.js becomes nested/foo
			// file.slice(0, file.length - path.extname(file).length),
			/* path.relative(
				file.slice(0, file.length - path.extname(file).length)
			), */
			// This expands the relative paths to absolute paths, so e.g.
			// src/nested/foo becomes /project/src/nested/foo.js
			// fileURLToPath(new URL(file, import.meta.url))
		// ])
	// ),
	output: {
		file: "dist/main.js",
		format: "cjs",
		sourcemap: true,
		banner: '',
	},
	treeshake: false,

	onwarn: function (warning) {
        // Skip default export warnings from using obfuscated overmind file in main
        for (let ignoreWarning of ignoreWarnings) {
            if (warning.toString().includes(ignoreWarning)) {
                return;
            }
        }
        // console.warn everything else
        console.warn(warning.message);
    },

	plugins: [
		clear({ targets: ["dist"] }),
		resolve(),//{ rootDir: "src" }),
		commonjs(),
		typescript({
			tsconfig: "./tsconfig.json",
			include: ['src/**/*.ts'],
		}),
		screeps({ config: cfg, dryRun: cfg == null })
	]
}
