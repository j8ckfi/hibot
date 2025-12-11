const { Client, GatewayIntentBits } = require('discord.js');

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
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'model',
              parts: [{ text: `[Discord chat log]\n\n${username}: ${prompt}\n\nhibot:` }]
            }
          ]
        })
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'API request failed');
    }
    
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!reply) {
      throw new Error('No response from API');
    }
    
    const firstResponse = reply.split(/\n\n|\n\w+:/)[0].trim();
    
    await sendLongMessage(message, firstResponse);
  } catch (error) {
    console.error('Error generating content:', error);
    await message.reply('Sorry, I encountered an error while processing your request.');
  }
});

client.login(DISCORD_TOKEN).catch((error) => {
  console.error('Failed to login to Discord:', error.message);
  process.exit(1);
});