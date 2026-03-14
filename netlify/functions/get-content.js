// netlify/functions/get-content.js
// Public endpoint - returns site content (events + texts)

exports.handler = async (event) => {
  const BIN_ID = process.env.JSONBIN_BIN_ID;
  const API_KEY = process.env.JSONBIN_API_KEY;

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (!BIN_ID || !API_KEY) {
    // Return default content if not configured yet
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(defaultContent()),
    };
  }

  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
      headers: { 'X-Master-Key': API_KEY },
    });

    if (!res.ok) {
      return { statusCode: 200, headers, body: JSON.stringify(defaultContent()) };
    }

    const data = await res.json();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data.record || defaultContent()),
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(defaultContent()),
    };
  }
};

function defaultContent() {
  return {
    events: [],
    texts: {
      'hero-title': 'GymJIMC',
      'hero-subtitle': 'Školní Minecraft server pro všechny.',
      'server-address': 'gymjimc.org',
      'join-intro': 'Připojit se může kdokoli – stačí mít Minecraft Java Edition a postupovat podle kroků níže.',
      'join-step4': 'Klikni <strong>Done</strong>, server se zobrazí v seznamu. Dvojklikem se připoj. Přijdou instrukce přímo ve hře. Užij si to!',
      'join-note': 'Máš problém s připojením? Zkus restartovat Minecraft nebo zkontroluj, zda máš správnou verzi. V případě problémů napiš správci serveru.',
      'vc-intro': 'Na serveru běží <strong>Simple Voice Chat</strong> mod – můžeš mluvit s ostatními hráči přímo ve hře pomocí mikrofonu, prostorově podle polohy.',
      'vc-desc': 'Aby voicechat fungoval, musíš si nainstalovat mod do svého Minecraftu. Vyber verzi podle svého modloaderu:',
      'vc-note': 'Voicechat je volitelný – bez modu se na server normálně připojíš, jen neuslyšíš ostatní a oni neuslyší tebe.',
    },
  };
}
