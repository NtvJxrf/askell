import Client from './src/utils/got.js';
import dotenv from 'dotenv';
dotenv.config();

const res = await Client.sklad()