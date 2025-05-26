import sequelize from "../databases/db.js";
import valkey from "./valkey.js";
import fs from 'fs/promises'
import os from 'os'
import readline from 'readline';
import path from "path"
import { fileURLToPath } from "url"
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const health = async (req, res) => {
    await sequelize.authenticate()
    const errLogs = await getLastLinesFromEnd(path.join(__dirname, '../logs', 'error.log'), 200, 'error');
    const combLogs = await getLastLinesFromEnd(path.join(__dirname, '../logs', 'combined.log'), 200, 'combined')
    return res.json({
        uptime: formatUptime(os.uptime()),
        processUptime: formatUptime(process.uptime()),
        memory: formatMemory(process.memoryUsage()),
        db: 'OK',
        valkey: await valkey.ping() && 'OK',
        errorLogs: parseLogFile(errLogs).reverse(),
        combinedLog: parseLogFile(combLogs).reverse(),
        totalMemory: formatBytes(os.totalmem()),
        freeMemory: formatBytes(os.freemem()),
        usedMemory: formatBytes(os.totalmem() - os.freemem()),

        
    })
}
export default health
function formatUptime(seconds) {
    const days = Math.floor(seconds / (60 * 60 * 24));
    const hours = Math.floor((seconds / (60 * 60)) % 24);
    const minutes = Math.floor((seconds / 60) % 60);
    const remainingSeconds = Math.floor(seconds % 60);
  
    return `${days}d ${hours}h ${minutes}m ${remainingSeconds}s`;
}

function formatMemory(memory) {
    return {
      rss: `${(memory.rss / 1024 / 1024).toFixed(1)} MB`,
      heapTotal: `${(memory.heapTotal / 1024 / 1024).toFixed(1)} MB`,
      heapUsed: `${(memory.heapUsed / 1024 / 1024).toFixed(1)} MB`,
      external: `${(memory.external / 1024 / 1024).toFixed(1)} MB`,
      arrayBuffers: `${(memory.arrayBuffers / 1024 / 1024).toFixed(1)} MB`,
    };
}
function formatBytes(bytes) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}


function parseLogFile(data) {
    // Удаление ANSI-цветов (например, \x1b[31m)
    const ansiRegex = /\x1b\[[0-9;]*m/g;
  
    // Регулярка для разбора строки лога
    const logRegex = /^\[(.+?)\]\s+.*?([a-zA-Z]+):\s+(.*)$/;
  
    return data
      .split('\n')
      .map(line => line.replace(ansiRegex, '').trim()) // удаляем ANSI и пробелы
      .map(line => {
        const match = line.match(logRegex);
        if (match) {
          return {
            timestamp: match[1],
            level: match[2].toLowerCase(),
            message: match[3]
          };
        }
        return null;
      })
      .filter(Boolean); // убираем null'ы
}

const getLastLinesFromEnd = async (filePath, lineCount, type, encoding = 'utf8') => {
    const stat = await fs.stat(filePath);
    const fileSize = stat.size;

    const bufferSize = 1024 * 1024;
    let position = fileSize;
    let leftover = '';
    let lines = [];

    const file = await fs.open(filePath, 'r');
    try {
        while (lines.length < lineCount && position > 0) {
            const readSize = Math.min(bufferSize, position);
            position -= readSize;

            const buffer = Buffer.alloc(readSize);
            await file.read(buffer, 0, readSize, position);
            const chunk = buffer.toString(encoding) + leftover;

            const chunkLines = chunk.split('\n');
            leftover = chunkLines.shift();

            for (let i = chunkLines.length - 1; i >= 0; i--) {
                const line = chunkLines[i].trim();

                if (line === '') {
                    continue;
                }

                if (type === 'combined' && line.includes('[31merror')) {
                    continue;
                }

                lines.unshift(line);

                if (lines.length >= lineCount) {
                    break;
                }
            }
        }
        while (lines.length < lineCount && leftover) {
            lines.unshift(leftover);
            leftover = '';
        }

        return lines.join('\n');
    } finally {
        await file.close();
    }
};

