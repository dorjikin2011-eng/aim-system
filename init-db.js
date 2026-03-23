import { runDatabaseInitialization } from './backend/src/models/db.js'; 
runDatabaseInitialization().then(success => {
  if (success) process.exit(0);
  else process.exit(1);
});
