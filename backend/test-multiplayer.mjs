import { io } from "socket.io-client";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";

const SECRET = "qwe8r7ty23489yhfwekjhfwkejhrkjewh";

function createToken(sub) {
  return jwt.sign({ sub, name: sub, iat: Math.floor(Date.now() / 1000) }, SECRET);
}

const token1 = createToken("player1");
const token2 = createToken("player2");

const socket1 = io("http://localhost:3000/game", { auth: { token: token1 } });
const socket2 = io("http://localhost:3000/lobby", { auth: { token: token2 } });

socket1.on("connect", async () => {
  console.log("Player 1 connected to Game namespace");
  
  // Actually we need to hit the HTTP API to create a battle first
  const res = await fetch("http://localhost:3000/api/v1/matchmaking/battle", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token1}` },
    body: JSON.stringify({ entryFee: 10 })
  });
  const data = await res.json();
  const battleId = data.id;
  console.log("Created battle:", battleId);

  // Player 2 accept
  const res2 = await fetch(`http://localhost:3000/api/v1/matchmaking/battle/${battleId}/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token2}` },
  });
  console.log("Accepted battle:", await res2.json());

  // Player 1 start
  const res3 = await fetch(`http://localhost:3000/api/v1/matchmaking/battle/${battleId}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token1}` },
  });
  console.log("Started battle:", await res3.json());

  // Both join room via WS
  socket1.emit("JOIN_ROOM", { matchId: battleId });
  const socket2Game = io("http://localhost:3000/game", { auth: { token: token2 } });
  socket2Game.emit("JOIN_ROOM", { matchId: battleId });

  socket1.on("GAME_STATE", (payload) => {
    console.log("Player 1 received GAME_STATE!");
    const compressed = payload.compressedState;
    // We can't easily decompress in JS without zlib here, let's just wait for the backend log
    setTimeout(() => {
      process.exit(0);
    }, 2000);
  });
});

