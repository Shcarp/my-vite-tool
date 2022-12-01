import { NextHandleFunction } from "connect";

import { ServerContext } from "../index";
import createDebug from "debug";
import {isJSRequest} from "../../utils";

const debug = createDebug("dev");

// 对请求依次调用 resolveId load transform方法
export async function transformRequest(
    url: string,
    serverContext: ServerContext
) {
    const { pluginContainer } = serverContext;
    // 调用resolveId
    const resolveResult = await pluginContainer.resolveId(url);
    let transformResult;
    if (resolveResult?.id) {
        // 调用 load
        let code = await pluginContainer.load(resolveResult.id);
        if (typeof code === 'object' && code !== null) {
            code = code.code;
        }
        if (code) {
            transformResult = await pluginContainer.transform(
                code as string,
                resolveResult?.id
            )
        }
    }
    return transformResult;
}

export function transformMiddleware(
    serverContext: ServerContext
): NextHandleFunction {
    return async (req, res, next) => {
        if (req.method !== "GET" && !req.url) {
            return next()
        }
        const url = req.url;
        debug("transformMiddleware: %s", url);
        if(isJSRequest(url)) {
            let result = await transformRequest(url, serverContext);
            if (!result) {
                return next();
            }
            if (result && typeof result !== "string") {
                result = result.code;
            }
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/javascript");
            return res.end(result);
        }
        next();
    }
}
