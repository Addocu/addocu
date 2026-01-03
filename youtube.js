/**
 * @fileoverview YouTube Synchronization Module for Addocu.
 * @version 1.0
 */

// =================================================================
// GLOBALS AND HEADERS
// =================================================================

const YOUTUBE_CHANNELS_HEADERS = [
  'Channel ID', 'Title', 'Handle', 'Description', 'Published At',
  'Subscribers', 'Videos', 'Views', 'Hidden Subscriber Count',
  'Thumbnail URL', 'Sync Date'
];

const YOUTUBE_PLAYLISTS_HEADERS = [
  'Playlist ID', 'Channel ID', 'Title', 'Description',
  'Published At', 'Item Count', 'Privacy Status',
  'Thumbnail URL', 'Sync Date'
];

const YOUTUBE_VIDEOS_HEADERS = [
  'Video ID', 'Channel ID', 'Title', 'Description',
  'Published At', 'Duration', 'Category ID', 'Privacy Status',
  'View Count', 'Like Count', 'Comment Count',
  'Tags', 'Thumbnail URL', 'Embeddable', 'License', 'Sync Date'
];

// =================================================================
// MAIN SYNC FUNCTIONS
// =================================================================

/**
 * Main function to synchronize YouTube data.
 * @returns {Object} Sync status and record count.
 */
function syncYouTubeCore() {
  const result = {
    status: 'PENDING',
    records: 0,
    errors: []
  };

  try {
    logEvent('YOUTUBE_SYNC', 'Starting YouTube inventory synchronization...');

    // 1. Get YouTube Channels
    const channels = listYouTubeChannels();
    writeYouTubeChannelsToSheet(channels);
    result.records += channels.length;
    if (channels.length > 0) {
      logEvent('YOUTUBE_SYNC', `Successfully inventoried ${channels.length} channels.`);
    }

    // 2. Get Playlists for those channels
    const playlists = [];
    if (channels && channels.length > 0) {
      channels.forEach(channel => {
        try {
          const channelPlaylists = listYouTubePlaylists(channel.id);
          if (channelPlaylists && channelPlaylists.length > 0) {
            playlists.push(...channelPlaylists);
          }
        } catch (e) {
          logError('YOUTUBE_SYNC', `Error fetching playlists for channel ${channel.id}: ${e.message}`);
          result.errors.push(`Playlists (${channel.id}): ${e.message}`);
        }
      });
    }

    writeYouTubePlaylistsToSheet(playlists);
    result.records += playlists.length;
    if (playlists.length > 0) {
      logEvent('YOUTUBE_SYNC', `Successfully inventoried ${playlists.length} playlists.`);
    }

    // 3. Get Videos for those channels (from uploads playlist)
    const videos = [];
    if (channels && channels.length > 0) {
      channels.forEach(channel => {
        try {
          const channelVideos = listYouTubeVideos(channel.uploadsPlaylistId);
          if (channelVideos && channelVideos.length > 0) {
            videos.push(...channelVideos);
          }
        } catch (e) {
          logError('YOUTUBE_SYNC', `Error fetching videos for channel ${channel.id}: ${e.message}`);
          result.errors.push(`Videos (${channel.id}): ${e.message}`);
        }
      });
    }

    writeYouTubeVideosToSheet(videos);
    result.records += videos.length;
    if (videos.length > 0) {
      logEvent('YOUTUBE_SYNC', `Successfully inventoried ${videos.length} videos.`);
    }

    result.status = 'SUCCESS';
    PropertiesService.getUserProperties().setProperty('ADDOCU_LAST_SYNC_YOUTUBE', Date.now().toString());

    return result;

  } catch (error) {
    logError('YOUTUBE_SYNC', `Critical error in YouTube sync: ${error.message}`);

    // Report error in the primary sheet
    writeDataToSheet('YOUTUBE_CHANNELS', YOUTUBE_CHANNELS_HEADERS, null, 'YouTube', error.message);

    result.status = 'ERROR';
    result.errors.push(error.message);
    return result;
  }
}

