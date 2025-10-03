// api/gorq.js - VERSÃO DESPERSONALIZADA
const fetch = require('node-fetch');

// 🔑 CHAVE DIRETO NO CÓDIGO (como fallback)
const HARDCODED_API_KEY = 'sua_chave_groq_aqui'; // ⚠️ SUBSTITUA PELA SUA CHAVE!

module.exports = async (req, res) => {
  // Configurações CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // 🔑 MÚLTIPLAS FONTES PARA A CHAVE
    let API_KEY = process.env.GROQ_API_KEY || HARDCODED_API_KEY;
    
    console.log('🔍 Status da chave:');
    console.log('- Variável de ambiente:', process.env.GROQ_API_KEY ? '✅' : '❌');
    console.log('- Chave hardcoded:', HARDCODED_API_KEY ? '✅' : '❌');
    console.log('- Chave final usada:', API_KEY ? '✅' : '❌');

    // 🔑 VERIFICAÇÃO DA CHAVE
    if (!API_KEY || API_KEY === 'sua_chave_groq_aqui') {
      return res.status(500).json({
        error: 'Chave API não configurada',
        details: 'Configure sua chave Groq API:',
        steps: [
          '1. Abra o arquivo api/gorq.js',
          '2. Localize: const HARDCODED_API_KEY',
          '3. Substitua "sua_chave_groq_aqui" pela sua chave da Groq',
          '4. A chave deve começar com gsk_...',
          '5. Faça commit e aguarde o deploy'
        ],
        help: 'Obtenha uma chave em: https://console.groq.com/keys'
      });
    }

    const cleanedKey = API_KEY.trim();
    
    // CONFIGURAÇÕES FIXAS
    const MODEL = 'gemma2-9b-it';
    const AI_NAME = 'Assistente';
    
    // PERSONALIDADE NEUTRA E NATURAL
    const AI_PERSONA = `Você é um assistente útil e amigável. Responda de forma natural e direta, sem oferecer serviços específicos ou usar botões. Seja educado e objetivo em suas respostas.`;

    // TRATAMENTO DO BODY
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    } catch (e) {
      body = {};
    }

    const prompt = body.prompt || '';
    const messageHistory = body.messageHistory || [];

    if (!prompt) {
      return res.status(400).json({ error: 'Envie um prompt. Exemplo: {"prompt": "olá"}' });
    }

    // CONSTRUIR MENSAGENS
    const messages = [
      { role: 'system', content: AI_PERSONA }
    ];

    // Adicionar histórico se existir
    if (Array.isArray(messageHistory)) {
      messageHistory.forEach(msg => {
        if (msg.role && msg.content) {
          messages.push({ role: msg.role, content: msg.content });
        }
      });
    }

    // Adicionar prompt atual
    messages.push({ role: 'user', content: prompt });

    const payload = {
      model: MODEL,
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
      top_p: 0.9
    };

    console.log('🔄 Enviando para Groq API...');
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanedKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // Verificar resposta HTTP
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro HTTP:', response.status, errorText);
      return res.status(400).json({
        error: `Erro ${response.status} na API Groq`,
        details: 'A chave API pode estar inválida ou expirada'
      });
    }

    const data = await response.json();

    // Verificar erro na resposta JSON
    if (data.error) {
      console.error('❌ Erro da Groq:', data.error);
      return res.status(400).json({
        error: data.error.message || 'Erro desconhecido da Groq',
        type: data.error.type
      });
    }

    const content = data.choices[0]?.message?.content || 'Sem resposta da IA';
    
    console.log('✅ Sucesso! IA respondeu.');
    
    return res.status(200).json({
      name: AI_NAME,
      content: content,
      usage: data.usage || {},
      raw: data
    });

  } catch (error) {
    console.error('💥 Erro crítico:', error);
    return res.status(500).json({
      error: 'Erro no servidor',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
