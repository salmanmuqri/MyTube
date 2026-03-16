# MyTube End-User Guide

Last updated: 2026-03-15

## What You Can Do

MyTube lets you:
- create an account and sign in
- upload videos
- watch videos with adaptive quality playback
- like, comment, and subscribe
- browse recommendations, trending, history, and subscriptions
- create and manage playlists

## How Uploading Works

1. Go to Upload and select your video file.
2. The browser sends the file to the backend API endpoint: `/api/videos/upload/`.
3. The file is written to server media storage under `media/originals/`.
4. A background processing job starts after upload succeeds.
5. While processing, video status is `PROCESSING`.
6. The processor generates:
- thumbnail in `media/thumbnails/`
- HLS playlists and segments in `media/hls/<video-id>/`
7. When complete, status becomes `READY` and the video appears in lists and search.

## Where Files Are Stored

MyTube stores media on the server file system (Docker volume):
- original uploads: `media/originals/`
- thumbnails: `media/thumbnails/`
- stream files: `media/hls/<video-id>/`

The original uploaded file is removed after successful HLS processing to save space.

## How Playback Works

1. The app loads video metadata from the API.
2. For ready videos, the player loads HLS master playlist from `/media/hls/<video-id>/master.m3u8`.
3. The player selects quality automatically or by manual user selection.
4. Nginx serves media files and supports seek/range requests.

## Discovery and Feed Flow

- Home: recently uploaded ready videos.
- Trending: videos ranked by calculated trending score.
- Recommendations: personalized suggestions from recommendation service.
- Subscriptions: newest videos from channels you follow.

## Search and Suggestions

- Search supports title, description, and channel name.
- As you type, autocomplete suggestions return:
- matching video titles
- matching channel usernames

## Playlists

- Create playlists from the Playlists page.
- Set playlist visibility to public or private.
- Add and remove videos from playlist detail page.
- Public playlists can be viewed by other users.

## Limits and Processing Notes

- Maximum request size is set to 5 GB.
- Large files are streamed to disk during upload to avoid memory spikes.
- Processing time depends on duration, resolution, and server resources.

## Common Status Messages

- `PROCESSING`: upload succeeded, conversion still running.
- `READY`: playable with adaptive streaming.
- `FAILED`: processing failed. Re-uploading usually resolves temporary media issues.

## Troubleshooting Tips

- If upload seems stuck, keep the tab open and check your network stability.
- If a video stays in `PROCESSING` too long, refresh after a few minutes.
- If playback fails, open another video to verify service health, then retry.
- For account-specific issues, sign out and sign back in.