/**
 * Entry point for UI calls.
 */
function syncYouTubeWithUI() {
  const ui = SpreadsheetApp.getUi();
  const confirmResponse = ui.alert(
    'YouTube Synchronization',
    'Do you want to inventory your YouTube channels, playlists, and videos? This will create new sheets or overwrite existing ones.',
    ui.ButtonSet.YES_NO
  );

  if (confirmResponse === ui.Button.YES) {
    showLoadingNotification('Syncing YouTube assets...');
    const result = syncYouTubeCore();

    if (result.status === 'SUCCESS') {
      const details = result.details || {};
      const body = `Channels: ${details.channels || 0} | Playlists: ${details.playlists || 0} | Videos: ${details.videos || 0}\n\n` +
        `Total: ${result.records} elements | Time: ${Math.round(result.duration / 1000)}s\n\n` +
        `Data written to YOUTUBE_CHANNELS, YOUTUBE_PLAYLISTS, YOUTUBE_VIDEOS.`;
      ui.alert('YouTube Synchronized', body, ui.ButtonSet.OK);
    } else {
      const body = `Synchronization failed: ${(result.errors && result.errors.length > 0 ? result.errors[0] : 'Unknown error')}\n\n` +
        `Action: Verify that you have YouTube channels and that the script has been authorized.\n\n` +
        `Details: Check LOGS sheet for more information.`;
      ui.alert('YouTube Error', body, ui.ButtonSet.OK);
    }
  }
}

// =================================================================
// DATA EXTRACTION HELPERS
// =================================================================

/**
 * Lists YouTube channels for the authenticated user.
 * @returns {Array<Object>} Array of channel data objects.
 */
function listYouTubeChannels() {
  const auth = getAuthConfig('youtube');
  const endpoint = 'https://www.googleapis.com/youtube/v3/channels';
  const url = buildUrl(endpoint, {
    mine: true,
    part: 'snippet,contentDetails,statistics'
  });

  const response = fetchWithRetry(url, { headers: auth.headers }, 'YouTube');

  if (!response || !response.items) return [];

  return response.items.map(item => ({
    id: item.id,
    title: item.snippet.title,
    handle: item.snippet.customUrl || 'N/A',
    description: item.snippet.description,
    publishedAt: item.snippet.publishedAt,
    subscriberCount: item.statistics.subscriberCount,
    videoCount: item.statistics.videoCount,
    viewCount: item.statistics.viewCount,
    hiddenSubscriberCount: item.statistics.hiddenSubscriberCount,
    thumbnailUrl: item.snippet.thumbnails?.default?.url || '',
    uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads || ''
  }));
}

/**
 * Lists playlists for a specific YouTube channel.
 * @param {string} channelId - The channel ID.
 * @returns {Array<Object>} Array of playlist data objects.
 */
function listYouTubePlaylists(channelId) {
  const auth = getAuthConfig('youtube');
  const endpoint = 'https://www.googleapis.com/youtube/v3/playlists';
  const url = buildUrl(endpoint, {
    channelId: channelId,
    part: 'snippet,contentDetails,status',
    maxResults: 50
  });

  const response = fetchWithRetry(url, { headers: auth.headers }, 'YouTube');

  if (!response || !response.items) return [];

  return response.items.map(item => ({
    id: item.id,
    channelId: item.snippet.channelId,
    title: item.snippet.title,
    description: item.snippet.description,
    publishedAt: item.snippet.publishedAt,
    itemCount: item.contentDetails.itemCount,
    privacyStatus: item.status.privacyStatus,
    thumbnailUrl: item.snippet.thumbnails?.default?.url || ''
  }));
}

/**
 * Lists videos from a channel's uploads playlist.
 * @param {string} uploadsPlaylistId - The uploads playlist ID.
 * @returns {Array<Object>} Array of video data objects.
 */
