"use client"

import { useState } from 'react';
import { useSession, signIn, getSession } from 'next-auth/react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

export default function CreateRoomForm() {
  const [name, setName] = useState('');
  const [roomID , setRoomID] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ displayRoom , setDisplayRoom ] = useState("");
  const { data: session } = useSession();
  const router = useRouter();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session) {
      signIn(); // Redirect to the sign-in page if not logged in
      return;
    }

    const userSession = await getSession();
    if(userSession){
        try {
            console.log("reached here") ; 
          const response = await axios.post('/api/rooms/create', 
            { name },
            {
                headers: {
                  Authorization: `Bearer ${userSession.accessToken}`,
                },
            }
          );
          console.log('Room created:', response.data.message.id);
          setName('');
          if(response.status === 200){
            setRoomID(response.data.message.id);
            setDisplayRoom(response.data.message.id);
          } // Clear the input
          setError(null);
        } catch (error: any) {
          setError(error.response?.data?.error || 'An error occurred');
        }
    }   
  };

  const verifyRoom = async (roomId: string) => {
    try {
      const response = await axios.post('/api/rooms/verify', { roomId });
      return response.data.exists;
    } catch (error) {
      console.error('Error verifying room ID:', error);
      return false;
    }
  };

  const handleRoomRoute = async (e: React.FormEvent) =>{
    e.preventDefault();
    console.log("reached here"); 

    const isRoomValid = await verifyRoom(roomID);
    
    if (isRoomValid) {
      router.push(`/${roomID}`);
    } else {
      setError('Invalid room ID.');
    }
  }


  return (
    <div className="flex items-center justify-center min-h-screen bg-transparent gap-5 flex-col">
      <form onSubmit={handleSubmit} className='border-2 rounded-md flex flex-col p-10 w-[30rem] shadow-xl bg-white'>
        <h2 className='text-2xl font-bold mb-5 text-center text-gray-800'>Create a Room</h2>
        {!session && <p className="text-red-500 text-center mb-4">Please sign in to create a room.</p>}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter room name"
          required
          className='border rounded-md p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent'
          disabled={!session} // Disable input if not logged in
        />
        <button
          type="submit"
          className={`bg-blue-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-600 transition duration-200 ${!session ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={!session} // Disable button if not logged in
        >
          Create Room
        </button>
        {error && <p className='mt-4 text-red-600'>{error}</p>}
        {displayRoom && <p className=''>{displayRoom}</p>}
      </form>
      <form className='border-2 rounded-md flex flex-col p-10 w-[30rem] shadow-xl bg-white'>
        <h2 className='text-2xl font-bold mb-5 text-center text-gray-800'>Join Room</h2>
        {!session && <p className="text-red-500 text-center mb-4">Please sign in to join a room.</p>}
        <input
          type="text"
          value={roomID}
          onChange={(e) => setRoomID(e.target.value)}
          placeholder="Enter room id"
          required
          className='border rounded-md p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent'
          disabled={!session} // Disable input if not logged in
        />
        <button
          type="submit"
          className={`bg-blue-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-600 transition duration-200 ${!session ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={!session} 
          onClick={handleRoomRoute}// Disable button if not logged in
        >
          Join
        </button>
        {error && <p className='mt-4 text-red-600'>{error}</p>}
      </form>
      
    </div>
  );
}
