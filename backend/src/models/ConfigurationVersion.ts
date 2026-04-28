// backend/src/models/ConfigurationVersion.ts

import { getDB, allAsync, runAsync, getAsync } from './db';

export interface ConfigurationVersion {
  id: number;
  versionName: string;
  versionNumber: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  appliedAt?: string;
  createdBy?: string;
  snapshotData?: any;
}

export class ConfigurationVersionModel {
  
  static async ensureTable(): Promise<void> {
    const db = getDB();
    await runAsync(
      db,
      `CREATE TABLE IF NOT EXISTS configuration_versions (
        id SERIAL PRIMARY KEY,
        version_name VARCHAR(255) NOT NULL,
        version_number VARCHAR(50) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        applied_at TIMESTAMP,
        created_by VARCHAR(100),
        snapshot_data JSONB
      )`
    );
  }

  static async getAll(): Promise<ConfigurationVersion[]> {
    try {
      await this.ensureTable();
      const db = getDB();
      const rows = await allAsync<any>(
        db,
        `SELECT 
          id,
          version_name as "versionName",
          version_number as "versionNumber",
          description,
          is_active as "isActive",
          created_at as "createdAt",
          applied_at as "appliedAt",
          created_by as "createdBy",
          snapshot_data as "snapshotData"
        FROM configuration_versions 
        ORDER BY created_at DESC`
      );
      
      return rows.map(row => ({
        id: row.id,
        versionName: row.versionName,
        versionNumber: row.versionNumber,
        description: row.description,
        isActive: row.isActive === true,
        createdAt: row.createdAt,
        appliedAt: row.appliedAt,
        createdBy: row.createdBy,
        snapshotData: row.snapshotData
      }));
    } catch (error) {
      console.error('Error getting versions:', error);
      return [];
    }
  }

  static async create(data: {
    version_name: string;
    version_number: string;
    description?: string;
    created_by?: string;
    snapshot_data: any;
  }): Promise<ConfigurationVersion | null> {
    try {
      await this.ensureTable();
      const db = getDB();
      
      await runAsync(
        db,
        `INSERT INTO configuration_versions (
          version_name, version_number, description, 
          created_by, snapshot_data, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          data.version_name,
          data.version_number,
          data.description || '',
          data.created_by || 'admin',
          JSON.stringify(data.snapshot_data),
          false
        ]
      );
      
      // Get all versions and return the most recent one
      const versions = await this.getAll();
      return versions.length > 0 ? versions[0] : null;
    } catch (error) {
      console.error('Error creating version:', error);
      return null;
    }
  }

  static async apply(id: number): Promise<boolean> {
    try {
      await this.ensureTable();
      const db = getDB();
      
      // Deactivate all versions
      await runAsync(db, 'UPDATE configuration_versions SET is_active = false');
      
      // Activate this version
      await runAsync(
        db,
        `UPDATE configuration_versions 
         SET is_active = true, applied_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [id]
      );
      
      return true;
    } catch (error) {
      console.error('Error applying version:', error);
      return false;
    }
  }

  static async getActive(): Promise<ConfigurationVersion | null> {
    try {
      await this.ensureTable();
      const db = getDB();
      const row = await getAsync<any>(
        db,
        `SELECT 
          id,
          version_name as "versionName",
          version_number as "versionNumber",
          description,
          is_active as "isActive",
          created_at as "createdAt",
          applied_at as "appliedAt",
          created_by as "createdBy",
          snapshot_data as "snapshotData"
        FROM configuration_versions 
        WHERE is_active = true
        LIMIT 1`
      );
      
      if (!row) return null;
      
      return {
        id: row.id,
        versionName: row.versionName,
        versionNumber: row.versionNumber,
        description: row.description,
        isActive: row.isActive === true,
        createdAt: row.createdAt,
        appliedAt: row.appliedAt,
        createdBy: row.createdBy,
        snapshotData: row.snapshotData
      };
    } catch (error) {
      console.error('Error getting active version:', error);
      return null;
    }
  }
}
