import fs from 'fs';
import { printSchema } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from './dist/graphql/typeDefs.js';

const schema = makeExecutableSchema({ typeDefs });
const sdl = printSchema(schema);

fs.writeFileSync('schema.graphql', sdl);
console.log('Schema exported to schema.graphql');
