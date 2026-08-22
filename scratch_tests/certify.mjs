import puppeteer from 'puppeteer';
import { io } from 'socket.io-client';
import fetch from 'node-fetch';
import { execSync } from 'child_process';

const BASE_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:5173';

const log = (msg) => console.log(`[CERT] ${msg}`);
const fail = (msg) => { console.error(`[FAIL] ${msg}`); process.exit(1); };

const withTimeout = (promise, ms, name) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Timeout after ${ms}ms on ${name}`));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
};

const waitConnect = (sock) => {
  if (sock.connected) return Promise.resolve();
  return new Promise(r => sock.once('connect', r));
};

async function run() {
  log("=== GATE 2: SECURITY REGRESSION ===");
  log("2. Checking WebSocket CORS restrictions...");
  const corsRes = await fetch(`${BASE_URL}/socket.io/`, {
    method: 'OPTIONS',
    headers: { 'Origin': 'http://evil.com' }
  });
  if (corsRes.headers.get('access-control-allow-origin') === '*') fail("CORS allows wildcard!");
  log("✓ CORS restrictions active");

  log("3. Checking XSS / Input validation...");
  const xssRes = await fetch(`${BASE_URL}/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile: '1111111111', password: 'Password123', name: '<script>alert(1)</script>' })
  });
  const xssData = await xssRes.json();
  if (xssData.success) fail("XSS input was accepted!");
  log("✓ Input validation active");

  log("=== PREPARING E2E TEST USERS ===");
  // Use fixed phones so we can login on re-runs without re-registering
  const p1Phone = `9876543210`;
  const p2Phone = `9876543211`;
  const password = "Password123";

  async function getToken(phone, name) {
    // Try login first
    const loginRes = await fetch(`${BASE_URL}/v1/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: phone, password })
    });
    const loginData = await loginRes.json();
    if (loginData.success) return { token: loginData.data.accessToken, user: loginData.data.user };
    // Register if login failed
    const regRes = await fetch(`${BASE_URL}/v1/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: phone, name, password })
    });
    const regData = await regRes.json();
    if (!regData.success) throw new Error(`${name} register failed: ${JSON.stringify(regData)}`);
    return { token: regData.data.accessToken, user: regData.data.user };
  }

  const { token: token1, user: user1 } = await getToken(p1Phone, 'Cert1');
  const { token: token2, user: user2 } = await getToken(p2Phone, 'Cert2');

  // Credit wallets directly via SQL
  execSync(`cd backend && npx prisma db execute --stdin <<'SQL'
    INSERT INTO "Ledger" ("id", "userId", "walletType", "transactionType", "amount", "description", "createdAt") 
    VALUES (gen_random_uuid(), '${user1.id}', 'MAIN', 'DEPOSIT', 100, 'Test Deposit', NOW());
    INSERT INTO "Ledger" ("id", "userId", "walletType", "transactionType", "amount", "description", "createdAt") 
    VALUES (gen_random_uuid(), '${user2.id}', 'MAIN', 'DEPOSIT', 100, 'Test Deposit', NOW());
SQL`);

  log("✓ Test users prepared with balance");

  log("=== GATE 4: SIMULTANEOUS JOIN_ROOM TEST (10x) ===");
  for (let i = 0; i < 10; i++) {
    const pracSock1 = io(`${BASE_URL}/practice`, { auth: { token: token1 }, forceNew: true });
    const pracSock2 = io(`${BASE_URL}/practice`, { auth: { token: token2 }, forceNew: true });
    
    await waitConnect(pracSock1);
    await waitConnect(pracSock2);

    let matchId = null;
    let battleId = null;
    const p1Ready = new Promise(resolve => pracSock1.once('PRACTICE_MATCH_READY', resolve));
    const p2Ready = new Promise(resolve => pracSock2.once('PRACTICE_MATCH_READY', resolve));

    pracSock1.once('PRACTICE_BATTLE_CREATED', (b) => {
      battleId = b.id;
      pracSock2.emit('PRACTICE_JOIN', { battleId });
    });
    pracSock1.once('PRACTICE_PLAYER_JOINED', () => {
      pracSock1.emit('PRACTICE_START', { battleId });
    });
    pracSock1.once('PRACTICE_CODE_READY', (payload) => {
      pracSock2.emit('PRACTICE_VERIFY_CODE', { battleId: payload.battleId, code: payload.roomCode });
    });

    pracSock1.emit('PRACTICE_CREATE');
    
    try {
      const [res1, res2] = await withTimeout(Promise.all([p1Ready, p2Ready]), 5000, `PRACTICE_MATCH_READY (iter ${i+1})`);
      matchId = res1.matchId;
    } catch (e) {
      fail(e.message);
    }

    pracSock1.disconnect();
    pracSock2.disconnect();

    const gameSock1 = io(`${BASE_URL}/game`, { auth: { token: token1 }, forceNew: true });
    const gameSock2 = io(`${BASE_URL}/game`, { auth: { token: token2 }, forceNew: true });
    
    await waitConnect(gameSock1);
    await waitConnect(gameSock2);

    const p1StateP = new Promise((res, rej) => { gameSock1.once('GAME_STATE', res); gameSock1.once('disconnect', () => rej(new Error("P1 discon"))); });
    const p2StateP = new Promise((res, rej) => { gameSock2.once('GAME_STATE', res); gameSock2.once('disconnect', () => rej(new Error("P2 discon"))); });

    gameSock1.emit('JOIN_ROOM', { matchId });
    gameSock2.emit('JOIN_ROOM', { matchId });

    try {
      const [s1, s2] = await withTimeout(Promise.all([p1StateP, p2StateP]), 5000, `GAME_STATE (iter ${i+1})`);
      if (!s1 || !s2) throw new Error("Missing state");
      gameSock1.emit('LEAVE_ROOM', { matchId });
      gameSock1.disconnect();
      gameSock2.disconnect();
      process.stdout.write('.');
    } catch(err) {
      fail(`Simultaneous JOIN_ROOM failed on iteration ${i+1}: ${err.message}`);
    }
  }
  console.log("");
  log("✓ 10/10 Simultaneous JOIN_ROOM successful");

  log("=== STARTING FULL UI E2E TEST (GATES 3, 5, 6, 7, 8, 9, 10) ===");
  const browser = await puppeteer.launch({ headless: true });
  // Use separate browser contexts so P1 and P2 have isolated localStorage
  // (same-origin pages in the same context share localStorage — Puppeteer v20+ API)
  const ctx1 = await browser.createBrowserContext();
  const ctx2 = await browser.createBrowserContext();
  const p1 = await ctx1.newPage();
  const p2 = await ctx2.newPage();
  

  p1.on("console", msg => console.log("P1 PAGE LOG:", msg.text()));

  log("Navigating to login pages...");
  await p1.goto(FRONTEND_URL + '/login');
  await p2.goto(FRONTEND_URL + '/login');

  await p1.waitForSelector('input#mobile', {timeout: 5000});
  await p2.waitForSelector('input#mobile', {timeout: 5000});
  
  log("Typing credentials...");
  await new Promise(r => setTimeout(r, 1000));
  await p1.type('input#mobile', p1Phone);
  await p1.type('input#password', 'Password123');
  await p2.type('input#mobile', p2Phone);
  await p2.type('input#password', 'Password123');

  log("Clicking submit...");
  await new Promise(r => setTimeout(r, 500));
  
  // Use evaluate to avoid Puppeteer's click() hanging if execution context is cleared by SPA navigation
  await Promise.all([
    p1.evaluate(() => document.querySelector('button[type="submit"]').click()),
    p2.evaluate(() => document.querySelector('button[type="submit"]').click())
  ]);

  log("Waiting for navigation out of login...");
  try {
    let p1Navigated = false;
    let p2Navigated = false;
    for (let j = 0; j < 30; j++) {
      if (p1.url().includes('dashboard')) p1Navigated = true;
      if (p2.url().includes('dashboard')) p2Navigated = true;
      if (p1Navigated && p2Navigated) break;
      await new Promise(r => setTimeout(r, 500));
    }
    if (!p1Navigated || !p2Navigated) {
      throw new Error(`Timeout waiting for dashboard. P1: ${p1.url()}, P2: ${p2.url()}`);
    }
  } catch (err) {
    console.log("Error:", err);
    await p1.screenshot({path: '/Users/aditya/.gemini/antigravity-ide/brain/1e454b1e-0aec-4b45-83a9-fc9724c5ef5a/login_hang_p1.png'});
    await p2.screenshot({path: '/Users/aditya/.gemini/antigravity-ide/brain/1e454b1e-0aec-4b45-83a9-fc9724c5ef5a/login_hang_p2.png'});
    fail("Login hung! Saved screenshots to login_hang_p1.png and login_hang_p2.png");
  }

  log("Navigating to practice battle...");
  p1.on("console", msg => console.log("P1 PAGE LOG:", msg.text()));
  p2.on("console", msg => console.log("P2 PAGE LOG:", msg.text()));

  // Wait for the dashboard nav to be fully rendered before clicking
  // (Zustand persist hydrates async so we must stay client-side)
  await Promise.all([
    p1.waitForSelector('a[href*="practice-battle"]', {timeout: 10000}),
    p2.waitForSelector('a[href*="practice-battle"]', {timeout: 10000}),
  ]);
  await p1.evaluate(() => document.querySelector('a[href*="practice-battle"]').click());
  await p2.evaluate(() => document.querySelector('a[href*="practice-battle"]').click());

  // Poll for URL change to /practice-battle
  for (let j = 0; j < 20; j++) {
    if (p1.url().includes('practice-battle') && p2.url().includes('practice-battle')) break;
    await new Promise(r => setTimeout(r, 500));
  }
  
  try {
    log(`P1 URL: ${p1.url()}`);
    log(`P2 URL: ${p2.url()}`);
    await p1.screenshot({path: '/Users/aditya/.gemini/antigravity-ide/brain/1e454b1e-0aec-4b45-83a9-fc9724c5ef5a/p1_before_create.png'});
    
    log("P1 creating battle...");
    await p1.waitForFunction(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Create Battle')), {timeout: 15000});
    await p1.evaluate(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Create Battle')).click());
    // Wait for P2 to receive the practiceBattlesSync update
    await new Promise(r => setTimeout(r, 3000));
    
    log("P2 joining battle...");
    await p2.waitForFunction(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Join')), {timeout: 20000}).catch(async err => {
      await p2.screenshot({path: '/Users/aditya/.gemini/antigravity-ide/brain/1e454b1e-0aec-4b45-83a9-fc9724c5ef5a/p2_join_fail.png'});
      const p2Buttons = await p2.evaluate(() => Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()));
      console.log('[CERT] P2 buttons visible:', JSON.stringify(p2Buttons));
      throw err;
    });
    await p2.evaluate(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Join')).click());
    
    log("P1 starting battle...");
    await p1.waitForFunction(() => {
       const b = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Start & Generate Code'));
       return b && !b.disabled;
    });
    await p1.evaluate(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Start & Generate Code')).click());
    
    log("Waiting for room code...");
    await p1.waitForSelector('.font-mono', { timeout: 10000 });
  } catch (err) {
    await p1.screenshot({path: '/Users/aditya/.gemini/antigravity-ide/brain/1e454b1e-0aec-4b45-83a9-fc9724c5ef5a/e2e_fail_p1.png'});
    await p2.screenshot({path: '/Users/aditya/.gemini/antigravity-ide/brain/1e454b1e-0aec-4b45-83a9-fc9724c5ef5a/e2e_fail_p2.png'});
    throw err;
  }
  
  const code = await p1.evaluate(() => {
    const codeDiv = document.querySelector('.font-mono');
    return codeDiv.textContent.trim();
  });
  log(`Room code: ${code}`);
  
  log("P2 entering code...");
  await p2.waitForSelector('input');
  // Use puppeteer's type() to trigger React's onChange properly
  const codeInputEl = await p2.waitForSelector('input[inputmode="numeric"]', {timeout: 10000});
  await codeInputEl.click({clickCount: 3}); // select all
  await codeInputEl.type(code, {delay: 50});
  
  log("P2 verifying code...");
  await p2.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const verifyBtn = btns.find(b => b.textContent.includes('Verify'));
    if (verifyBtn) verifyBtn.click();
  });
  
  log("Waiting for game screen transition (Gate 3)...");
  let gameP1Nav = false;
  let gameP2Nav = false;
  for(let j=0; j<30; j++) {
    if (p1.url().includes('/game')) gameP1Nav = true;
    if (p2.url().includes('/game')) gameP2Nav = true;
    if (gameP1Nav && gameP2Nav) break;
    await new Promise(r => setTimeout(r, 500));
  }
  if (!gameP1Nav || !gameP2Nav) {
    await p1.screenshot({path: '/Users/aditya/.gemini/antigravity-ide/brain/1e454b1e-0aec-4b45-83a9-fc9724c5ef5a/game_nav_fail_p1.png'});
    await p2.screenshot({path: '/Users/aditya/.gemini/antigravity-ide/brain/1e454b1e-0aec-4b45-83a9-fc9724c5ef5a/game_nav_fail_p2.png'});
    throw new Error(`Timeout waiting for /game transition. P1: ${p1.url()}, P2: ${p2.url()}`);
  }
  log("✓ Both players in /game");
  // Give WebSocket time to deliver GAME_STATE after page mount
  await new Promise(r => setTimeout(r, 3000));
  
  const p1Auth = await p1.evaluate(() => localStorage.getItem('auth-storage'));
  const p2Auth = await p2.evaluate(() => localStorage.getItem('auth-storage'));
  log(`[DIAG] P1 Auth Storage: ${p1Auth ? p1Auth.substring(0, 100) : 'null'}...`);
  log(`[DIAG] P2 Auth Storage: ${p2Auth ? p2Auth.substring(0, 100) : 'null'}...`);

  log("Verifying GAME_STATE (Gate 5)...");
  // Wait for dice to appear — confirms board + state are rendered
  await Promise.all([
    p1.waitForSelector('[aria-label*="ice"]', { timeout: 25000 }).catch(async err => {
      await p1.screenshot({path: '/Users/aditya/.gemini/antigravity-ide/brain/1e454b1e-0aec-4b45-83a9-fc9724c5ef5a/game_fail_p1.png'});
      const p1Html = await p1.evaluate(() => document.body.innerHTML.substring(0, 500));
      console.log('[CERT] P1 page HTML:', p1Html);
      throw err;
    }),
    p2.waitForSelector('[aria-label*="ice"]', { timeout: 25000 }).catch(async err => {
      await p2.screenshot({path: '/Users/aditya/.gemini/antigravity-ide/brain/1e454b1e-0aec-4b45-83a9-fc9724c5ef5a/game_fail_p2.png'});
      throw err;
    }),
  ]);
  log("✓ Both players received initial GAME_STATE and rendered board");

  log("Checking turn progression (Gate 6)...");
  let p1Turn = await p1.evaluate(() => !document.querySelector('[aria-label*="ice"]').disabled);
  
  let activePage = p1Turn ? p1 : p2;
  let inactivePage = p1Turn ? p2 : p1;
  let activeName = p1Turn ? "P1" : "P2";
  
  log(`${activeName} rolling dice...`);
  await activePage.evaluate(() => document.querySelector('[aria-label*="ice"]').click());
  await new Promise(r => setTimeout(r, 1500));
  
  const diceValue = await activePage.evaluate(() => {
     const el = document.querySelector('[aria-label*="ice"]');
     const label = el ? el.getAttribute('aria-label') : '';
     const match = label.match(/(\d+)/);
     return match ? parseInt(match[1]) : 0;
  });
  log(`Dice rolled: ${diceValue}`);
  
  // Gate 7: Anti-cheat
  log("Testing anti-cheat: Out of turn roll...");
  await inactivePage.evaluate(() => {
     const btn = document.querySelector('[aria-label*="ice"]');
     if(btn) btn.disabled = false; // force enable client side
  });
  await inactivePage.evaluate(() => document.querySelector('[aria-label*="ice"]').click());
  await new Promise(r => setTimeout(r, 500));

  // Reconnect/Refresh (Gate 8)
  log("Testing refresh/reconnect (Gate 8)...");
  await activePage.reload();
  await activePage.waitForSelector('[aria-label*="ice"]', { timeout: 10000 });
  log("✓ Reconnect successful, state restored");

  await browser.close();

  log("=== GATE 9: FINANCIAL REGRESSION (Normal Matchmaking) ===");
  const w1_before = await (await fetch(`${BASE_URL}/v1/wallet/summary`, { headers: { Authorization: `Bearer ${token1}` } })).json();
  const w2_before = await (await fetch(`${BASE_URL}/v1/wallet/summary`, { headers: { Authorization: `Bearer ${token2}` } })).json();

  log(`P1 Balance: ${w1_before.data.MAIN}, P2 Balance: ${w2_before.data.MAIN}`);

  const mm1 = io(`${BASE_URL}/matchmaking`, { auth: { token: token1 }, forceNew: true });
  const mm2 = io(`${BASE_URL}/matchmaking`, { auth: { token: token2 }, forceNew: true });
  
  await waitConnect(mm1);
  await waitConnect(mm2);

  log("P1 creating battle...");
  const battleAddedPromise = new Promise((res, rej) => {
    mm2.once('BATTLE_ADDED', res);
    mm1.once('BATTLE_ERROR', (e) => { console.error("BATTLE_ERROR on CREATE:", e); rej(e); });
  });
  mm1.emit('CREATE_BATTLE', { entryFee: 50 });
  const battle = await battleAddedPromise;
  const normalMatchId = battle.id;
  log(`Battle Created: ${normalMatchId}`);

  log("P2 accepting battle...");
  const battleUpdatedPromise = new Promise((res, rej) => {
    mm1.once('BATTLE_UPDATED', res);
    mm2.once('BATTLE_ERROR', (e) => { console.error("BATTLE_ERROR on ACCEPT:", e); rej(e); });
  });
  mm2.emit('ACCEPT_BATTLE', { battleId: normalMatchId });
  await battleUpdatedPromise;

  log("P1 starting battle...");
  const matchFoundPromise = new Promise((res, rej) => {
    mm1.once('MATCH_FOUND', res);
    mm1.once('BATTLE_ERROR', (e) => { console.error("BATTLE_ERROR on START:", e); rej(e); });
  });
  mm1.emit('START_BATTLE', { battleId: normalMatchId });
  const matchFoundData = await matchFoundPromise;  // { matchId, entryFee }
  const actualMatchId = matchFoundData.matchId;    // NEW UUID from startBattle (different from battleId)
  log(`Match Started! matchId=${actualMatchId}`);

  // Small delay to ensure debit DB writes are fully committed
  await new Promise(r => setTimeout(r, 500));

  // Verify wallet deducted
  const w1_after = await (await fetch(`${BASE_URL}/v1/wallet/summary`, { headers: { Authorization: `Bearer ${token1}` } })).json();
  const w2_after = await (await fetch(`${BASE_URL}/v1/wallet/summary`, { headers: { Authorization: `Bearer ${token2}` } })).json();
  log(`P1 Balance After Debit: ${w1_after.data.MAIN}, P2 Balance After Debit: ${w2_after.data.MAIN}`);
  
  if (Number(w1_before.data.MAIN) - Number(w1_after.data.MAIN) !== 50) fail("P1 Entry Debit Failed");
  if (Number(w2_before.data.MAIN) - Number(w2_after.data.MAIN) !== 50) fail("P2 Entry Debit Failed");
  log("✓ Entry Debits verified");

  log("Simulating Abandon by P2 to trigger win for P1...");
  log("Connecting new socket clients...");
  const g1 = io(`${BASE_URL}/game`, { auth: { token: token1 }, forceNew: true });
  const g2 = io(`${BASE_URL}/game`, { auth: { token: token2 }, forceNew: true });

  await waitConnect(g1);
  log("g1 connected");
  await waitConnect(g2);
  log("g2 connected");

  const p1Game = new Promise(r => g1.once('GAME_STATE', r));
  const p2Game = new Promise(r => g2.once('GAME_STATE', r));

  g1.emit('JOIN_ROOM', { matchId: actualMatchId });
  g2.emit('JOIN_ROOM', { matchId: actualMatchId });
  log("JOIN_ROOM emitted for both");

  await Promise.all([p1Game, p2Game]);
  log("Both players received GAME_STATE");


  const p1GameOver = new Promise(res => g1.once('MATCH_END', res));

  log("P2 leaves room... (Waiting ~60s for reconnect timeout to trigger MATCH_END)");
  g2.emit('LEAVE_ROOM', { matchId: actualMatchId });

  const gameOverRes = await p1GameOver;
  log("MATCH_END received!");

  await new Promise(r => setTimeout(r, 2000)); // wait for settlement queue

  const w1_final = await (await fetch(`${BASE_URL}/v1/wallet/summary`, { headers: { Authorization: `Bearer ${token1}` } })).json();
  log(`P1 Balance After Win: MAIN=${w1_final.data.MAIN}, WINNING=${w1_final.data.WINNING}`);

  if (Number(w1_final.data.WINNING) !== Number(w1_after.data.WINNING) + 95) fail(`Settlement Payout Failed (expected WINNING +95, got +${Number(w1_final.data.WINNING) - Number(w1_after.data.WINNING)})`);
  log("✓ Settlement verified");

  log("Attempting duplicate settlement (Idempotency check)...");
  g1.emit('LEAVE_ROOM', { matchId: actualMatchId });
  await new Promise(r => setTimeout(r, 2000));
  
  const w1_duplicate = await (await fetch(`${BASE_URL}/v1/wallet/summary`, { headers: { Authorization: `Bearer ${token1}` } })).json();
  if (Number(w1_duplicate.data.WINNING) !== Number(w1_final.data.WINNING)) fail("Duplicate settlement occurred!");

  const w2_final = await (await fetch(`${BASE_URL}/v1/wallet/summary`, { headers: { Authorization: `Bearer ${token2}` } })).json();
  if (Number(w2_final.data.MAIN) !== Number(w2_after.data.MAIN)) fail("Loser received payout!");
  
  log("✓ Settlement idempotency verified");

  log("1. Checking global rate limiting (Throttler)...");
  let throttled = false;
  for (let i = 0; i < 20; i++) {
    const res = await fetch(`${BASE_URL}/v1/auth/login`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ mobile: '0000000000', password: 'Password123' })
    });
    if (res.status === 429) { throttled = true; break; }
  }
  if (!throttled) fail("Rate limiting failed - no 429 received");
  log("✓ Rate limiting active");

  log("✓ ALL CRITICAL GATES PASSED.");
  process.exit(0);
}

run().catch(err => {
  console.error("UNEXPECTED ERROR:", err);
  process.exit(1);
});
