import { createServer } from 'node:http';
import { httpServerHandler } from 'cloudflare:node';
import tls from 'node:tls';
import app from './server.js';
import { corsHeaders, checkAuth, handleUpload, handleDelete } from './cloudinary.js';
import { setConfig as setTiDBConfig } from './config/tidbDataService.js';
import { setDemandDatabase } from './config/d1DemandStore.js';

// workerd (nodejs_compat) chưa hỗ trợ một số option của tls.connect
// (checkServerIdentity, rejectUnauthorized=false...). mysql2 luôn truyền
// chúng khi bật SSL — loại bỏ trước khi gọi hàm gốc.
const originalTlsConnect = tls.connect.bind(tls);
tls.connect = (options, callback) => {
  if (options && typeof options === 'object') {
    const { rejectUnauthorized, requestCert, checkServerIdentity, servername, ...rest } = options;
    return originalTlsConnect(rest, callback);
  }
  return originalTlsConnect(options, callback);
};

// Express chạy nguyên bản trên Cloudflare Workers (nodejs_compat).
// Mọi route truyền qua Express, trừ upload ảnh (Cloudinary).
const server = createServer(app);
const expressHandler = httpServerHandler(server);

export default {
  async fetch(request, env, ctx) {
    setTiDBConfig(env);
    setDemandDatabase(env);
    const url = new URL(request.url);
    const isOptions = request.method === 'OPTIONS';
    const isUpload = request.method === 'POST' && url.pathname === '/api/upload';
    const isDelete = request.method === 'DELETE' && url.pathname.startsWith('/api/upload/');

    if (isOptions || isUpload || isDelete) {
      if (isOptions) {
        return new Response(null, { status: 204, headers: corsHeaders(request, env) });
      }
      if (isUpload || isDelete) {
        const authError = checkAuth(request, env);
        if (authError) return authError;
      }
      if (isUpload) return handleUpload(request, env);
      return handleDelete(request, env, decodeURIComponent(url.pathname.slice('/api/upload/'.length)));
    }

    return expressHandler.fetch
      ? expressHandler.fetch(request, env, ctx)
      : expressHandler(request, env, ctx);
  },
};
