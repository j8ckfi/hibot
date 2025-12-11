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

    await message.reply(result.response.text());
  } catch (error) {
    console.error('Error generating content:', error);
    await message.reply('Sorry, I encountered an error while processing your request.');
  }
});

client.login(DISCORD_TOKEN).catch((error) => {
  console.error('Failed to login to Discord:', error.message);
  process.exit(1);
});