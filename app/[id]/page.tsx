"use client"
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { BiSolidDownvote, BiSolidUpvote } from "react-icons/bi";
import { Track } from "../types/types"; 
import Player from "../components/Player";

const RoomPage = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const { id: roomCode } = useParams();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [newTrackUrl, setNewTrackUrl] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isCreator, setIsCreator] = useState<boolean>(false); 
  const [name, setName] = useState(""); 

  useEffect(() => {
    console.log(roomCode);
    if (!roomCode || !session?.user?.id) return;

    const socket = new WebSocket("ws://localhost:3001"); 
    setWs(socket);

    socket.onopen = () => {
      console.log('WebSocket connection opened');
      socket.send(JSON.stringify({ 
        type: 'JOIN_ROOM', 
        data: { roomCode, userId: session.user.id } 
      }));
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleSocketMessage(message);
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed');
    };

    socket.onerror = (e) => {
      console.error('WebSocket error:', e);
    };

    return () => {
      socket.close();
    };
  }, [roomCode, session]);

  const handleSocketMessage = (message: any) => {
    switch (message.type) {
      case 'ROOM_JOINED':
        console.log(message);
        setName(message.data.room.name); 
        setIsCreator(message.data.isCreator);
        setTracks(message.data.tracks); 
        break;
      case 'TRACK_ADDED':
        console.log(message.data);
        setTracks((prevTracks) => {
          return Array.isArray(prevTracks) ? [...prevTracks, message.data] : [message.data];
        });
        break;
      case 'TRACK_VOTED':
        console.log(message.data);
        setTracks((prevTracks) =>
          prevTracks.map((track) =>
            track.id === message.data.trackId ? { ...track, upVotes: message.data.upVotes } : track
          )
        );
        break;
      case 'TRACK_DELETED':
        console.log(message.data);
        setTracks((prevTracks) => prevTracks.filter(track => track.id !== message.data.trackId));
        break;
      default:
        break;
    }
  };

  const handleAddTrack = () => {
    if (ws && newTrackUrl) {
      ws.send(JSON.stringify({ 
        type: 'ADD_TRACK', 
        data: { roomCode, track: { url: newTrackUrl } } 
      }));
      setNewTrackUrl('');
    }
  };

  const handleVote = (trackId: string, vote: 'UP') => {
    if (ws) {
      ws.send(JSON.stringify({ 
        type: 'VOTE_TRACK', 
        data: { roomCode, trackId, vote, userId: session?.user?.id } 
      }));
    }
  };

  const handleDeleteTrack = (trackId: string) => {
    if (ws) {
      ws.send(JSON.stringify({
        type: 'DELETE_TRACK',
        data: { roomCode, trackId, userId: session?.user?.id }
      }));
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <h1 className='text-white text-xl font-extrabold m-10'>Room: {roomCode}</h1>
      <div className='flex gap-20 '>
        <div className='flex flex-col w-1/3 p-4 gap-10'>
          {isCreator ? (
            <CreatorView 
              newTrackUrl={newTrackUrl} 
              setNewTrackUrl={setNewTrackUrl} 
              handleAddTrack={handleAddTrack} 
              name={name} 
              tracks={tracks}  
            />
          ) : (
            <UserView
              newTrackUrl={newTrackUrl} 
              setNewTrackUrl={setNewTrackUrl} 
              handleAddTrack={handleAddTrack} 
              name={name}
            />
          )}{/* Display current track */}
        </div>
        <div className='mt-0'>
          <TrackList tracks={tracks} handleVote={handleVote} isCreator={isCreator} handleDeleteTrack={handleDeleteTrack}/>
        </div>
      </div>
    </div>
  );
};

// Creator view component
const CreatorView = ({ newTrackUrl, setNewTrackUrl, handleAddTrack, name, tracks }: any) => {

  const sortedTracks = tracks.sort((a: Track, b: Track) => b.upVotes - a.upVotes);

  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  const handleTrackEnd = () => {
    // Move to the next track when the current one ends
    console.log('Current track ended');
    const nextTrackIndex = (currentTrackIndex + 1) % sortedTracks.length;
    setCurrentTrackIndex(nextTrackIndex);
  };

  return (  
    <div className='flex flex-col'>
    <div className='flex gap-10 items-center mb-4'>
      <h2 className='text-white text-xl font-extrabold'>Hey {name} !!</h2>
      <div className='flex items-center justify-center gap-2'>
        <div className='flex'></div>
        <input
          type="text"
          value={newTrackUrl}
          onChange={(e) => setNewTrackUrl(e.target.value)}
          placeholder="Enter YouTube URL"
          className='w-[70%] h-10 rounded-md p-3 border-blue-50'
        />
        <button onClick={handleAddTrack} className='border-2 w-32 h-10 rounded-md border-blue-50 text-white bg-violet-500 hover:bg-violet-700'>Add Track</button> 
      </div>
    </div>
    <Player track={sortedTracks[currentTrackIndex]} onTrackEnd={handleTrackEnd} />
  </div>
  );
};

// User view component
const UserView = ({ newTrackUrl, setNewTrackUrl, handleAddTrack, name }: any) => {
  return (
    <div className='flex gap-10 items-center mb-4'>
      <h2 className='text-white text-xl font-extrabold'>Hey {name} !!</h2>
      <div className='flex items-center justify-center gap-2'>
        <input
          type="text"
          value={newTrackUrl}
          onChange={(e) => setNewTrackUrl(e.target.value)}
          placeholder="Enter YouTube URL"
          className='w-[70%] h-10 rounded-md p-3 border-blue-50'
        />
        <button onClick={handleAddTrack} className='border-2 w-32 h-10 rounded-md border-blue-50 text-white bg-violet-500 hover:bg-violet-700'>Add Track</button>
      </div>
    </div>
  );
};

// Shared component for listing tracks and voting
const TrackList = ({ tracks = [], handleVote, isCreator, handleDeleteTrack }: any) => {
  const sortedTracks = tracks.sort((a: Track, b: Track) => {
    if (a.upVotes !== b.upVotes) {
      return b.upVotes - a.upVotes; // Higher votes first
    }
    return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(); // FCFS if votes are equal
  });

  return (
    <div className="m-4">
      {sortedTracks.length === 0 ? (
        <p className="text-white text-center">No tracks available</p>
      ) : (
        <>
          <ul>
            {sortedTracks.map((track: Track) => (
              <li key={track.id} className="p-2 border-b border-gray-600">
                <div className="flex items-center gap-4">
                  <img src={track.thumbnail} alt={track.title} width={100} />
                  <div className="flex-grow">
                    <a
                      href={track.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white font-bold"
                    >
                      {track.title || track.url}
                    </a>
                    <div className="flex gap-2 items-center text-xl">
                      <p className="text-white">Votes: {track.upVotes || 0}</p>
                      <button
                        onClick={() => handleVote(track.id, 'UP')}
                        className="text-green-500 border-2 p-2"
                      >
                        Upvote
                      </button>
                      {isCreator && (
                        <button
                          onClick={() => handleDeleteTrack(track.id)}
                          className="text-red-500 border-2 p-2"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default RoomPage;
