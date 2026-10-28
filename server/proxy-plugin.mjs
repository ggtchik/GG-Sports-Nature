import { handleProxyRequest } from './proxy.mjs';

/** Middleware Vite : expose `/__proxy?url=…` pendant `npm run dev`. */
export function proxyPlugin() {
  return {
    name: 'gg-sports-nature-proxy',
    configureServer(server) {
      server.middlewares.use('/__proxy', (req, res) => {
        handleProxyRequest(req, res);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use('/__proxy', (req, res) => {
        handleProxyRequest(req, res);
      });
    },
  };
}
