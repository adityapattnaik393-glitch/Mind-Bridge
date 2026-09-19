/**
 * MINIMAL OFFLINE HANDLER
 * Saves game data locally, syncs when online
 */

class OfflineManager {
  constructor() {
    this.STORAGE_KEY = 'mindbridge_scores';
    this.init();
  }

  init() {
    // Check online/offline
    window.addEventListener('online', () => this.onlineDetected());
    window.addEventListener('offline', () => this.offlineDetected());
    
    // Show connection status
    this.showConnectionStatus();

    // Flush scores queued during an earlier network interruption as soon as
    // the dashboard is opened again.
    if (navigator.onLine) {
      this.syncScores().catch(error => console.log(`⚠️ Sync failed, will retry later: ${error.message}`));
    }
  }

  /**
   * Save game score locally
   */
  async saveGameScore(gameType, score, difficulty, durationSeconds) {
    const scoreData = {
      game_type: gameType,
      score: score,
      difficulty: difficulty,
      duration_seconds: durationSeconds,
      timestamp: new Date().toISOString(),
      synced: false
    };

    // Reach the database first. navigator.onLine can be false even when the
    // app server is reachable, which would otherwise hide online sessions in
    // localStorage and keep them out of both dashboards.
    try {
      const saved = await MB.api('/api/scores', {
        method: 'POST',
        body: JSON.stringify({
          name: gameType,
          score: score,
          difficulty: difficulty,
          durationSeconds: durationSeconds
        })
      });

      console.log('✅ Score saved to database:', saved);
      return saved;
    } catch (error) {
      // HTTP/API errors indicate a real server or schema problem and must be
      // shown to the user instead of being mislabeled as offline data.
      if (error && error.status) throw error;
    }
    
    const scores = this.getAllScores();
    scores.push(scoreData);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(scores));
    console.log('✅ Score saved offline:', scoreData);
    return scoreData;
  }

  /**
   * Get all saved scores
   */
  getAllScores() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Get unsynced scores
   */
  getUnsyncedScores() {
    const scores = this.getAllScores();
    return scores.filter(s => !s.synced);
  }

  /**
   * Sync scores to server when online
   */
  async syncScores() {
    if (!navigator.onLine) return;

    const unsynced = this.getUnsyncedScores();
    
    if (unsynced.length === 0) {
      console.log('✅ All scores synced');
      return;
    }

    console.log(`🔄 Syncing ${unsynced.length} scores...`);
    let lastError = null;

    for (const score of unsynced) {
      try {
        await MB.api('/api/scores', {
          method: 'POST',
          body: JSON.stringify({
            name: score.game_type,
            score: score.score,
            difficulty: score.difficulty,
            durationSeconds: score.duration_seconds
          })
        });

        this.markScoreSynced(score.timestamp);
        console.log(`✅ Synced: ${score.game_type}`);
      } catch (error) {
        lastError = error;
        console.log(`⚠️ Sync failed, will retry later: ${error.message}`);
      }
    }

    if (lastError) throw lastError;
  }

  /**
   * Mark score as synced
   */
  markScoreSynced(timestamp) {
    const scores = this.getAllScores();
    const updated = scores.map(s => {
      if (s.timestamp === timestamp) {
        s.synced = true;
      }
      return s;
    });
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
  }

  /**
   * Show connection status
   */
  showConnectionStatus() {
    if (navigator.onLine) {
      console.log('📡 Online - ready to sync');
    } else {
      console.log('📴 Offline - data will be saved locally');
      this.showOfflineNotification();
    }
  }

  /**
   * When internet comes back
   */
  onlineDetected() {
    console.log('📡 Connection restored! Syncing data...');
    this.showOnlineNotification();
    this.syncScores().catch(error => console.log(`⚠️ Sync failed, will retry later: ${error.message}`));
  }

  /**
   * When internet goes away
   */
  offlineDetected() {
    console.log('📴 No internet - continuing offline');
    this.showOfflineNotification();
  }

  /**
   * Show offline notification
   */
  showOfflineNotification() {
    const notification = document.getElementById('offline-notification');
    if (!notification) {
      const div = document.createElement('div');
      div.id = 'offline-notification';
      div.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #ff6b6b;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 9999;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      `;
      div.textContent = '📴 Offline Mode - Data saves locally';
      document.body.appendChild(div);

      setTimeout(() => div.remove(), 4000);
    }
  }

  /**
   * Show online notification
   */
  showOnlineNotification() {
    const notification = document.getElementById('online-notification');
    if (!notification) {
      const div = document.createElement('div');
      div.id = 'online-notification';
      div.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #51cf66;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 9999;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      `;
      div.textContent = '📡 Online - Syncing your data...';
      document.body.appendChild(div);

      setTimeout(() => div.remove(), 3000);
    }
  }

  /**
   * Get stats for dashboard
   */
  getOfflineStats() {
    const scores = this.getAllScores();
    const synced = scores.filter(s => s.synced).length;
    const unsynced = scores.filter(s => !s.synced).length;

    return {
      total: scores.length,
      synced,
      unsynced,
      scores
    };
  }
}

// Create global instance
window.offlineManager = new OfflineManager();

// Auto-sync when online
window.addEventListener('online', () => {
  setTimeout(() => window.offlineManager.syncScores(), 1000);
});