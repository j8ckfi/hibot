const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.mentions.has(client.user)) return;

  const prompt = message.content.replace(/<@!?\d+>/g, '').trim();
  
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  
  // Prefill goes here - start the response with whatever you want
  const prefill = ""; // e.g. "{" for JSON, or a personality opener
  
  const result = await model.generateContent({
    contents: [
      { role: 'user', parts: [{ text: prompt }] },
      { role: 'model', parts: [{ text: prefill }] }
    ]
  });

  await message.reply(prefill + result.response.text());
});

client.login(process.env.DISCORD_TOKEN);