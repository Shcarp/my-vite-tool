import { readFile } from "fs-extra";
import { Plugin } from "../plugin";
import { isJSRequest } from "../utils";
import esbuild from "esbuild";
import path from "path";

export function esbuildTransformPlugin(): Plugin {
    return {
        name: "m-vite:esbuild-transform",
        async load(id) {
            if (isJSRequest(id)) {
                try {
                    return await readFile(id, 'utf8');
                }catch (e) {
                    return null;
                }
            }
        },
        async transform(code, id) {
            if (isJSRequest(id)) {
                const extname = path.extname(id).slice(1);
                const { code: transformedCode, map } = await esbuild.transform(code, {
                    target: "esnext",
                    format: "esm",
                    sourcemap: true,
                    loader: extname as "js" | "ts" | "jsx" | "tsx",
                });
                return {
                    code: transformedCode,
                    map,
                };
            }
            return  null;
        }
    }
}
