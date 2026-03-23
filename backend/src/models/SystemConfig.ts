// backend/src/models/SystemConfig.ts
import { getDB, getAsync, allAsync, runAsync } from './db';
import { SystemConfigItem } from '../types/config';

export class SystemConfig {
  /**
   * Get all system configuration items
   */
  static async getAll(): Promise<SystemConfigItem[]> {
    const db = getDB();
    const rows = await allAsync<any>(
      db,
      'SELECT * FROM system_config ORDER BY category, config_key'
    );
    
    return rows.map(row => this.mapRowToConfig(row));
  }

  /**
   * Get configuration by key
   */
  static async getByKey(key: string): Promise<SystemConfigItem | null> {
    const db = getDB();
    const row = await getAsync<any>(
      db,
      'SELECT * FROM system_config WHERE config_key = ?',
      [key]
    );
    
    if (!row) return null;
    return this.mapRowToConfig(row);
  }

  /**
   * Get configuration by category
   */
  static async getByCategory(category: string): Promise<SystemConfigItem[]> {
    const db = getDB();
    const rows = await allAsync<any>(
      db,
      'SELECT * FROM system_config WHERE category = ? ORDER BY config_key',
      [category]
    );
    
    return rows.map(row => this.mapRowToConfig(row));
  }

  /**
   * Get system configuration value by key
   */
  static async getValue<T = any>(key: string, defaultValue?: T): Promise<T | null> {
    const config = await this.getByKey(key);
    
    if (!config) {
      return defaultValue || null;
    }
    
    // Parse value based on config type
    switch (config.configType) {
      case 'number':
        return Number(config.configValue) as T;
      case 'boolean':
        return (config.configValue === 'true' || config.configValue === '1') as T;
      case 'json':
        try {
          return JSON.parse(config.configValue) as T;
        } catch {
          return defaultValue || null;
        }
      case 'array':
        try {
          return JSON.parse(config.configValue) as T;
        } catch {
          return defaultValue || null;
        }
      default:
        return config.configValue as T;
    }
  }

