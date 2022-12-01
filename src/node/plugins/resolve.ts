import resolve from "resolve";
import { Plugin } from "../plugin";
import { ServerContext } from "../server/index";
import path from "path";
import { pathExists } from "fs-extra";
import { DEFAULT_EXTERSIONS } from "../constants";
import { cleanUrl, normalizePath } from "../utils";

export function resolvePlugin(): Plugin {
    let serverContext: ServerContext;
    return {
        name: "m-vite:resolve",
        configureServer(s) {
            serverContext = s;
        },
        async resolveId(id: string, importer?: string) {
            // 绝对路径
            if (path.isAbsolute(id)) {
                if (await pathExists(id)) {
                    return { id };
                }
                id = path.join(serverContext.root, id);
                if (await pathExists(id)) {
                    return { id };
                }
            }
            // 相对路径
            else if (id.startsWith(".")) {
                if (!importer) {
                    throw new Error("`importer` should not be undefined");
                }
                const hasExtension = path.extname(id).length > 1;
                let resolvedId: string;
                // 有扩展
                if (hasExtension) {
                    resolvedId = normalizePath(resolve.sync(id, {basedir: path.dirname(importer)}));
                    if (await pathExists(resolvedId)) {
                        return {id}
                    }
                }
                // 无扩展
                else {
                    // 加上扩展 一个一个尝试
                    for (const extname of DEFAULT_EXTERSIONS) {
                        try {
                            const withExtension = `${id}${extname}`;
                            resolvedId = normalizePath(resolve.sync(withExtension, {
                                basedir: path.dirname(importer),
                            }));
//                            console.log(withExtension, "kdasdasdaskj")
                            if (await pathExists(resolvedId)) {
                                return { id: withExtension };
                            }
                        }catch (e) {
                            continue;
                        }
                    }
                }
            }
            return null;
        }
    }
}