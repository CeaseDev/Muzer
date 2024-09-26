import axios from 'axios';

// YouTube Data API key from environment variable
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Spotify API credentials from environment variables
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// Function to get metadata from YouTube
export async function getYouTubeMetadata(url: string) {
    const videoId = extractYouTubeVideoId(url);
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${YOUTUBE_API_KEY}&part=snippet`;

    try {
        const response = await axios.get(apiUrl);
        const videoData = response.data.items[0].snippet;
        return {
            title: videoData.title,
            thumbnail: videoData.thumbnails.high.url,
        };
    } catch (error) {
        console.error('Error fetching YouTube metadata:', error);
        return null;
    }
}

// Function to extract YouTube video ID from a URL
function extractYouTubeVideoId(url: string): string {
    const videoIdMatch = url.match(/[?&]v=([^&]+)/) || url.match(/youtu.be\/([^?]+)/);
    return videoIdMatch ? videoIdMatch[1] : '';
}

// Function to get metadata from Spotify
export async function getSpotifyMetadata(url: string) {
    const token = await getSpotifyAccessToken();
    const spotifyApiUrl = `https://api.spotify.com/v1/tracks/${extractSpotifyTrackId(url)}`;

    try {
        const response = await axios.get(spotifyApiUrl, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        const trackData = response.data;
        return {
            title: trackData.name,
            thumbnail: trackData.album.images[0].url,
        };
    } catch (error) {
        console.error('Error fetching Spotify metadata:', error);
        return null;
    }
}


function extractSpotifyTrackId(url: string): string {
    const trackIdMatch = url.match(/track\/([^?]+)/);
    return trackIdMatch ? trackIdMatch[1] : '';
}

async function getSpotifyAccessToken() {
    const authToken = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
    const response = await axios.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
        headers: {
            Authorization: `Basic ${authToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    });

    return response.data.access_token;
}
