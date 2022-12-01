// 新建 src/node/plugins/importAnalysis.ts
import { init, parse } from "es-module-lexer";
import {
    BARE_IMPORT_RE,
    DEFAULT_EXTERSIONS,
    PRE_BUNDLE_DIR,
} from "../constants";
import {
    cleanUrl,
    isJSRequest,
    normalizePath
} from "../utils";
// magic-string 用来作字符串编辑
import MagicString from "magic-string";
import path from "path";
import { Plugin } from "../plugin";
import { ServerContext } from "../server/index";
import { pathExists } from "fs-extra";
import resolve from "resolve";


export function importAnalysisPlugin(): Plugin {
    let serverContext: ServerContext;
    return {
        name: "m-vite:import-analysis",
        configureServer(s) {
            serverContext = s;
        },
        async transform(code: string, id: string) {
            if (!isJSRequest(id)) {
                return null;
            }
            await init;

            const [imports] = parse(code);
            const ms = new MagicString(code);
            for (const importInfo of imports) {
                const { s: modStart, e: modEnd, n: modSource } = importInfo;
                if (!modSource) continue;
                // 第3方库 重写到预构建产物
                if (BARE_IMPORT_RE.test(modSource)) {
                    const bundlePath = normalizePath(
                        path.join('/', PRE_BUNDLE_DIR, `${modSource}.js`)
                    );
                    ms.overwrite(modStart, modEnd, bundlePath)
                }else if(modSource.startsWith(".") || modSource.startsWith("/")) {
                    // 调用上下文的resolve
                    const resolved = await this.resolve(modSource, id);
                    if (resolved) {
                        ms.overwrite(modStart, modEnd, resolved.id);
                    }
                }
            }
            return {
                code: ms.toString(),
                map: ms.generateMap()
            }
        }
    }
}
