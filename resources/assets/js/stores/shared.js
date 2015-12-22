import localforage from 'localforage';
import { assign } from 'lodash';

import http from '../services/http';
import userStore from './user';
import preferenceStore from './preference';
import playlistStore from './playlist';
import queueStore from './queue';
import settingStore from './setting';
import artistStore from './artist';
import albumStore from './album';
import songStore from './song';

export default {
    state: {
        useLastfm: false,
    },

    init(cb = null) {
        localforage.getItem('koelMediaData').then(cachedMediaData => {
            localforage.getItem('koelCacheTimestamp').then(ts => {
                var url = cachedMediaData && ts ? `data/${ts}` : 'data';

                http.get(url, serverData => {
                    this.prepareData(cachedMediaData, serverData, cb);
                });
            });
        });
    },

    prepareData(cachedMediaData, serverData, cb) {
        // If there's artists returned, our cached data (if any) has expired.
        // Re-process it now.
        if (!cachedMediaData || serverData.artists) {
            // This will init album and song stores as well.
            cachedMediaData = artistStore.init(serverData.artists);

            // Save the processed media data into localforage
            localforage.setItem('koelMediaData', cachedMediaData);

            // Keep track of our last caching timestamp too
            localforage.setItem('koelCacheTimestamp', serverData.cacheTimestamp);
        } 
        // Otherwise, use the already-processed media data from cache.
        else {
            artistStore.state.artists = cachedMediaData.artists;
            songStore.state.songs = cachedMediaData.songs;
            albumStore.state.albums = cachedMediaData.albums;
        }

        // The interactions and other data are always fresh.
        songStore.initInteractions(serverData.interactions);

        // If this is a new user, initialize his preferences to be an empty object.
        if (!serverData.currentUser.preferences) {
            serverData.currentUser.preferences = {};
        }

        userStore.init({
            users: serverData.users,
            currentUser: serverData.currentUser,
        });

        preferenceStore.init(serverData.currentUser);
        playlistStore.init(serverData.playlists);
        queueStore.init();
        settingStore.init(serverData.settings);

        window.useLastfm = this.state.useLastfm = serverData.useLastfm;

        if (cb) {
            cb();
        }
    },
};