  /**
   * Set system configuration value
   */
  static async setValue(
    key: string, 
    value: any, 
    configType: 'string' | 'number' | 'boolean' | 'json' | 'array' = 'string',
    category: string = 'general',
    description?: string,
    isPublic: boolean = false
  ): Promise<boolean> {
    const db = getDB();
    
    let stringValue: string;
    
    // Convert value to string based on type
    switch (configType) {
      case 'number':
        stringValue = String(value);
        break;
      case 'boolean':
        stringValue = value ? 'true' : 'false';
        break;
      case 'json':
      case 'array':
        stringValue = JSON.stringify(value);
        break;
      default:
        stringValue = String(value);
    }
    
    try {
      // Check if key exists
      const existing = await this.getByKey(key);
      
      if (existing) {
        // Update existing
        await runAsync(
          db,
          `UPDATE system_config SET 
            config_value = ?, config_type = ?, category = ?, 
            description = ?, is_public = ?, updated_at = CURRENT_TIMESTAMP 
           WHERE config_key = ?`,
          [stringValue, configType, category, description, isPublic ? 1 : 0, key]
        );
      } else {
        // Insert new
        await runAsync(
          db,
          `INSERT INTO system_config 
            (config_key, config_value, config_type, category, description, is_public) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [key, stringValue, configType, category, description, isPublic ? 1 : 0]
        );
      }
      
      return true;
    } catch (error) {
      console.error('Error setting system config:', error);
      return false;
    }
  }

  /**
   * Set multiple configuration values at once
   */
  static async setMultiple(configs: {
    key: string;
    value: any;
    type?: 'string' | 'number' | 'boolean' | 'json' | 'array';
    category?: string;
    description?: string;
    isPublic?: boolean;
  }[]): Promise<boolean> {
    const db = getDB();
    
    try {
      await runAsync(db, 'BEGIN TRANSACTION');
      
      for (const config of configs) {
        await this.setValue(
          config.key,
          config.value,
          config.type || 'string',
          config.category || 'general',
          config.description,
          config.isPublic || false
        );
      }
      
      await runAsync(db, 'COMMIT');
      return true;
    } catch (error) {
      await runAsync(db, 'ROLLBACK');
      console.error('Error setting multiple configs:', error);
      return false;
    }
  }

  /**
   * Delete configuration by key
   */
  static async delete(key: string): Promise<boolean> {
    const db = getDB();
    
    try {
      await runAsync(
        db,
        'DELETE FROM system_config WHERE config_key = ?',
        [key]
      );
      return true;
    } catch (error) {
      console.error('Error deleting system config:', error);
      return false;
    }
  }

  /**
   * Get integrity thresholds
   */
  static async getIntegrityThresholds(): Promise<{
    highIntegrityMin: number;
    mediumIntegrityMin: number;
  }> {
    const high = await this.getValue<number>('integrity.threshold.high', 70);
    const medium = await this.getValue<number>('integrity.threshold.medium', 50);
    
    return {
      highIntegrityMin: high || 70,
      mediumIntegrityMin: medium || 50
    };
  }

  /**
   * Set integrity thresholds
   */
  static async setIntegrityThresholds(
    highIntegrityMin: number,
    mediumIntegrityMin: number,
    updatedBy: string = 'system'
  ): Promise<boolean> {
    try {
      await this.setMultiple([
        {
          key: 'integrity.threshold.high',
          value: highIntegrityMin,
          type: 'number',
          category: 'scoring',
          description: 'High integrity threshold (≥ this value)',
          isPublic: true
        },
        {
          key: 'integrity.threshold.medium',
          value: mediumIntegrityMin,
          type: 'number',
          category: 'scoring',
          description: 'Medium integrity threshold (≥ this value)',
          isPublic: true
        }
      ]);
      
      // Log the change
      const db = getDB();
      await runAsync(
        db,
        `INSERT INTO audit_logs 
          (id, actor_id, actor_email, actor_name, actor_role, action, target_type, details)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `audit_${Date.now()}`,
          'system',
          'system@system',
          'System',
          'system_admin',
          'UPDATE',
          'system_config',
          JSON.stringify({
            action: 'update_integrity_thresholds',
            highIntegrityMin,
            mediumIntegrityMin,
            updatedBy
          })
        ]
      );
      
      return true;
    } catch (error) {
      console.error('Error setting integrity thresholds:', error);
      return false;
    }
  }

  /**
   * Get indicator weights
   */
  static async getIndicatorWeights(): Promise<Record<string, number>> {
    const weights: Record<string, number> = {};
    
    // Get all indicators and their weights
    const db = getDB();
    const rows = await allAsync<any>(
      db,
      'SELECT code, weight FROM indicators WHERE is_active = 1'
    );
    
    rows.forEach(row => {
      weights[row.code] = row.weight;
    });
    
    return weights;
  }

  /**
   * Calculate total weight
   */
  static async getTotalWeight(): Promise<number> {
    const db = getDB();
    const result = await getAsync<{ total: number }>(
      db,
      'SELECT SUM(weight) as total FROM indicators WHERE is_active = 1'
    );
    
    return result?.total || 0;
  }

  /**
   * Validate weights sum to 100
   */
  static async validateWeights(): Promise<{
    isValid: boolean;
    totalWeight: number;
    deviation: number;
    message?: string;
  }> {
    const totalWeight = await this.getTotalWeight();
    const deviation = Math.abs(totalWeight - 100);
    const isValid = deviation < 0.01; // Allow small floating point errors
    
    let message: string | undefined;
    
    if (!isValid) {
      if (totalWeight < 100) {
        message = `Total weight is ${totalWeight.toFixed(1)}%, needs ${(100 - totalWeight).toFixed(1)}% more`;
      } else {
        message = `Total weight is ${totalWeight.toFixed(1)}%, needs ${(totalWeight - 100).toFixed(1)}% less`;
      }
    }
    
    return { isValid, totalWeight, deviation, message };
  }

