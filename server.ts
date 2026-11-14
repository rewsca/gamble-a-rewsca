import express from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createAiRouter() {
  const router = express.Router();
  router.use(express.json({ limit: '25mb' }));

  const getAiClient = () =>
    new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

  // 1. Search Grounding endpoint using gemini-3.8-flash + googleSearch tool
  router.post('/search', async (req, res) => {
    try {
      const { query, contextInfo } = req.body as {
        query?: string;
        contextInfo?: string;
      };
      if (!query || !query.trim()) {
        res.status(400).json({ error: 'Vui lòng nhập câu hỏi tra cứu.' });
        return;
      }

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Bạn là Cố Vấn Chiến Thuật của tựa game GAMBLE A BALL. Thông tin ngữ cảnh hiện tại: ${
          contextInfo || 'Đấu trường bóng 2D'
        }.\nCâu hỏi của người chơi: ${query}`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const chunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const sources = chunks
        .map((c: { web?: { uri?: string; title?: string } }) => c.web)
        .filter((w): w is { uri: string; title: string } => Boolean(w?.uri));

      res.json({
        text: response.text ?? 'Không có phản hồi.',
        sources,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Lỗi khi gọi Gemini API.';
      res.status(500).json({ error: message });
    }
  });

  // 2. Analyze Image using gemini-4-argon (with fallback if free key)
  router.post('/analyze-image', async (req, res) => {
    try {
      const { base64Data, mimeType, prompt } = req.body as {
        base64Data?: string;
        mimeType?: string;
        prompt?: string;
      };
      if (!base64Data || !mimeType) {
        res.status(400).json({ error: 'Thiếu dữ liệu hình ảnh tải lên.' });
        return;
      }

      const ai = getAiClient();
      const contents = {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          {
            text:
              prompt ||
              'Phân tích hình ảnh trận đấu hoặc nhân vật này trong GAMBLE A BALL và gợi ý chiến thuật đặt cược (Ai thắng, Lượng sát thương, Số va chạm, Máu còn lại).',
          },
        ],
      };

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-4-argon',
          contents,
        });
        res.json({ text: response.text ?? '', modelUsed: 'gemini-4-argon' });
      } catch {
        const fallbackResp = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
        });
        res.json({
          text: fallbackResp.text ?? '',
          modelUsed: 'gemini-3.8-flash',
        });
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Lỗi khi phân tích hình ảnh.';
      res.status(500).json({ error: message });
    }
  });

  // 3. Analyze Video using gemini-4-argon (with fallback if free key)
  router.post('/analyze-video', async (req, res) => {
    try {
      const { base64Data, mimeType, prompt } = req.body as {
        base64Data?: string;
        mimeType?: string;
        prompt?: string;
      };
      if (!base64Data || !mimeType) {
        res.status(400).json({ error: 'Thiếu dữ liệu video tải lên.' });
        return;
      }

      const ai = getAiClient();
      const contents = {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          {
            text:
              prompt ||
              'Phân tích diễn biến video trận đấu GAMBLE A BALL này: nhịp độ va chạm, cách dùng kỹ năng và tư vấn đặt cược tối ưu.',
          },
        ],
      };

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-4-argon',
          contents,
        });
        res.json({ text: response.text ?? '', modelUsed: 'gemini-4-argon' });
      } catch {
        const fallbackResp = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
        });
        res.json({
          text: fallbackResp.text ?? '',
          modelUsed: 'gemini-3.8-flash',
        });
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Lỗi khi phân tích video.';
      res.status(500).json({ error: message });
    }
  });

  return router;
}

// Nếu chạy trực tiếp node/tsx server.ts
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  app.use('/api/ai', createAiRouter());

  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GAMBLE A BALL server listening on port ${PORT}`);
  });
}
