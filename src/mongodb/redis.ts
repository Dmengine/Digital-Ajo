import { createClient, type RedisClientType } from "redis";
import { env } from "../config/env";

let redisClient: RedisClientType | null = null;
let connectPromise: Promise<RedisClientType> | null = null;

async function connectRedisClient(): Promise<RedisClientType | null> {
  const url = env.redisUrl();
  if (!url) return null;
  if (redisClient?.isOpen) return redisClient;

  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    if (!redisClient) {
      redisClient = createClient({ url });
      redisClient.on("error", (err) => {
        console.error("[redis] client error", err);
      });
    }
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    return redisClient;
  })();

  try {
    return await connectPromise;
  } finally {
    connectPromise = null;
  }
}

export async function getRedisClient(): Promise<RedisClientType | null> {
  return connectRedisClient();
}

export async function acquireLock(key: string, ttlMs: number): Promise<string | null> {
  const client = await connectRedisClient();
  if (!client) return null;

  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const acquired = await client.set(key, token, { NX: true, PX: ttlMs });
  return acquired === "OK" ? token : null;
}

export async function releaseLock(key: string, token: string): Promise<void> {
  const client = await connectRedisClient();
  if (!client) return;

  const script = `
    if redis.call("GET", KEYS[1]) == ARGV[1] then
      return redis.call("DEL", KEYS[1])
    else
      return 0
    end
  `;

  await client.eval(script, {
    keys: [key],
    arguments: [token],
  });
}
