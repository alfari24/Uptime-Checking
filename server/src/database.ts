import Database from 'better-sqlite3';
import { join } from 'path';

export interface MonitorStateDB {
  lastUpdate: number;
  overallUp: number;
  overallDown: number;
}

export interface IncidentDB {
  id: string;
  monitorId: string;
  start: number;
  end: number | null;
  error: string;
}

export interface LatencyDB {
  id: string;
  monitorId: string;
  location: string;
  ping: number;
  timestamp: number;
}

export class StatusDatabase {
  private db: Database.Database;

  constructor(dbPath: string = join(process.cwd(), 'status.db')) {
    this.db = new Database(dbPath);
    this.initializeSchema();
  }

  private initializeSchema() {
    // Create tables if they don't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS monitor_state (
        id INTEGER PRIMARY KEY,
        lastUpdate INTEGER NOT NULL,
        overallUp INTEGER NOT NULL,
        overallDown INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY,
        monitorId TEXT NOT NULL,
        start INTEGER NOT NULL,
        end INTEGER,
        error TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      CREATE TABLE IF NOT EXISTS latency (
        id TEXT PRIMARY KEY,
        monitorId TEXT NOT NULL,
        location TEXT NOT NULL,
        ping INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      CREATE INDEX IF NOT EXISTS idx_incidents_monitor ON incidents(monitorId);
      CREATE INDEX IF NOT EXISTS idx_incidents_start ON incidents(start);
      CREATE INDEX IF NOT EXISTS idx_latency_monitor ON latency(monitorId);
      CREATE INDEX IF NOT EXISTS idx_latency_timestamp ON latency(timestamp);
    `);

    // Initialize monitor state if not exists
    const stateCount = this.db.prepare('SELECT COUNT(*) as count FROM monitor_state').get() as { count: number };
    if (stateCount.count === 0) {
      this.db.prepare(`
        INSERT INTO monitor_state (lastUpdate, overallUp, overallDown)
        VALUES (0, 0, 0)
      `).run();
    }
  }

  // Monitor State operations
  getMonitorState(): MonitorStateDB {
    return this.db.prepare('SELECT * FROM monitor_state ORDER BY id DESC LIMIT 1').get() as MonitorStateDB;
  }

  updateMonitorState(state: Omit<MonitorStateDB, 'id'>) {
    this.db.prepare(`
      UPDATE monitor_state 
      SET lastUpdate = ?, overallUp = ?, overallDown = ?
      WHERE id = 1
    `).run(state.lastUpdate, state.overallUp, state.overallDown);
  }

  // Incident operations
  getIncidents(monitorId: string): IncidentDB[] {
    return this.db.prepare(`
      SELECT * FROM incidents 
      WHERE monitorId = ? 
      ORDER BY start DESC
    `).all(monitorId) as IncidentDB[];
  }

  getLatestIncident(monitorId: string): IncidentDB | null {
    return this.db.prepare(`
      SELECT * FROM incidents 
      WHERE monitorId = ? 
      ORDER BY start DESC 
      LIMIT 1
    `).get(monitorId) as IncidentDB | null;
  }

  createIncident(incident: Omit<IncidentDB, 'id'>) {
    const id = `${incident.monitorId}-${incident.start}`;
    this.db.prepare(`
      INSERT OR REPLACE INTO incidents (id, monitorId, start, end, error)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, incident.monitorId, incident.start, incident.end, incident.error);
  }

  updateIncident(id: string, updates: Partial<IncidentDB>) {
    const setParts = [];
    const values = [];
    
    if (updates.end !== undefined) {
      setParts.push('end = ?');
      values.push(updates.end);
    }
    if (updates.error !== undefined) {
      setParts.push('error = ?');
      values.push(updates.error);
    }
    
    if (setParts.length > 0) {
      values.push(id);
      this.db.prepare(`
        UPDATE incidents 
        SET ${setParts.join(', ')} 
        WHERE id = ?
      `).run(...values);
    }
  }

  // Latency operations
  getLatency(monitorId: string, hours: number = 12): LatencyDB[] {
    const cutoffTime = Math.floor(Date.now() / 1000) - (hours * 60 * 60);
    return this.db.prepare(`
      SELECT * FROM latency 
      WHERE monitorId = ? AND timestamp > ?
      ORDER BY timestamp ASC
    `).all(monitorId, cutoffTime) as LatencyDB[];
  }

  getLatestLatency(monitorId: string): LatencyDB | null {
    return this.db.prepare(`
      SELECT * FROM latency 
      WHERE monitorId = ? 
      ORDER BY timestamp DESC 
      LIMIT 1
    `).get(monitorId) as LatencyDB | null;
  }

  addLatency(latency: Omit<LatencyDB, 'id'>) {
    // Menggunakan timestamp yang lebih presisi (mikrodetik) untuk menghindari duplikasi ID
    const id = `${latency.monitorId}-${latency.timestamp}-${Date.now()}`;
    this.db.prepare(`
      INSERT INTO latency (id, monitorId, location, ping, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, latency.monitorId, latency.location, latency.ping, latency.timestamp);
  }

  // Cleanup old data
  cleanupOldData(daysToKeep: number = 90) {
    const cutoffTime = Math.floor(Date.now() / 1000) - (daysToKeep * 24 * 60 * 60);
    
    // Clean up old incidents
    this.db.prepare(`
      DELETE FROM incidents 
      WHERE end IS NOT NULL AND end < ?
    `).run(cutoffTime);
    
    // Clean up old latency data
    this.db.prepare(`
      DELETE FROM latency 
      WHERE timestamp < ?
    `).run(cutoffTime);
  }

  close() {
    this.db.close();
  }
}

export default StatusDatabase;