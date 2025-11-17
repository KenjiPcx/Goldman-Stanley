# Goldman Stanley - Quick Start

## 🚀 Run Locally

\`\`\`bash
cd goldman-stanley

# Install dependencies
pnpm install

# Start Convex backend (Terminal 1)
npx convex dev

# Start TanStack Start dev server (Terminal 2)
pnpm dev
\`\`\`

Visit **http://localhost:3000**

## 🔑 Environment Variables

Create \`.env.local\`:

\`\`\`env
# Convex
VITE_CONVEX_URL=your_convex_url
CONVEX_DEPLOYMENT=your_deployment

# Clerk Auth
VITE_CLERK_PUBLISHABLE_KEY=your_key
CLERK_SECRET_KEY=your_key

# AI
OPENAI_API_KEY=your_key
GOOGLE_GENERATIVE_AI_API_KEY=your_key

# Web Search
FIRECRAWL_API_KEY=your_key
\`\`\`

## 📝 Key Pages

- \`/\` - Landing page
- \`/research-chat\` - Chat interface
- \`/datasets\` - Dataset viewer

---

**Status**: ✅ Ready for hackathon!
