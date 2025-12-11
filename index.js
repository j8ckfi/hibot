const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!DISCORD_TOKEN) {
  console.error('Error: DISCORD_TOKEN environment variable is required');
  process.exit(1);
}

if (!GEMINI_API_KEY) {
  console.error('Error: GEMINI_API_KEY environment variable is required');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const MAX_MESSAGE_LENGTH = 2000;

function splitMessage(content) {
  if (content.length <= MAX_MESSAGE_LENGTH) {
    return [content];
  }

  const chunks = [];
  let currentChunk = '';

  const lines = content.split('\n');
  
  for (const line of lines) {
    if (currentChunk.length + line.length + 1 <= MAX_MESSAGE_LENGTH) {
      currentChunk += (currentChunk ? '\n' : '') + line;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      
      if (line.length > MAX_MESSAGE_LENGTH) {
        let remainingLine = line;
        while (remainingLine.length > MAX_MESSAGE_LENGTH) {
          chunks.push(remainingLine.substring(0, MAX_MESSAGE_LENGTH));
          remainingLine = remainingLine.substring(MAX_MESSAGE_LENGTH);
        }
        currentChunk = remainingLine;
      } else {
        currentChunk = line;
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

async function sendLongMessage(message, content) {
  const chunks = splitMessage(content);
  
  for (let i = 0; i < chunks.length; i++) {
    if (i === 0) {
      await message.reply(chunks[i]);
    } else {
      await message.channel.send(chunks[i]);
    }
  }
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.mentions.has(client.user)) return;

  const prompt = message.content.replace(/<@!?\d+>/g, '').trim();
  const username = message.author.username;
  
  if (!prompt) {
    await message.reply('Please provide a message after mentioning me.');
    return;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const transcript = `${username}: ${prompt}\nhibot:`;
    
    const result = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: '.' }] },
        { role: 'model', parts: [{ text: transcript }] }
      ]
    });

    const responseText = result.response.text();
    await sendLongMessage(message, responseText);
  } catch (error) {
    console.error('Error generating content:', error);
    await message.reply('Sorry, I encountered an error while processing your request.');
  }
});

client.login(DISCORD_TOKEN).catch((error) => {
  console.error('Failed to login to Discord:', error.message);
  process.exit(1);
});