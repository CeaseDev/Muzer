// /pages/api/spotifyToken.js
import fetch from 'node-fetch'; // Use node-fetch for server-side requests
import { Buffer } from 'buffer'; // Buffer to encode client credentials
import { NextRequest, NextResponse } from 'next/server';
import { NextApiRequest, NextApiResponse } from 'next';

const client_id = process.env.SPOTIFY_CLIENT_ID; // Ensure you set this in your environment variables
const client_secret = process.env.SPOTIFY_CLIENT_SECRET; // Ensure you set this in your environment variables

export async function POST(req : Request ){
    const authString = Buffer.from(client_id + ':' + client_secret).toString('base64') ; 
    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authString}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            'grant_type': 'client_credentials',
          }),
    });

    const data = await response.json();

    if(response.ok){
        return NextResponse.json({ message : data  , status : 200});
    }
    }
    catch (error) {
        console.error('Error fetching token:', error);
        return NextResponse.json("Error fetching token")
    }


      
}