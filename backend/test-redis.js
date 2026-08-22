import Redis from 'ioredis';
const client = new Redis({ host: 'localhost', port: 6380 });
const keys = await client.keys('gamestate:*');
if (keys.length > 0) {
  const val = await client.get(keys[0]);
  console.log('Parsed:', JSON.stringify(JSON.parse(val).matchState.tokenStates, null, 2));
} else {
  console.log('No games found');
}
client.quit();
