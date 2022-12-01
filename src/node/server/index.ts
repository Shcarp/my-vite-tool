import connect from 'connect';
// 命令行颜色工具
import { blue, green } from "picocolors";
import { optimizer } from "../optimizer";
import { Plugin } from "../plugin";
import { resolvePlugins } from "../plugins"
import { createPluginContainer, PluginContainer } from "../pluginContainer";
import { indexHtmlMiddleware } from "./middlewares/indexHtml";
import {transformMiddleware} from "./middlewares/transform";

export interface ServerContext {
    root: string,
    pluginContainer: PluginContainer;
    app: connect.Server;
    plugins: Plugin[];
}

export async function startDevServer() {
    const app = connect();
    const root = process.cwd();
    const startTime = Date.now();
    const plugins = resolvePlugins();
    const pluginContainer = createPluginContainer(plugins);

    const serverContext: ServerContext = {
        root: process.cwd(),
        pluginContainer,
        app,
        plugins,
    }

    for (const plugin of plugins) {
        if (plugin.configureServer) {
            await plugin.configureServer(serverContext);
        }
    }

    app.use(transformMiddleware(serverContext))

    // 处理入口 HTML 资源
    app.use(indexHtmlMiddleware(serverContext));

    app.listen(3000, async () => {
        await optimizer(root)
        console.log(
                green("🚀 No-Bundle 服务已经成功启动!"),
                `耗时: ${Date.now() - startTime}ms`
        )
        console.log(`> 本地访问路径: ${blue("http://localhost:3000")}`);
    })
}