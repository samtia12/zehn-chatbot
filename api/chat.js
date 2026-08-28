export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Sirf POST allowed hai' });
  }

  try {
    const { messages } = req.body;

    const systemInstruction = {
      parts: [{
        text: 'Aap Zehn hain, ek premium study assistant. Hamesha usi zaban mein jawab dein jis mein user baat kare (English, Roman Urdu, ya Urdu script). Agar Urdu script mein likhna ho, to imla aur grammar bilkul sahi honi chahiye, koi ghalti na ho. Agar tasveer di jaye to usay analyze kar ke jawab dein.'
      }]
    };

    const contents = (messages || []).map(m => {
      const parts = (m.content || []).map(block => {
        if (block.type === 'text') {
          return { text: block.text };
        }
        if (block.type === 'image' && block.source) {
          return { inline_data: { mime_type: block.source.media_type, data: block.source.data } };
        }
        return null;
      }).filter(Boolean);
      return { role: m.role === 'assistant' ? 'model' : 'user', parts };
    });

    const apiKey = process.env.GEMINI_API_KEY;
    const model = 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: systemInstruction,
        contents: contents,
        tools: [{ google_search: {} }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Gemini API error' });
    }

    const candidate = data.candidates && data.candidates[0];
    const replyText = candidate?.content?.parts?.map(p => p.text).filter(Boolean).join('\n') || 'Maaf kijiye, jawab nahi mil saka.';

    return res.status(200).json({
      content: [{ type: 'text', text: replyText }]
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
