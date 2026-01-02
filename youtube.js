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
        if (!channels || channels.length === 0) {
            logWarning('YOUTUBE_SYNC', 'No YouTube channels found for this account.');
        } else {
            writeYouTubeChannelsToSheet(channels);
            result.records += channels.length;
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

        if (playlists.length > 0) {
            writeYouTubePlaylistsToSheet(playlists);
            result.records += playlists.length;
            logEvent('YOUTUBE_SYNC', `Successfully inventoried ${playlists.length} playlists.`);
        }

        result.status = 'SUCCESS';
        PropertiesService.getUserProperties().setProperty('ADDOCU_LAST_SYNC_YOUTUBE', Date.now().toString());

        return result;

    } catch (error) {
        logError('YOUTUBE_SYNC', `Critical error in YouTube sync: ${error.message}`);
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
    const response = ui.alert(
        'Sync YouTube',
        'Do you want to inventory your YouTube channels and playlists? This will create new sheets or overwrite existing ones.',
        ui.ButtonSet.YES_NO
    );

    if (response === ui.Button.YES) {
        showLoadingNotification('Syncing YouTube assets...');
        const result = syncYouTubeCore();

        if (result.status === 'SUCCESS') {
            ui.alert('✅ Sync Complete', `YouTube inventory finished successfully.\n\nAssets found: ${result.records}`, ui.ButtonSet.OK);
        } else {
            ui.alert('❌ Sync Failed', `Error: ${result.errors.join('\n')}`, ui.ButtonSet.OK);
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
        thumbnailUrl: item.snippet.thumbnails?.default?.url || ''
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

    writeToSheet('YOUTUBE_CHANNELS', YOUTUBE_CHANNELS_HEADERS, data);
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

    writeToSheet('YOUTUBE_PLAYLISTS', YOUTUBE_PLAYLISTS_HEADERS, data);
}
