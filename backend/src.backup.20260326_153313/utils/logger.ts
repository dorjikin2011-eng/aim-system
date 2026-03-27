export const logger = {
  info: (message: string, metadata?: any) => {
    console.log(`[INFO] ${message}`, metadata ? JSON.stringify(metadata, null, 2) : '');
  },
  
  error: (message: string, metadata?: any) => {
    console.error(`[ERROR] ${message}`, metadata ? JSON.stringify(metadata, null, 2) : '');
  },
  
  warn: (message: string, metadata?: any) => {
    console.warn(`[WARN] ${message}`, metadata ? JSON.stringify(metadata, null, 2) : '');
  },
  
  debug: (message: string, metadata?: any) => {
    console.debug(`[DEBUG] ${message}`, metadata ? JSON.stringify(metadata, null, 2) : '');
  }
};