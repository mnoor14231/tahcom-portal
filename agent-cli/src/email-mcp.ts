import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import { Server, Tool } from '@modelcontextprotocol/sdk/server';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const server = new Server(
  {
    name: 'email-expert-mcp',
    version: '0.1.0',
    description: 'Email Expert MCP server: generate professional emails with Claude',
  },
  { capabilities: { tools: {} } }
);

server.tool(
  new Tool(
    'generateEmail',
    'Generate a professional email. Returns subject and HTML body.',
    {
      input: {
        type: 'object',
        properties: {
          context: { type: 'string', description: 'What the email is about, key points' },
          tone: { type: 'string', description: 'e.g., neutral professional, friendly, formal' },
          recipient: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              position: { type: 'string' },
              email: { type: 'string' },
            },
          },
          sender: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              position: { type: 'string' },
              email: { type: 'string' },
              signatureHtml: { type: 'string' },
            },
          },
        },
        required: ['context'],
      },
    },
    async ({ context, tone, recipient, sender }) => {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('Missing ANTHROPIC_API_KEY');
      }

      const prefaceLines: string[] = [];
      if (recipient?.name) prefaceLines.push(`Recipient name: ${recipient.name}`);
      if (recipient?.position) prefaceLines.push(`Recipient position: ${recipient.position}`);
      if (recipient?.email) prefaceLines.push(`Recipient email: ${recipient.email}`);
      if (sender?.name) prefaceLines.push(`Sender name: ${sender.name}`);
      if (sender?.position) prefaceLines.push(`Sender position: ${sender.position}`);
      if (sender?.email) prefaceLines.push(`Sender email: ${sender.email}`);
      const preface = prefaceLines.length ? `Context for personalization:\n${prefaceLines.join('\n')}\n\n` : '';

      const system = `You are a professional email writer.
Write concise, polite emails. Output ONLY valid JSON with keys: subject, bodyHtml. No explanations, no introductory text, just the JSON object.
Use the provided tone: ${tone || 'neutral professional'}.`;

      const msg = await anthropic.messages.create({
        model: 'claude-3.5-sonnet-latest',
        max_tokens: 800,
        temperature: 0.4,
        system,
        messages: [{ role: 'user', content: `${preface}${context}` }],
      });

      const text = (msg.content || [])
        .map((p: any) => (p.type === 'text' ? p.text : ''))
        .join('\n');

      let subject = 'Draft email';
      let bodyHtml = `<p>${context}</p>`;
      try {
        // Find JSON object boundaries more carefully
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          const jsonStr = text.substring(jsonStart, jsonEnd + 1);
          const parsed = JSON.parse(jsonStr);
          subject = parsed.subject || subject;
          bodyHtml = parsed.bodyHtml || bodyHtml;
        } else {
          // Fallback: try the old method
          const match = text.match(/\{[\s\S]*?\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            subject = parsed.subject || subject;
            bodyHtml = parsed.bodyHtml || bodyHtml;
          } else {
            bodyHtml = text ? `<p>${text.replace(/\n/g, '<br/>')}</p>` : bodyHtml;
          }
        }
      } catch (err) {
        console.error('Failed to parse AI response as JSON:', text);
        bodyHtml = text ? `<p>${text.replace(/\n/g, '<br/>')}</p>` : bodyHtml;
      }

      if (sender?.signatureHtml) bodyHtml = `${bodyHtml}${sender.signatureHtml}`;

      return { subject, bodyHtml };
    }
  )
);

server.start(new StdioServerTransport());


