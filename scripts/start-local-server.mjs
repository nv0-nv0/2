// Cross-platform local launcher for avoiding "no available server" during handoff.
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.HOST = process.env.HOST || '127.0.0.1';
process.env.PORT = process.env.PORT || '3210';
process.env.NV0_PLATFORM_TARGET = process.env.NV0_PLATFORM_TARGET || 'local';
process.env.NV0_DEPLOYMENT_STAGE = process.env.NV0_DEPLOYMENT_STAGE || 'mvp';
process.env.NV0_COMMERCIAL_LAUNCH_READY = process.env.NV0_COMMERCIAL_LAUNCH_READY || 'false';
process.env.NV0_PERSISTENCE_MODE = process.env.NV0_PERSISTENCE_MODE || 'json';
process.env.NV0_STORAGE_MODE = process.env.NV0_STORAGE_MODE || 'local_fs';
process.env.NV0_REQUIRE_PERSISTENT_RUNTIME = process.env.NV0_REQUIRE_PERSISTENT_RUNTIME || 'false';
process.env.NV0_RUN_PREFLIGHT = process.env.NV0_RUN_PREFLIGHT || 'false';
process.env.NV0_ALLOWED_HOSTS = process.env.NV0_ALLOWED_HOSTS || 'localhost,127.0.0.1';
process.env.NV0_ALLOWED_ADMIN_ORIGINS = process.env.NV0_ALLOWED_ADMIN_ORIGINS || 'localhost,127.0.0.1';
process.env.NV0_PUBLIC_BASE_URL = process.env.NV0_PUBLIC_BASE_URL || `http://${process.env.HOST}:${process.env.PORT}`;
process.env.NV0_PAYMENT_PROVIDER = process.env.NV0_PAYMENT_PROVIDER || 'demo';

console.log(`[VERIDION local] starting server at ${process.env.NV0_PUBLIC_BASE_URL}`);
console.log('[VERIDION local] open /portal, /products/veridion/demo, or /api/public/server-availability after boot.');

await import('../server/index.mjs');