  /**
   * Get public configuration (for frontend)
   */
  static async getPublicConfig(): Promise<Record<string, any>> {
    const publicConfigs = await allAsync<any>(
      getDB(),
      'SELECT config_key, config_value, config_type FROM system_config WHERE is_public = 1'
    );
    
    const result: Record<string, any> = {};
    
    publicConfigs.forEach(config => {
      switch (config.config_type) {
        case 'number':
          result[config.config_key] = Number(config.config_value);
          break;
        case 'boolean':
          result[config.config_key] = config.config_value === 'true' || config.config_value === '1';
          break;
        case 'json':
        case 'array':
          try {
            result[config.config_key] = JSON.parse(config.config_value);
          } catch {
            result[config.config_key] = config.config_value;
          }
          break;
        default:
          result[config.config_key] = config.config_value;
      }
    });
    
    return result;
  }

  /**
   * Get system information
   */
  static async getSystemInfo(): Promise<{
    version: string;
    databaseVersion: string;
    totalIndicators: number;
    totalAssessments: number;
    totalAgencies: number;
    totalUsers: number;
  }> {
    const db = getDB();
    
    const [
      version,
      dbVersion,
      indicatorsCount,
      assessmentsCount,
      agenciesCount,
      usersCount
    ] = await Promise.all([
      this.getValue<string>('system.version', '2.0.0'),
      getAsync<{ version: string }>(db, 'SELECT sqlite_version() as version'),
      getAsync<{ count: number }>(db, 'SELECT COUNT(*) as count FROM indicators'),
      getAsync<{ count: number }>(db, 'SELECT COUNT(*) as count FROM assessments'),
      getAsync<{ count: number }>(db, 'SELECT COUNT(*) as count FROM agencies'),
      getAsync<{ count: number }>(db, 'SELECT COUNT(*) as count FROM users')
    ]);
    
    return {
      version: version || '2.0.0',
      databaseVersion: dbVersion?.version || 'unknown',
      totalIndicators: indicatorsCount?.count || 0,
      totalAssessments: assessmentsCount?.count || 0,
      totalAgencies: agenciesCount?.count || 0,
      totalUsers: usersCount?.count || 0
    };
  }

  /**
   * Map database row to SystemConfigItem
   */
  private static mapRowToConfig(row: any): SystemConfigItem {
    return {
      id: row.id,
      configKey: row.config_key,
      configValue: row.config_value,
      configType: row.config_type as 'string' | 'number' | 'boolean' | 'json' | 'array',
      category: row.category,
      description: row.description,
      isPublic: row.is_public === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Initialize default system configuration
   */
  static async initializeDefaults(): Promise<void> {
    const defaultConfigs = [
      {
        key: 'system.version',
        value: '2.0.0',
        type: 'string' as const,
        category: 'system',
        description: 'System version',
        isPublic: true
      },
      {
        key: 'integrity.threshold.high',
        value: 70,
        type: 'number' as const,
        category: 'scoring',
        description: 'High integrity threshold (≥ this value)',
        isPublic: true
      },
      {
        key: 'integrity.threshold.medium',
        value: 50,
        type: 'number' as const,
        category: 'scoring',
        description: 'Medium integrity threshold (≥ this value)',
        isPublic: true
      },
      {
        key: 'assessment.default_year',
        value: new Date().getFullYear().toString(),
        type: 'string' as const,
        category: 'assessment',
        description: 'Default assessment year',
        isPublic: true
      },
      {
        key: 'ui.theme',
        value: 'light',
        type: 'string' as const,
        category: 'ui',
        description: 'Default UI theme',
        isPublic: true
      },
      {
        key: 'assessment.auto_calculate',
        value: true,
        type: 'boolean' as const,
        category: 'assessment',
        description: 'Auto-calculate scores',
        isPublic: false
      },
      {
        key: 'email.notifications_enabled',
        value: true,
        type: 'boolean' as const,
        category: 'email',
        description: 'Enable email notifications',
        isPublic: false
      },
      {
        key: 'file.max_size_mb',
        value: 10,
        type: 'number' as const,
        category: 'file',
        description: 'Maximum file size in MB',
        isPublic: true
      },
      {
        key: 'file.allowed_types',
        value: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx'],
        type: 'array' as const,
        category: 'file',
        description: 'Allowed file types',
        isPublic: true
      }
    ];

    await this.setMultiple(defaultConfigs);
  }
}