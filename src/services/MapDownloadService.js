import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

// Davao City boundaries (official geographic extent)
// Latitude: 6°58′ N to 7°34′ N (6.967° to 7.567°)
// Longitude: 125°14′ E to 125°40′ E (125.233° to 125.667°)
const DAVAO_BOUNDS = {
  north: 7.567,
  south: 6.967,
  east: 125.667,
  west: 125.233
};

// Zoom levels to download (higher = more detailed, more tiles)
const ZOOM_LEVELS = [10, 11, 12, 13, 14]; // City to street level

// OpenStreetMap tile URL template
const TILE_URL_TEMPLATE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

// Directory for cached map tiles
const TILES_DIR = `${FileSystem.documentDirectory}map_tiles/`;

class MapDownloadService {
  constructor() {
    this.isDownloading = false;
    this.downloadProgress = 0;
    this.totalTiles = 0;
    this.downloadedTiles = 0;
  }

  // Convert lat/lng to tile coordinates
  latLngToTile(lat, lng, zoom) {
    const n = Math.pow(2, zoom);
    const x = Math.floor(((lng + 180) / 360) * n);
    const y = Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n);
    return { x, y, z: zoom };
  }

  // Get all tile coordinates for Davao City at given zoom level
  getTilesForDavao(zoom) {
    const nw = this.latLngToTile(DAVAO_BOUNDS.north, DAVAO_BOUNDS.west, zoom);
    const se = this.latLngToTile(DAVAO_BOUNDS.south, DAVAO_BOUNDS.east, zoom);
    
    const tiles = [];
    const minX = Math.min(nw.x, se.x);
    const maxX = Math.max(nw.x, se.x);
    const minY = Math.min(nw.y, se.y);
    const maxY = Math.max(nw.y, se.y);
    
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        tiles.push({ x, y, z: zoom });
      }
    }
    
    console.log(`Zoom ${zoom}: Generated ${tiles.length} tiles (X: ${minX}-${maxX}, Y: ${minY}-${maxY})`);
    return tiles;
  }

  // Download a single tile
  async downloadTile(tile, onProgress) {
    const { x, y, z } = tile;
    const url = TILE_URL_TEMPLATE.replace('{z}', z).replace('{x}', x).replace('{y}', y);
    const filePath = `${TILES_DIR}${z}/${x}/${y}.png`;

    // Check if tile already exists
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (fileInfo.exists) {
      this.downloadedTiles++;
      if (onProgress) {
        onProgress({
          downloaded: this.downloadedTiles,
          total: this.totalTiles,
          percentage: Math.round((this.downloadedTiles / this.totalTiles) * 100)
        });
      }
      return true;
    }

    try {
      // Create directory if it doesn't exist
      const dirPath = `${TILES_DIR}${z}/${x}/`;
      await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });

      // Download tile
      const downloadResult = await FileSystem.downloadAsync(url, filePath);
      
      if (downloadResult.status === 200) {
        this.downloadedTiles++;
        if (onProgress) {
          onProgress({
            downloaded: this.downloadedTiles,
            total: this.totalTiles,
            percentage: Math.round((this.downloadedTiles / this.totalTiles) * 100)
          });
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error downloading tile ${z}/${x}/${y}:`, error);
      return false;
    }
  }

  // Download all map tiles for Davao City
  async downloadDavaoMaps(onProgress) {
    if (this.isDownloading) {
      console.log('Download already in progress');
      return { success: false, error: 'Download already in progress' };
    }

    this.isDownloading = true;
    this.downloadedTiles = 0;

    try {
      // Ensure tiles directory exists
      await FileSystem.makeDirectoryAsync(TILES_DIR, { intermediates: true });

      // Get all tiles for all zoom levels
      const allTiles = [];
      for (const zoom of ZOOM_LEVELS) {
        const tiles = this.getTilesForDavao(zoom);
        allTiles.push(...tiles);
      }

      this.totalTiles = allTiles.length;
      console.log(`Total tiles to download: ${this.totalTiles}`);

      // Download tiles in batches to avoid overwhelming the server
      const BATCH_SIZE = 5;
      for (let i = 0; i < allTiles.length; i += BATCH_SIZE) {
        const batch = allTiles.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(tile => this.downloadTile(tile, onProgress)));
        
        // Small delay between batches to be respectful to OSM servers
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Mark as downloaded in AsyncStorage
      await AsyncStorage.setItem('mapsDownloaded', 'true');
      await AsyncStorage.setItem('mapsDownloadDate', new Date().toISOString());

      this.isDownloading = false;
      return { success: true, tilesDownloaded: this.totalTiles };
    } catch (error) {
      console.error('Error downloading maps:', error);
      this.isDownloading = false;
      return { success: false, error: error.message };
    }
  }

  // Check if maps are already downloaded
  async areMapsDownloaded() {
    try {
      const downloaded = await AsyncStorage.getItem('mapsDownloaded');
      return downloaded === 'true';
    } catch (error) {
      console.error('Error checking maps status:', error);
      return false;
    }
  }

  // Check if user has been prompted to download maps
  async hasBeenPrompted() {
    try {
      const prompted = await AsyncStorage.getItem('mapDownloadPrompted');
      return prompted === 'true';
    } catch (error) {
      return false;
    }
  }

  // Mark user as prompted
  async markAsPrompted() {
    try {
      await AsyncStorage.setItem('mapDownloadPrompted', 'true');
    } catch (error) {
      console.error('Error marking as prompted:', error);
    }
  }

  // Clear all downloaded maps
  async clearMaps() {
    try {
      const dirInfo = await FileSystem.getInfoAsync(TILES_DIR);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(TILES_DIR, { idempotent: true });
      }
      await AsyncStorage.removeItem('mapsDownloaded');
      await AsyncStorage.removeItem('mapsDownloadDate');
      return { success: true };
    } catch (error) {
      console.error('Error clearing maps:', error);
      return { success: false, error: error.message };
    }
  }

  // Get download info
  async getDownloadInfo() {
    try {
      const downloaded = await AsyncStorage.getItem('mapsDownloaded');
      const downloadDate = await AsyncStorage.getItem('mapsDownloadDate');
      const prompted = await AsyncStorage.getItem('mapDownloadPrompted');

      return {
        isDownloaded: downloaded === 'true',
        downloadDate: downloadDate ? new Date(downloadDate) : null,
        hasBeenPrompted: prompted === 'true'
      };
    } catch (error) {
      console.error('Error getting download info:', error);
      return {
        isDownloaded: false,
        downloadDate: null,
        hasBeenPrompted: false
      };
    }
  }

  // Get estimated download size (in MB)
  getEstimatedSize() {
    const tilesPerZoom = ZOOM_LEVELS.map(zoom => {
      const tiles = this.getTilesForDavao(zoom);
      return tiles.length;
    });
    const totalTiles = tilesPerZoom.reduce((sum, count) => sum + count, 0);
    const avgTileSize = 15; // KB
    return ((totalTiles * avgTileSize) / 1024).toFixed(1); // Convert to MB
  }
}

export default new MapDownloadService();
