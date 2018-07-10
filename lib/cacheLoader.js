'use strict'

const { Client, Policy } = require('catbox');
const Singleton = require('egg/lib/core/singleton');

// Extend Policy
/**
 * ```js
 *  cache.take({
 *    key: 'key',
 *    create: async function() {
 *      return 'value'
 *    }
 *    format: async function() {
 *      return parseInt(value);
 *    }
 *    ttl: 1000 // default 60s
 *  });
 * ```
 * @param {string|object}key
 * @param {function} create
 * @param {function} format
 * @param {number} ttl
 * @return {Promise<*>}
 */
Policy.prototype.take = async function({ key, create, format, ttl = 60000 } = {}) {
  let value = this.get(key);
  if (value === null && generate) {
    value = await create();
    await this.set(key, value, ttl);
  } else {
    return value;
  }
  if (format) value = format(value);
  return value;
};

module.exports = app => {
  {
    const config = app.config.catbox;
    if (!config.client || !config.clients) config.client = { };
    app.addSingleton('catbox', createCatbox);
  }

  {
    const config = app.config.cache;
    if (!config.client || !config.clients) config.client = { };
    app.addSingleton('cache', createCache);
  }
};

// set memory as default store
function createCatbox ({ store = require('catbox-memory'), ...options }, app) {
  const client = new Client(store, options);

  app.beforeStart(async () => { await client.start(); });
  app.beforeClose(() => { client.stop(); });

  return client;
}

// set default segment to common
async function createCache({ catbox, segment = 'common', ...options }, app) {
  const isSingleton = app.catbox instanceof Singleton;
  let client;
  if (catbox) { // 指定client
    if (isSingleton) {
      client = app.catbox.get(catbox);
    } else {
      throw new Error(`the catbox is not multi clients, can not init cache with catbox ${catbox}`);
    }
  } else { // 不指定client
    if (isSingleton) {
      throw new Error(`the catbox is multi clients, can not init cache without catbox client name`);
    } else {
      client = app.catbox;
    }
  }
  const policy = new Policy(options, client, segment);
  return policy;
}

