"use client";
import { useEffect, useRef, useState } from "react";
import { Track } from "../types/types";
import axios from "axios";

// Declare YT on the global window object
declare global {
  interface Window {
    YT: any;
  }
}

type SpotifyResponceToken  = {
    access_token: string;
    expires_in: number;
    token_type : string ; 
}

interface PlayerProps {
  track: Track | null;
  onTrackEnd: () => void; // Function to call when the track ends
}

const Player = ({ track, onTrackEnd }: PlayerProps) => {
  const [isYouTube, setIsYouTube] = useState(false);
  const [isSpotify, setIsSpotify] = useState(false);
  const youTubePlayerRef = useRef<HTMLDivElement | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null); // Store the video ID to prevent re-initializing the same video

  const loadYouTubeAPI = () => {
    if (!window.YT) {
      console.log("Loading YouTube API...");
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      if (firstScriptTag) {
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }

      // Set a timeout to ensure the API is loaded
      setTimeout(() => {
        setPlayerReady(true);
        console.log("YouTube API ready");
      }, 1000); // You can adjust this timeout
    } else {
      setPlayerReady(true);
      console.log("YouTube API already loaded");
    }
  };

  const getSpotifyTrackDuration = async (trackId: string) => {

    const response : any  = await axios.post('/api/spotifytoken') ; 
      
    console.log(response); 
    const token = response.data.message.access_token; 
    console.log(token);
    const url = `https://api.spotify.com/v1/tracks/${trackId}`;

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json()
      const durationMs = data.duration_ms; // Track duration in milliseconds
      console.log(`Spotify track duration: ${durationMs} ms`);
      return durationMs;
    } catch (error) {
      console.error("Failed to fetch Spotify track duration:", error);
      return 180000; // Fallback duration in case of an error
    }
  };

  useEffect(() => {
    if (!track) {
      console.log("No track available");
      return;
    }

    // Get video ID from the YouTube URL
    const videoId = track.url.split("v=")[1]?.split("&")[0];

    setCurrentVideoId(videoId); // Update the current video ID

    console.log(`Playing track: ${track.url}`);

    // Detect if it's a YouTube or Spotify URL
    const isYouTubeUrl = track.url.includes("youtube.com") || track.url.includes("youtu.be");
    const isSpotifyUrl = track.url.includes("spotify.com");
    setIsYouTube(isYouTubeUrl);
    setIsSpotify(isSpotifyUrl);
    console.log(`Track is YouTube: ${isYouTubeUrl}, Track is Spotify: ${isSpotifyUrl}`);

    // Load YouTube API dynamically if it's a YouTube URL
    if (isYouTubeUrl) {
      loadYouTubeAPI();
    }

    // Autoplay logic for YouTube and Spotify
    if (playerReady && isYouTubeUrl && youTubePlayerRef.current) {
      console.log("Initializing YouTube player...");
      const onYouTubePlayerStateChange = (event: any) => {
        console.log("YouTube player state change:", event.data);
        if (event.data === window.YT.PlayerState.ENDED) {
          console.log("YouTube video ended");
          onTrackEnd(); // Video ended
        }
      };

      const player = new window.YT.Player(youTubePlayerRef.current, {
        videoId,
        events: {
          onStateChange: onYouTubePlayerStateChange,
        },
        playerVars: {
          autoplay: 1,
          controls: 1,
        },
      });

      return () => {
        console.log("Cleaning up YouTube player");
        player.destroy(); // Clean up the player
      };
    }

    if (isSpotifyUrl) {
      const trackId = track.url.split("track/")[1];
      if (trackId) {
        console.log(`Fetching Spotify track duration for track ID: ${trackId}`);
        // Fetch the track duration
        getSpotifyTrackDuration(trackId).then((duration) => {
          console.log(`Spotify track will play for ${duration} ms`);
          // Set a timeout to autoplay the next track when the current one finishes
          setTimeout(() => {
            console.log("Spotify track ended");
            onTrackEnd();
          }, duration);
        });
      }
    }
  }, [track, playerReady, onTrackEnd, currentVideoId]);

  if (!track) return null;

  return (
    <div className="my-4">
      {isYouTube && (
        <div
          ref={youTubePlayerRef}
          id="youtube-player"
          style={{ width: "560px", height: "315px" }}
        />
      )}
      {isSpotify && (
        <iframe
          src={`https://open.spotify.com/embed/track/${track.url.split("track/")[1]}`}
          width="300"
          height="380"
          allow="encrypted-media"
          title={track.title}
          onLoad={() => {
            console.log("Spotify player loaded");
            const trackDurationMs = 180000; // Replace with actual track duration
            setTimeout(() => {
              console.log("Spotify player reached end");
              onTrackEnd();
            }, trackDurationMs);
          }}
        ></iframe>
      )}
    </div>
  );
};

export default Player;
