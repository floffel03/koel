<?php

namespace App\Http\Controllers\API;

use App\Models\Artist;
use App\Models\Interaction;
use App\Models\Playlist;
use App\Models\Setting;
use App\Models\User;
use Cache;

class DataController extends Controller
{
    /**
     * Get a set of application data.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function index($cacheTimestamp = null)
    {
        $playlists = Playlist::byCurrentUser()->orderBy('name')->with('songs')->get()->toArray();

        // We don't need full song data, just ID's
        foreach ($playlists as &$playlist) {
            $playlist['songs'] = array_pluck($playlist['songs'], 'id');
        }

        $data = [
            'settings' => Setting::all()->lists('value', 'key'),
            'playlists' => $playlists,
            'interactions' => Interaction::byCurrentUser()->get(),
            'users' => auth()->user()->is_admin ? User::all() : [],
            'currentUser' => auth()->user(),
            'useLastfm' => env('LASTFM_API_KEY') && env('LASTFM_API_SECRET'),
        ];

        if (!$cacheTimestamp || $cacheTimestamp != Cache::get('cacheTimestamp')) {
            $data['artists'] = Artist::orderBy('name')->with('albums', with('albums.songs'))->get();
            Cache::put('cacheTimestamp', time(), 24 * 60 * 30 * 12);
            $data['cacheTimestamp'] = Cache::get('cacheTimestamp');
        }

        return response()->json($data);
    }
}