function listYouTubeVideos(uploadsPlaylistId) {
  if (!uploadsPlaylistId) return [];

  const auth = getAuthConfig('youtube');

  // Step 1: Get video IDs from playlist
  const playlistEndpoint = 'https://www.googleapis.com/youtube/v3/playlistItems';
  const playlistUrl = buildUrl(playlistEndpoint, {
    playlistId: uploadsPlaylistId,
    part: 'contentDetails',
    maxResults: 50 // Limit to 50 most recent videos
  });

  const playlistResponse = fetchWithRetry(playlistUrl, { headers: auth.headers }, 'YouTube');
  if (!playlistResponse || !playlistResponse.items) return [];

  const videoIds = playlistResponse.items.map(item => item.contentDetails.videoId).join(',');
  if (!videoIds) return [];

  // Step 2: Get full video details
  const videosEndpoint = 'https://www.googleapis.com/youtube/v3/videos';
  const videosUrl = buildUrl(videosEndpoint, {
    id: videoIds,
    part: 'snippet,contentDetails,statistics,status'
  });

  const videosResponse = fetchWithRetry(videosUrl, { headers: auth.headers }, 'YouTube');
  if (!videosResponse || !videosResponse.items) return [];

  return videosResponse.items.map(item => ({
    id: item.id,
    channelId: item.snippet.channelId,
    title: item.snippet.title,
    description: item.snippet.description,
    publishedAt: item.snippet.publishedAt,
    duration: item.contentDetails.duration,
    categoryId: item.snippet.categoryId,
    privacyStatus: item.status.privacyStatus,
    viewCount: item.statistics.viewCount || 0,
    likeCount: item.statistics.likeCount || 0,
    commentCount: item.statistics.commentCount || 0,
    tags: item.snippet.tags ? item.snippet.tags.join(', ') : '',
    thumbnailUrl: item.snippet.thumbnails?.default?.url || '',
    embeddable: item.status.embeddable,
    license: item.status.license
  }));
}

// =================================================================
// SHEET WRITING HELPERS
// =================================================================

/**
 * Writes channel data to the YOUTUBE_CHANNELS sheet.
 * @param {Array<Object>} channels - Array of channel objects.
 */
function writeYouTubeChannelsToSheet(channels) {
  const syncDate = formatDate(new Date());
  const data = channels.map(c => [
    c.id, c.title, c.handle, c.description, c.publishedAt,
    c.subscriberCount, c.videoCount, c.viewCount, c.hiddenSubscriberCount,
    c.thumbnailUrl, syncDate
  ]);

  writeDataToSheet('YOUTUBE_CHANNELS', YOUTUBE_CHANNELS_HEADERS, data, 'YouTube');
}

/**
 * Writes playlist data to the YOUTUBE_PLAYLISTS sheet.
 * @param {Array<Object>} playlists - Array of playlist objects.
 */
function writeYouTubePlaylistsToSheet(playlists) {
  const syncDate = formatDate(new Date());
  const data = playlists.map(p => [
    p.id, p.channelId, p.title, p.description,
    p.publishedAt, p.itemCount, p.privacyStatus,
    p.thumbnailUrl, syncDate
  ]);

  writeDataToSheet('YOUTUBE_PLAYLISTS', YOUTUBE_PLAYLISTS_HEADERS, data, 'YouTube');
}

/**
 * Writes video data to the YOUTUBE_VIDEOS sheet.
 * @param {Array<Object>} videos - Array of video objects.
 */
function writeYouTubeVideosToSheet(videos) {
  const syncDate = formatDate(new Date());
  const data = videos.map(v => [
    v.id, v.channelId, v.title, v.description,
    v.publishedAt, v.duration, v.categoryId, v.privacyStatus,
    v.viewCount, v.likeCount, v.commentCount,
    v.tags, v.thumbnailUrl, v.embeddable, v.license, syncDate
  ]);

  writeDataToSheet('YOUTUBE_VIDEOS', YOUTUBE_VIDEOS_HEADERS, data, 'YouTube');
}
