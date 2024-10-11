import { hostname } from 'os';

export const PORT = process.env.PORT || 6969;
export const DOMAIN_NAME = hostname();
export const MONGO_URI = "mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.3.2";