import path from 'path';
import resolve from "resolve";
import fs from 'fs-extra';
import createDebug from "debug";
import { Loader, Plugin } from 'esbuild';
// 用来分析 es 模块 import/export 语句的库
import { init, parse, ExportSpecifier } from 'es-module-lexer'
import  { BARE_IMPORT_RE } from '../constants';
import { normalizePath } from '../utils'

const debug = createDebug('dev')

export function preBundlePlugin(deps: Set<string>): Plugin {
    return {
        name: "esbuild:pre-bundle",
        setup(build) {
            build.onResolve(
                {
                    filter: BARE_IMPORT_RE
                },
                (resolveInfo) => {
                    const { path: id, importer } = resolveInfo
                    const isEntry = !importer
                    if (deps.has((id))) {
                        return isEntry
                            ? {
                                path: id,
                                namespace: "dep"
                            }
                            : {
                                path: resolve.sync(id, {basedir: process.cwd()})
                            }
                    }
                }
            ),
            build.onLoad(
                {
                    filter: /.*/,
                    namespace: "dep",
                },
                async (loadInfo) => {
                    await init;
                    const id = loadInfo.path;
                    const root = process.cwd();
                    const entryPath = normalizePath(resolve.sync(id, {basedir: root}));
                    const code = await fs.readFile(entryPath, "utf8");
                    const [ imports, exports ] = await parse(code);
                    let proxyModule = [];
                    if (!imports.length && !exports.length) {
                        // 拿到导出对象
                        const res = require(entryPath);
                        // 拿到所有具名导出
                        const specifiers = Object.keys(res);
                        // 构造export 语句
                        proxyModule.push(
                            `export { ${specifiers.join(",")} } from "${entryPath}"`,
                            `export default require("${entryPath}")`
                        )
                    }else {
                        if (exports.includes("default" as unknown as ExportSpecifier)) {
                            proxyModule.push(`import d from "${entryPath}";export default d`);
                        }
                        proxyModule.push(`export * from "${entryPath}"`);
                    }
                    debug("代理模块内容: %o", proxyModule.join("\n"));
                    const loader = path.extname(entryPath).slice(1);
                    return {
                        loader: loader as Loader,
                        contents: proxyModule.join("\n"),
                        resolveDir: root,
                    }
                }
            )
        }
    }
}

