
import { createServer } from 'http';
import WebSocket from 'ws';
const { parse } = require('url');
const next = require('next');
import { prisma } from '@/app/lib/db';
import Redis from 'ioredis';
import { NextApiRequest, NextApiResponse } from 'next';

const redis = new Redis();

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Create a WebSocket server instance


app.prepare().then(() => {
    const server = createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
    });

    const wss = new WebSocket.Server({ noServer: true });

    wss.on('connection', (ws, req) => {
        ws.on('message', async (message) => {
          const parsedMessage = JSON.parse(message.toString());
      
          switch (parsedMessage.type) {
            case 'JOIN_ROOM':
              await handleJoinRoom(ws, parsedMessage.data);
              break;
            case 'ADD_TRACK':
              await handleAddTrack(parsedMessage.data);
              break;
            case 'VOTE_TRACK':
              await handleVoteTrack(parsedMessage.data);
              break;
            default:
              console.error('Unknown message type:', parsedMessage.type);
          }
        });
      
        ws.on('close', () => {
          console.log('WebSocket connection closed');
          // Handle any cleanup if necessary
        });
      });
      
      async function handleJoinRoom(ws: WebSocket, { roomCode, userId }: { roomCode: string, userId: string }) {
        console.log(`User ${userId} joining room ${roomCode}`);
      
        await redis.sadd(`room:${roomCode}:users`, userId);
      
        const room = await prisma.room.findUnique({
          where: { id: roomCode },
        });
      
        console.log(`Room ${roomCode} details:`, room);
      
        ws.send(JSON.stringify({ type: 'ROOM_JOINED', data: { roomCode, userId } }));
      }
      
      function broadcastToRoom(roomCode: string, message: any) {
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ roomCode, ...message }));
          }
        });
      }
      
      async function handleAddTrack({ roomCode, track }: { roomCode: string, track: { url: string } }) {
        const newTrack = await prisma.track.create({
          data: {
            url: track.url,
            room: { connect: { id: roomCode } },
          },
        });
      
        // Optionally cache the track in Redis
        await redis.rpush(`room:${roomCode}:tracks`, JSON.stringify(newTrack));
      
        broadcastToRoom(roomCode, { type: 'TRACK_ADDED', data: newTrack });
      }
      
      async function handleVoteTrack({ roomCode, trackId, vote }: { roomCode: string, trackId: string, vote: 'UP' | 'DOWN' }) {
        const userId = 'USER_ID'; // Replace this with the actual user ID from the WebSocket connection or session
      
        const existingVote = await prisma.vote.findFirst({
          where: {
            trackId: trackId,
            userId: userId,
          },
        });
      
        if (existingVote) {
          await prisma.vote.update({
            where: { id: existingVote.id },
            data: { type: vote },
          });
        } else {
          await prisma.vote.create({
            data: {
              type: vote,
              userId: userId,
              trackId: trackId,
            },
          });
        }
      
        // Optionally update Redis cache here
        const updatedTrack = await prisma.track.findUnique({
          where: { id: trackId },
          include: { votes: true },
        });
      
        broadcastToRoom(roomCode, { type: 'TRACK_VOTED', data: updatedTrack });
      }
      
}); 

