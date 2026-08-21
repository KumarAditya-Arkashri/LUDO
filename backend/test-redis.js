const Redis = require('ioredis');
const redis = new Redis();
(async () => {
  const keys = await redis.keys('match:*');
  for (const key of keys) {
    console.log("Match:", key);
    const data = await redis.get(key);
    const parsed = JSON.parse(data);
    console.log(JSON.stringify(parsed.history, null, 2));
    console.log(JSON.stringify(parsed.tokenStates, null, 2));
  }
  process.exit(0);
})();
