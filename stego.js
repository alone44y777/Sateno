// Dark Empire Steganography & Spy-Detect API
// Power by Dark Empire | Owner: Sardar Daud Arain

const ZERO = '\u200B'; // 0 (Zero-Width Space)
const ONE  = '\u200C'; // 1 (Zero-Width Non-Joiner)
const SEP  = '\u200D'; // Boundary Marker (Zero-Width Joiner)

// All common invisible / spy Unicode characters
const INVISIBLE_REGEX = /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g;

// Pic Stego Markers (Appended safely after image EOF)
const PIC_START = Buffer.from('::DARK_EMPIRE_STEGO_START::');
const PIC_END   = Buffer.from('::DARK_EMPIRE_STEGO_END::');

const BRANDING = {
  power_by: 'Dark Empire',
  owner: 'Sardar Daud Arain'
};

// Convert UTF-8 string to zero-width invisible string
function textToZeroWidth(secret) {
  const bytes = Buffer.from(secret, 'utf8');
  let binary = '';
  for (const byte of bytes) {
    binary += byte.toString(2).padStart(8, '0');
  }
  const hidden = binary
    .split('')
    .map(bit => (bit === '0' ? ZERO : ONE))
    .join('');
  return SEP + hidden + SEP;
}

// Extract and decode zero-width invisible string
function zeroWidthToText(text) {
  const startIdx = text.indexOf(SEP);
  const endIdx = text.lastIndexOf(SEP);
  if (startIdx === -1 || endIdx === -1 || startIdx === endIdx) {
    return null;
  }

  const hidden = text.slice(startIdx + 1, endIdx);
  let binary = '';
  for (const ch of hidden) {
    if (ch === ZERO) binary += '0';
    else if (ch === ONE) binary += '1';
  }

  if (!binary || binary.length % 8 !== 0) return null;

  const bytes = [];
  for (let i = 0; i < binary.length; i += 8) {
    bytes.push(parseInt(binary.slice(i, i + 8), 2));
  }

  return Buffer.from(bytes).toString('utf8');
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const data = req.method === 'POST' ? (req.body || {}) : (req.query || {});
  const action = (data.action || '').toLowerCase().trim();

  try {
    // 1. ENCODE (Text mein secret chhupana)
    if (action === 'encode') {
      const { cover, secret } = data;
      if (!cover || !secret) {
        return res.status(400).json({
          status: false,
          error: 'cover aur secret dono required hain.',
          branding: BRANDING
        });
      }

      const hiddenStr = textToZeroWidth(String(secret));
      const result = cover.slice(0, 1) + hiddenStr + cover.slice(1);

      return res.status(200).json({
        status: true,
        action: 'encode',
        result,
        branding: BRANDING
      });
    }

    // 2. DECODE (Text se secret nikalna)
    if (action === 'decode') {
      const { text } = data;
      if (!text) {
        return res.status(400).json({
          status: false,
          error: 'text parameter required hai.',
          branding: BRANDING
        });
      }

      const secret = zeroWidthToText(String(text));
      if (secret === null) {
        return res.status(200).json({
          status: false,
          action: 'decode',
          message: 'Is text mein koi hidden Dark Empire secret nahi mila.',
          branding: BRANDING
        });
      }

      return res.status(200).json({
        status: true,
        action: 'decode',
        secret,
        branding: BRANDING
      });
    }

    // 3. SPY DETECT (Hidden tracking / invisible chars pakarna)
    if (action === 'detect') {
      const { text } = data;
      if (!text) {
        return res.status(400).json({
          status: false,
          error: 'text parameter required hai.',
          branding: BRANDING
        });
      }

      const matches = String(text).match(INVISIBLE_REGEX) || [];
      const isSpyDetected = matches.length > 0;
      const uniqueCodes = [...new Set(matches.map(c => 'U+' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')))];
      const previewDecode = zeroWidthToText(String(text));

      return res.status(200).json({
        status: true,
        action: 'detect',
        spy_detected: isSpyDetected,
        risk_level: isSpyDetected ? 'HIGH (Hidden Data Found)' : 'SAFE (Clean Text)',
        hidden_char_count: matches.length,
        detected_unicodes: uniqueCodes,
        auto_decoded_preview: previewDecode || null,
        branding: BRANDING
      });
    }

    // 4. CLEAN TEXT (Saare invisible/spy characters khatam karna)
    if (action === 'clean') {
      const { text } = data;
      if (!text) {
        return res.status(400).json({
          status: false,
          error: 'text parameter required hai.',
          branding: BRANDING
        });
      }

      const original = String(text);
      const removedCount = (original.match(INVISIBLE_REGEX) || []).length;
      const cleaned = original.replace(INVISIBLE_REGEX, '');

      return res.status(200).json({
        status: true,
        action: 'clean',
        removed_hidden_chars: removedCount,
        clean_text: cleaned,
        branding: BRANDING
      });
    }

    // 5. PIC ENCODE (Image Base64 mein secret text chhupana - POST only)
    if (action === 'pic_encode') {
      const { image_base64, secret } = data;
      if (!image_base64 || !secret) {
        return res.status(400).json({
          status: false,
          error: 'image_base64 aur secret dono required hain (POST use karein).',
          branding: BRANDING
        });
      }

      let prefix = '';
      let rawBase64 = String(image_base64);
      if (rawBase64.includes(',')) {
        const parts = rawBase64.split(',');
        prefix = parts[0] + ',';
        rawBase64 = parts[1];
      }

      const imgBuffer = Buffer.from(rawBase64, 'base64');
      const secretBuffer = Buffer.from(String(secret), 'utf8');

      const combined = Buffer.concat([imgBuffer, PIC_START, secretBuffer, PIC_END]);

      return res.status(200).json({
        status: true,
        action: 'pic_encode',
        image_base64: prefix + combined.toString('base64'),
        branding: BRANDING
      });
    }

    // 6. PIC DECODE (Image Base64 se chhupa hua secret nikalna - POST only)
    if (action === 'pic_decode') {
      const { image_base64 } = data;
      if (!image_base64) {
        return res.status(400).json({
          status: false,
          error: 'image_base64 required hai (POST use karein).',
          branding: BRANDING
        });
      }

      let rawBase64 = String(image_base64);
      if (rawBase64.includes(',')) {
        rawBase64 = rawBase64.split(',')[1];
      }

      const imgBuffer = Buffer.from(rawBase64, 'base64');
      const startIdx = imgBuffer.indexOf(PIC_START);
      const endIdx = imgBuffer.indexOf(PIC_END);

      if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
        return res.status(200).json({
          status: false,
          action: 'pic_decode',
          message: 'Is image mein koi hidden Dark Empire data nahi mila.',
          branding: BRANDING
        });
      }

      const secretBuf = imgBuffer.subarray(startIdx + PIC_START.length, endIdx);
      const finalSecret = secretBuf.toString('utf8');

      return res.status(200).json({
        status: true,
        action: 'pic_decode',
        secret: finalSecret,
        branding: BRANDING
      });
    }

    // Default Info Route
    return res.status(200).json({
      status: true,
      api_name: 'Dark Empire Steganography & Spy Detector API',
      endpoints: {
        encode: 'GET/POST /api/stego?action=encode&cover=Salam&secret=VIP',
        decode: 'GET/POST /api/stego?action=decode&text=...',
        detect: 'GET/POST /api/stego?action=detect&text=...',
        clean:  'GET/POST /api/stego?action=clean&text=...',
        pic_encode: 'POST /api/stego { action: "pic_encode", image_base64, secret }',
        pic_decode: 'POST /api/stego { action: "pic_decode", image_base64 }'
      },
      branding: BRANDING
    });

  } catch (err) {
    return res.status(500).json({
      status: false,
      error: 'Internal Server Error: ' + err.message,
      branding: BRANDING
    });
  }
}
