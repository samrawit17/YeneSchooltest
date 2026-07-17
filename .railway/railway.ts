import { defineRailway, github, postgres, preserve, project, redis, service, volume } from "railway/iac";

export default defineRailway(() => {
  const backendSource = github("samrawit17/YeneSchooltest", { rootDirectory: "backend", branch: "main" });
  const frontendSource = github("samrawit17/YeneSchooltest", { rootDirectory: "frontend", branch: "main" });

  const Postgres = postgres("Postgres", { region: "sfo" });
  const Redis = redis("Redis", { region: "sfo" });
  Redis.deploy = { startCommand: "/bin/sh -c \"rm -rf $RAILWAY_VOLUME_MOUNT_PATH/lost+found/ && exec docker-entrypoint.sh redis-server --requirepass $REDIS_PASSWORD --save 60 1 --dir $RAILWAY_VOLUME_MOUNT_PATH\"" };
  const postgresVolume = volume("postgres-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "sfo", sizeMB: 500 });
  const redisVolume = volume("redis-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "sfo", sizeMB: 500 });
  const backend = service("backend", {
    source: backendSource,
    build: "npm run build",
    start: "node dist/main.js",
    healthcheck: "/health",
    replicas: { "sfo": 1 },
    env: {
      DATABASE_POOL_URL: preserve(),
      DATABASE_URL: preserve(),
      DIRECT_DATABASE_URL: preserve(),
      JWT_SECRET: preserve(),
      NODE_ENV: preserve(),
      PRISMA_SCHEMA_SYNC: preserve(),
      PRISMA_SKIP_SEED: preserve(),
      REDIS_URL: preserve(),
      RUN_MIGRATIONS: preserve(),
      SEED_SUPERADMIN_PASSWORD: preserve(),
      WEB_PUSH_CONTACT_EMAIL: preserve(),
      WEB_PUSH_PRIVATE_KEY: preserve(),
      WEB_PUSH_PUBLIC_KEY: preserve(),
    },
  });
  const frontend = service("frontend", {
    source: frontendSource,
    build: "npm run build",
    start: "node .next/standalone/server.js",
    healthcheck: "/sign-in",
    replicas: { "sfo": 1 },
    env: {
      HOSTNAME: preserve(),
      NEXT_PUBLIC_API_URL: preserve(),
      NODE_ENV: preserve(),
    },
  });

  return project("backend", {
    resources: [Postgres, Redis, backend, frontend, postgresVolume, redisVolume],
  });
});
