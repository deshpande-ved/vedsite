"""
flask backend for personal site
handles: Spotify (with auto token refresh), Last.fm, Letterboxd
"""

from flask import Flask, jsonify
from flask_cors import CORS
import requests
import base64
import json
import time
import hashlib
import feedparser

app = Flask(__name__)
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    return response

# CONFIGURATION - Your API credentials

SPOTIFY_CLIENT_ID = "REDACTED"
SPOTIFY_CLIENT_SECRET = "REDACTED"
SPOTIFY_TOKENS_FILE = "spotify_tokens.json"

LASTFM_API_KEY = "REDACTED"
LASTFM_SECRET = "REDACTED"
LASTFM_SESSION_KEY = "REDACTED"
LASTFM_USER = "yerasaki"

LETTERBOXD_USER = "yerasaki"

# SPOTIFY - Token Management

def load_spotify_tokens():
    """Load tokens from file"""
    with open(SPOTIFY_TOKENS_FILE, 'r') as f:
        return json.load(f)

def save_spotify_tokens(tokens):
    """Save tokens to file"""
    with open(SPOTIFY_TOKENS_FILE, 'w') as f:
        json.dump(tokens, f)

def refresh_spotify_token():
    """Get new access token using refresh token"""
    tokens = load_spotify_tokens()
    
    auth_str = f"{SPOTIFY_CLIENT_ID}:{SPOTIFY_CLIENT_SECRET}"
    auth_base64 = base64.b64encode(auth_str.encode()).decode()
    
    response = requests.post(
        "https://accounts.spotify.com/api/token",
        headers={"Authorization": f"Basic {auth_base64}"},
        data={
            "grant_type": "refresh_token",
            "refresh_token": tokens['refresh_token']
        }
    )
    
    new_tokens = response.json()
    tokens['access_token'] = new_tokens['access_token']
    tokens['expires_at'] = time.time() + new_tokens['expires_in'] - 300  # 5 min buffer
    save_spotify_tokens(tokens)
    
    return tokens['access_token']

def get_spotify_token():
    """Get valid token, refreshing if expired"""
    tokens = load_spotify_tokens()
    
    if time.time() >= tokens.get('expires_at', 0):
        print("Token expired, refreshing...")
        return refresh_spotify_token()
    
    return tokens['access_token']

def spotify_request(endpoint):
    """Make authenticated Spotify API request"""
    token = get_spotify_token()
    response = requests.get(
        f"https://api.spotify.com/v1{endpoint}",
        headers={"Authorization": f"Bearer {token}"}
    )
    return response

# SPOTIFY ENDPOINTS

@app.route('/api/spotify/now-playing')
def spotify_now_playing():
    """Get currently playing track with progress"""
    response = spotify_request("/me/player/currently-playing")
    
    if response.status_code == 200:
        data = response.json()
        track = data['item']
        return jsonify({
            "is_playing": data['is_playing'],
            "track_name": track['name'],
            "artist_name": track['artists'][0]['name'],
            "album_name": track['album']['name'],
            "album_image": track['album']['images'][0]['url'],  # 640x640
            "progress_ms": data['progress_ms'],
            "duration_ms": track['duration_ms'],
            "track_url": track['external_urls']['spotify']
        })
    
    elif response.status_code == 204:
        # Nothing playing - get last played
        response = spotify_request("/me/player/recently-played?limit=1")
        if response.status_code == 200:
            data = response.json()
            track = data['items'][0]['track']
            return jsonify({
                "is_playing": False,
                "track_name": track['name'],
                "artist_name": track['artists'][0]['name'],
                "album_name": track['album']['name'],
                "album_image": track['album']['images'][0]['url'],
                "progress_ms": 0,
                "duration_ms": track['duration_ms'],
                "track_url": track['external_urls']['spotify']
            })
    
    return jsonify({"error": "Could not fetch data"}), 500


