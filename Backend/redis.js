import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import crypto from "crypto";
import { redisUrl } from "./config.js";

const GAME_STATE_KEY = "chessmasters:active-games";
let client;
let subscriber;

export const connectRedis = async (io) => {
  if (!redisUrl) {
    console.log("REDIS_URL is not set; using single-instance in-memory game coordination.");
    return false;
  }

  try {
    client = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 2000,
        reconnectStrategy: false,
      },
    });
    subscriber = client.duplicate();
    client.on("error", error => console.error("Redis client error:", error.message));
    subscriber.on("error", error => console.error("Redis subscriber error:", error.message));

    await Promise.race([
      Promise.all([client.connect(), subscriber.connect()]),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Redis connection timed out")), 2500)),
    ]);
    io.adapter(createAdapter(client, subscriber, {
      publishOnSpecificResponseChannel: true,
    }));
    console.log("Redis-backed Socket.IO adapter connected.");
    return true;
  } catch (error) {
    console.error("Redis unavailable; continuing in single-instance mode:", error.message);
    await closeRedis();
    return false;
  }
};

export const loadActiveGames = async () => {
  if (!client?.isReady) return null;
  const value = await client.get(GAME_STATE_KEY);
  return value ? JSON.parse(value) : null;
};

export const saveActiveGames = async (games) => {
  if (!client?.isReady) return;
  await client.set(GAME_STATE_KEY, JSON.stringify(games), { EX: 24 * 60 * 60 });
};

export const withRedisLock = async (name, callback) => {
  if (!client?.isReady) return callback();
  const key = `chessmasters:lock:${name}`;
  const token = crypto.randomUUID();

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const acquired = await client.set(key, token, { NX: true, PX: 5000 });
    if (acquired) {
      try {
        return await callback();
      } finally {
        await client.eval(
          "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
          { keys: [key], arguments: [token] }
        );
      }
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out acquiring Redis lock: ${name}`);
};

export const closeRedis = async () => {
  await Promise.allSettled([
    subscriber?.isOpen ? subscriber.quit() : Promise.resolve(),
    client?.isOpen ? client.quit() : Promise.resolve(),
  ]);
};
