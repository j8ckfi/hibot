client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.mentions.has(client.user)) return;
  
    const prompt = message.content.replace(/<@!?\d+>/g, '').trim();
    const username = message.author.username;
    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const transcript = `${username}: ${prompt}\nhibot:`;
    
    const result = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: '.' }] },  // minimal trigger
        { role: 'model', parts: [{ text: transcript }] }
      ]
    });
  
    await message.reply(result.response.text());
  });