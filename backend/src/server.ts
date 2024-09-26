import { createServer } from 'http';
import WebSocket from 'ws';
import Redis from 'ioredis';
import { prisma } from '../lib/db'; 
import { PrismaClient } from '@prisma/client';
import { getYouTubeMetadata, getSpotifyMetadata } from '../lib/metadata';

const redis = new Redis(process.env.REDIS_URL || ""); 

// Create HTTP server and WebSocket server
const server = createServer();
const wss = new WebSocket.Server({ noServer: true });

async function updateRedisVoteCount(trackId: number, voteType: 'UP' | 'DOWN') {
  const key = `track:${trackId}:votes`;
  try {
    if (voteType === 'UP') {
      await redis.hincrby(key, 'upVotes', 1);
    } else {
      await redis.hincrby(key, 'downVotes', 1);
    }
  } catch (error) {
    console.error('Error updating Redis vote count:', error);
  }
}

async function playNextTrack(roomCode :string , currentTrackId : string) {
  try {

    await redis.lrem(`room:${roomCode}:tracks`, 0, currentTrackId);

    await prisma.track.delete({
      where: { id: currentTrackId },
    });

    // 3. Get the next track from Redis
    const nextTrackId = await redis.lindex(`room:${roomCode}:tracks`, 0);

    if (!nextTrackId) {
      console.log("No more tracks to play");
      return null; // No more tracks to play
    }

    // 4. Fetch the next track details from the database
    const nextTrack = await prisma.track.findUnique({
      where: { id: nextTrackId },
    });

    return nextTrack;
  } catch (error) {
    console.error('Error playing next track:', error);
    return null;
  }
}


function broadcastToRoom(wss: WebSocket.Server, roomCode: string, message: any) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ roomCode, ...message }));
    }
  });
}

export async function handleAddTrack({ roomCode, track }: { roomCode: string, track: { url: string } },
  redis: Redis, prisma: PrismaClient) {
  try {
    let metadata = null;
    
    if (track.url.includes('youtube.com') || track.url.includes('youtu.be')) {
      metadata = await getYouTubeMetadata(track.url);
    } else if (track.url.includes('spotify.com')) {
      metadata = await getSpotifyMetadata(track.url);
    } else {
      console.log("Error due to invalid URL");
      return; // Stop processing for invalid URLs
    }

    if (!metadata) {
      console.error('Invalid track URL');
      return;
    }

    const newTrack = await prisma.track.create({
      data: {
        url: track.url,
        room: { connect: { id: roomCode } },
      },
    });
    
    await redis.rpush(`room:${roomCode}:tracks`, JSON.stringify(newTrack));

    broadcastToRoom(wss, roomCode, {
      type: 'TRACK_ADDED',
      data: {
        ...newTrack,
        title: metadata.title,
        thumbnail: metadata.thumbnail,
      },
    });
  } catch (error) {
    console.error('Error handling add track:', error);
  }
}

async function handleDeleteTrack({ roomCode, trackId, userId }: { roomCode: string, trackId: string, userId: string }) {
  try {
    // Fetch the room and check if the user is the creator
    const room = await prisma.room.findUnique({
      where: { id: roomCode },
      include: { creator: true },
    });

    if (!room || room.creatorId !== userId) {
      broadcastToRoom(wss, roomCode, {
        type: 'TRACK_DELETED',
        data: { message: "Unauthorized to delete track" },
      });
      console.error('Unauthorized track deletion attempt or room not found');
      return;
    }

    // Step 1: Delete the track from the database
    const deletedTrack = await prisma.track.delete({
      where: { id: trackId },
    });

    if (deletedTrack) {
      // Step 2: Attempt to delete the track from Redis
      const deletedCount = await redis.lrem(`room:${roomCode}:tracks`, 1, JSON.stringify(deletedTrack));
      console.log(deletedCount);
      if (deletedCount === 0) {
        // Step 3: Rollback in case of Redis failure by re-inserting the track in the DB
        await prisma.track.create({
          data: {
            id: deletedTrack.id,
            url: deletedTrack.url,
            roomId: deletedTrack.roomId,
            createdAt: deletedTrack.createdAt,
            updatedAt: deletedTrack.updatedAt,
          },
        });
        console.error('Failed to delete track from Redis, rolling back DB deletion');
        broadcastToRoom(wss, roomCode, {
          type: 'TRACK_DELETED',
          data: { message: "Failed to delete track from Redis, rolled back DB deletion" },
        });
        return;
      }

      // Step 4: If successful, broadcast the deletion
      broadcastToRoom(wss, roomCode, {
        type: 'TRACK_DELETED',
        data: { trackId },
      });
    }
  } catch (error) {
    console.error('Error handling track deletion:', error);
  }
}

