import { Options } from '@mikro-orm/core';

const config: Options = {
    entities: [
        'dist/database/entities/*.js',
    ],
    entitiesTs: [
        'src/database/entities/*.ts',
    ],
    type: 'sqlite',
    host: 'file:./database.sqlite',
    dbName: 'database.sqlite',
    debug: true
  };
  
export default config;