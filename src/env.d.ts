/// <reference types="astro/client" />

type AppRuntime = {
  DB: D1Database;
  SESSION: KVNamespace;
  R2_BUCKET: R2Bucket;
};

declare namespace App {
  interface Locals {
    requestId?: string;
  }
}