async function handleJoinRoom(
  ws: WebSocket,
  { roomCode, userId }: { roomCode: string; userId: string },
  redis: Redis,
  prisma: PrismaClient
) {
  try {
    console.log(`User ${userId} joining room ${roomCode}`);

    await redis.sadd(`room:${roomCode}:users`, userId);

    const room = await prisma.room.findUnique({ where: { id: roomCode } });

    if (!room) {
      ws.send(JSON.stringify({ type: 'ERROR', data: 'Room not found' }));
      return;
    }

    const isCreator = room.creatorId === userId;
    const tracksData = await redis.lrange(`room:${roomCode}:tracks`, 0, -1);
    const tracks = tracksData.map((trackStr) => JSON.parse(trackStr));

    const tracksWithMetadata = await Promise.all(
      tracks.map(async (track) => {
        let metadata = null;
    
        // Fetch YouTube or Spotify metadata
        if (track.url.includes('youtube.com') || track.url.includes('youtu.be')) {
          metadata = await getYouTubeMetadata(track.url);
        } else if (track.url.includes('spotify.com')) {
          metadata = await getSpotifyMetadata(track.url);
        }
    
        // Redis vote key
        const trackKey = `room:${roomCode}:track:${track.id}`;
        let upVotes = await redis.hget(trackKey, 'upVotes');

        const trackFromDB = await prisma.track.findUnique({
            where: { id: track.id },
            select: { upVotes: true },
        });
          
        if(trackFromDB && parseInt(upVotes!) != trackFromDB.upVotes){
          await redis.hset(trackKey, 'upVotes', trackFromDB.upVotes);
        }
          // Update Redis with the vote count from the database
        return {
          ...track,
          title: metadata?.title || 'Unknown Title',
          thumbnail: metadata?.thumbnail || 'default-thumbnail-url',
          upVotes: trackFromDB!.upVotes, // Convert string to integer
        };
      })
    );
    
    ws.send(JSON.stringify({
      type: 'ROOM_JOINED',
      data: {
        roomCode,
        userId,
        isCreator,
        room,
        tracks: tracksWithMetadata,
      },
    }));
  } catch (error) {
    console.error('Error handling room join:', error);
    ws.send(JSON.stringify({ type: 'ERROR', data: 'Failed to join room' }));
  }
}

export async function handleVoteTrack(
  { roomCode, trackId, userId }: { roomCode: string; trackId: string; userId: string },
) {
  if (!userId) {
    console.error('Error: userId is undefined');
    broadcastToRoom(wss, roomCode, {
      type: 'TRACK_VOTE_ERROR',
      data: {
        trackId,
        message: 'User ID is missing',
      },
    });
    return;
  }

  try {
    console.log(roomCode, trackId, userId);

    // Check if the user has already voted for the track
    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_trackId: {
          userId: userId,
          trackId: trackId,
        },
      },
    });

    // If the user has already voted, do nothing
    if (existingVote) {
      console.log('User has already voted for this track');
      return;  // No action if the user has already voted
    }

    // Perform the vote transaction
    const updatedTrack = await prisma.$transaction(async (prisma) => {
      // Create the vote in the database
      await prisma.vote.create({
        data: {
          user: { connect: { id: userId } },
          track: { connect: { id: trackId } },
        },
      });

      // Increment the upvote count for the track in the database
      return prisma.track.update({
        where: { id: trackId },
        data: { upVotes: { increment: 1 } },
        select: { upVotes: true },
      });
    });

    // Update the upvote count in Redis
    const trackKey = `room:${roomCode}:track:${trackId}`;
    
    await redis.hincrby(trackKey, 'upVotes', 1);  // Increment the upvote count in Redis

    // Broadcast the updated vote count
    broadcastToRoom(wss, roomCode, {
      type: 'TRACK_VOTED',
      data: {
        trackId,
        upVotes: updatedTrack.upVotes,  // Return the updated count from the DB
      },
    });
  } catch (error) {
    console.error('Error handling track vote:', error);
    broadcastToRoom(wss, roomCode, {
      type: 'TRACK_VOTE_ERROR',
      data: {
        trackId,
        message: 'An error occurred while processing your vote',
      },
    });
  }
}

async function handleTrackEnd( {roomCode , trackId} :any ) {
  const nextTrack = await playNextTrack(roomCode, trackId);
  if (nextTrack) {
    broadcastToRoom(wss,roomCode , {
      type: 'NEXT_TRACK',
      data:
      {nextTrack }, 
    }) ;
  }
  else{
    broadcastToRoom(wss,roomCode , {
      type: 'NO_MORE_TRACKS', 
    }) ;
  }
  }

server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

wss.on('connection', (ws, req) => {
  ws.on('message', async (message) => {
    try {
      const parsedMessage = JSON.parse(message.toString());

      switch (parsedMessage.type) {
        case 'JOIN_ROOM':
          await handleJoinRoom(ws, parsedMessage.data, redis, prisma);
          break;
        case 'ADD_TRACK':
          await handleAddTrack(parsedMessage.data, redis, prisma);
          break;
        case 'VOTE_TRACK':
          await handleVoteTrack(parsedMessage.data);
          break;
        case 'DELETE_TRACK':
          await handleDeleteTrack(parsedMessage.data);
          break;
        case 'TRACK_ENDED' :
          await handleTrackEnd(parsedMessage.data) ; 
        default:
          console.error('Unknown message type:', parsedMessage.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({ type: 'ERROR', data: 'Message processing failed' }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
});

server.listen(3001, () => {
  console.log('WebSocket server running on port 3001');
});