@app.route('/api/spotify/queue')
def spotify_queue():
    """Get current queue"""
    response = spotify_request("/me/player/queue")
    
    if response.status_code == 200:
        data = response.json()
        
        queue = []
        for track in data.get('queue', [])[:10]:  # Limit to 10
            queue.append({
                "track_name": track['name'],
                "artist_name": track['artists'][0]['name'],
                "album_image": track['album']['images'][2]['url']  # 64x64 thumbnail
            })
        
        return jsonify({"queue": queue})
    
    return jsonify({"queue": []})

# LAST.FM ENDPOINTS
@app.route('/api/lastfm/top-artists')
def lastfm_top_artists():
    """Get top 5 artists for this month with play counts and images from Spotify"""
    
    # Build signature (Last.fm requires alphabetically sorted params)
    sig_string = f"api_key{LASTFM_API_KEY}limit5methoduser.gettopartistsperiod1monthsk{LASTFM_SESSION_KEY}user{LASTFM_USER}{LASTFM_SECRET}"
    api_sig = hashlib.md5(sig_string.encode('utf-8')).hexdigest()
    
    response = requests.get(
        "http://ws.audioscrobbler.com/2.0/",
        params={
            "method": "user.gettopartists",
            "period": "1month",
            "user": LASTFM_USER,
            "limit": 5,
            "api_key": LASTFM_API_KEY,
            "sk": LASTFM_SESSION_KEY,
            "api_sig": api_sig,
            "format": "json"
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        artists = []
        
        # Get Spotify token for artist image lookup
        spotify_token = get_spotify_token()
        
        for artist in data['topartists']['artist']:
            # Search Spotify for artist image
            image_url = None
            try:
                spotify_search = requests.get(
                    "https://api.spotify.com/v1/search",
                    headers={"Authorization": f"Bearer {spotify_token}"},
                    params={
                        "q": artist['name'],
                        "type": "artist",
                        "limit": 1
                    }
                )
                if spotify_search.status_code == 200:
                    spotify_data = spotify_search.json()
                    if spotify_data['artists']['items']:
                        images = spotify_data['artists']['items'][0].get('images', [])
                        if images:
                            image_url = images[0]['url']  # Largest image
            except:
                pass
            
            artists.append({
                "name": artist['name'],
                "playcount": int(artist['playcount']),
                "url": artist['url'],
                "image": image_url
            })
        
        return jsonify({"artists": artists})
    
    return jsonify({"error": "Could not fetch data"}), 500

# LETTERBOXD ENDPOINTS

@app.route('/api/letterboxd/recent')
def letterboxd_recent():
    """Get 4 most recent watched films"""
    feed = feedparser.parse(f"https://letterboxd.com/{LETTERBOXD_USER}/rss/")
    
    films = []
    for entry in feed.entries[:4]:
        # Convert numeric rating to stars
        rating = entry.get('letterboxd_memberrating', None)
        
        films.append({
            "title": entry.letterboxd_filmtitle,
            "year": entry.letterboxd_filmyear,
            "rating": float(rating) if rating else None,
            "watched_date": entry.letterboxd_watcheddate,
            "url": entry.link,
            "tmdb_id": entry.tmdb_movieid,
            # Poster: extract from summary or use TMDB API
            "poster": extract_poster_from_summary(entry.summary)
        })
    
    return jsonify({"films": films})

@app.route('/api/letterboxd/top4')
def letterboxd_top4():
    """Get top 4 favorite films (hardcoded)"""
    with open('top4.json', 'r') as f:
        films = json.load(f)
    return jsonify({"films": films})

def extract_poster_from_summary(summary):
    """Extract poster URL from Letterboxd RSS summary HTML"""
    # Summary contains: <img src="https://a.ltrbxd.com/resized/film-poster/..." />
    import re
    match = re.search(r'src="([^"]+)"', summary)
    return match.group(1) if match else None

# RUN SERVER

if __name__ == '__main__':
    print("Starting server on http://127.0.0.1:5000")
    print("Endpoints:")
    print("  GET /api/spotify/now-playing")
    print("  GET /api/spotify/queue")
    print("  GET /api/lastfm/top-artists")
    print("  GET /api/letterboxd/recent")
    app.run(host='0.0.0.0', port=5000, debug=True)