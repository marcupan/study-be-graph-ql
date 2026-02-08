import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

const envVarsSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(4000),
  JWT_SECRET: Joi.string().required().description('JWT secret key'),
  MONGODB_URI: Joi.string().required().description('Mongo DB url'),
  CLIENT_ORIGINS: Joi.string().default('http://localhost:3000'),
  REQUEST_BODY_LIMIT: Joi.string().default('1mb'),
}).unknown();

const { value: envVars, error } = envVarsSchema
  .prefs({ errors: { label: 'key' } })
  .validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const clientOrigins = envVars.CLIENT_ORIGINS.split(',')
  .map((origin: string) => origin.trim())
  .filter(Boolean);

export const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  jwt: {
    secret: envVars.JWT_SECRET,
  },
  mongoose: {
    url: envVars.MONGODB_URI,
  },
  cors: {
    origins: clientOrigins.length > 0 ? clientOrigins : ['http://localhost:3000'],
  },
  http: {
    bodyLimit: envVars.REQUEST_BODY_LIMIT,
  },
};
