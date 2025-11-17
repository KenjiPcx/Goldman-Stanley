# Goldman Stanley

> **Never do knowledge work again.**

Goldman Stanley is an AI-powered batch research platform that executes parallel research tasks like having an entire team at Goldman Sachs, JP Morgan, or Morgan Stanley working for you. Built for the **TanStack Convex Hackathon**.

![Goldman Stanley](https://img.shields.io/badge/TanStack-Start-blue) ![Convex](https://img.shields.io/badge/Convex-Powered-green) ![AI Agents](https://img.shields.io/badge/AI-Agents-purple)

## 🎯 What is Goldman Stanley?

Goldman Stanley is a platform where you can give a prompt and our AI agents will conduct deep, structured research in parallel across hundreds of targets. It's like having an elite research team at your fingertips—powered by Convex workflows, AI agents, and real-time orchestration.

### Practical Use Cases

- **Market Research**: Research 100 companies simultaneously to identify acquisition targets
- **Competitive Analysis**: Analyze competitors across multiple dimensions in parallel
- **Lead Generation**: Enrich and qualify leads at scale with AI-powered research
- **Due Diligence**: Conduct parallel research on investment opportunities
- **Knowledge Extraction**: Extract structured data from unstructured sources at scale

## ✨ Features

### 🤖 AI-Powered Batch Research
- **Parallel Execution**: Process hundreds of research tasks simultaneously
- **Intelligent Orchestration**: Convex workflows handle rate limiting, retries, and chunking
- **Deep Research**: Multi-step agent workflows with web search, data extraction, and Python analysis

### 💬 Research Chat Interface
- **Natural Language Prompts**: Chat with AI to define your research needs
- **Tool Integration**: Agents propose batch research plans directly in chat
- **Real-time Streaming**: Watch results come in as they're generated
- **File Upload**: Upload Excel/CSV files to define research targets

### 📊 Dataset Viewer
- **Structured Results**: View research results in interactive tables
- **Real-time Updates**: See progress as agents complete each task
- **Export Options**: Download results as CSV for further analysis
- **Rich Metadata**: Track citations, status, and execution details

### ✅ Quality Review System
- **Custom Rubrics**: Define evaluation criteria with weights and passing scores
- **AI Quality Control**: Reviewer agent evaluates research against your rubric
- **Automatic Retries**: Failed reviews get actionable feedback and retry
- **Analytics**: Track usage, average scores, and pass rates per config

### 🔄 Convex Workflows
- **Long-running Orchestration**: Research can run for hours without timeouts
- **Event-driven**: Agents trigger next steps automatically
- **Fault-tolerant**: Automatic retries and error handling
- **Rate Limiting**: Intelligent concurrency management

## 🛠️ Tech Stack

### Frontend
- **TanStack Start**: Modern React framework with file-based routing
- **React 19**: Latest React features
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Beautiful, accessible components
- **Convex React**: Real-time subscriptions and optimistic updates

### Backend
- **Convex**: Serverless backend platform
  - `@convex-dev/agent`: AI agent framework
  - `@convex-dev/workflow`: Long-running workflows
  - `@convex-dev/workpool`: Parallel task execution
- **AI SDK**: Vercel AI SDK for model integration
  - Google Gemini 2.5 (Flash & Pro)
  - OpenAI (Embeddings)
- **Firecrawl**: Web search and data extraction
- **Python Interpreter**: Execute Python code in agents

### Key Libraries
- **Clerk**: Authentication
- **next-themes**: Theme management
- **lucide-react**: Icon library
- **sonner**: Toast notifications
- **xlsx**: Excel file processing

## 🏗️ Architecture

### Convex Tables
```
batchTaskOrchestrations → datasets → datasetRows → datasetCells
                                                  ↓
                      taskExecutions → taskExecutionSteps
                                    ↓
                              delegations
```

### Agent System
- **User Proxy Agent**: Chat interface with `proposeWideResearch` tool
- **Deep Research Agent**: Multi-step research with delegation
  - **Sub-researcher Agents**: Specialized research tasks
  - **Tools**: Web search, Python interpreter, scratchpad, dataset tools

### Workflow Orchestration
1. **Batch Creation**: User proposes research via chat
2. **Orchestrator Workflow**: Chunks targets and manages concurrency
3. **Task Execution Workflows**: Individual research tasks run in parallel
4. **Agent Steps**: Agents use tools to conduct research
5. **Results Aggregation**: Structured data saved to datasets
6. **Completion Notification**: Results sent back to chat thread

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm (recommended)
- Convex account
- Clerk account
- OpenAI API key
- Firecrawl API key (for web search)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/goldman-stanley.git
cd goldman-stanley

# Install dependencies
pnpm install

# Set up Convex
npx convex init
npx convex dev
```

### Environment Variables

Create a `.env.local` file:

```env
# Convex
VITE_CONVEX_URL=your_convex_url
CONVEX_DEPLOYMENT=your_deployment_name

# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# AI Models
OPENAI_API_KEY=your_openai_api_key
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_key

# Web Search & Extraction
FIRECRAWL_API_KEY=your_firecrawl_api_key
```

### Run Development Server

```bash
# Terminal 1: Start Convex backend
npx convex dev

# Terminal 2: Start TanStack Start dev server
pnpm dev
```

Visit `http://localhost:3000` to see the app!

## 📖 Usage

### 1. Create Review Config (Optional)

Navigate to `/reviews` to create custom quality rubrics:
- Define criteria (completeness, accuracy, specificity, etc.)
- Set weights and passing scores
- Add custom reviewer prompts

### 2. Start a Research Chat

Navigate to `/research-chat` and start chatting with the AI:

```
You: "Research the top 10 Y Combinator companies from 2023. For each company, find their:
- Current valuation
- Primary product
- Revenue model
- Latest funding round"
```

The AI will propose a batch research plan with the targets and output schema.

### 3. Approve and Execute

Review the proposed research plan:
- Edit targets, output schema, or concurrency
- **Optional**: Select a review config for quality control
- Click "Start Research"

The system will:
- Create a dataset with your output schema
- Spawn agent workflows for each target
- Execute research in parallel with rate limiting
- Stream results back in real-time

### 4. View Results

Navigate to `/datasets` to view:
- Progress tracking (completed/failed/total)
- Interactive results table
- Individual task execution details
- Export options

## 🎨 3D Office Visualization

**NEW!** Experience an immersive 3D office where you can visualize your AI research team at work!

### Features
- **See your AI team**: Research agents appear as office workers
- **Real-time animations**: Watch agents walk to their desks when assigned tasks
- **Interactive workspace**: Click on agents or desks to see task execution logs
- **Status indicators**: Visual cues for agent states (idle, walking, working, busy)
- **Live statistics**: Dashboard showing active/completed/failed tasks

### How to Access
Navigate to `/office` or click the "Office 🏢" button in the navigation bar.

### Agent Behavior
- **Idle**: Agents stand in the center area waiting for tasks
- **Assigned Task**: Agent walks to an available desk
- **Working**: Agent stays at desk, showing status updates in chat bubbles
- **Completed**: Agent returns to idle area

Each agent corresponds to a `taskExecution`, and their status updates show the latest tool calls and progress.

## 📁 Project Structure

```
goldman-stanley/
├── convex/                      # Convex backend
│   ├── research/               # Research workflows & queries
│   ├── agents/                 # AI agent definitions
│   │   ├── deepResearcher/    # Main research agent
│   │   └── tools/             # Agent tools
│   ├── orchestration/         # Task execution system
│   ├── messaging/             # Chat & thread management
│   ├── office/                # Office visualization queries
│   └── auth/                  # Authentication helpers
├── src/
│   ├── routes/                # TanStack Start routes
│   │   ├── index.tsx          # Landing page
│   │   ├── research-chat.tsx  # Research chat interface
│   │   ├── datasets.tsx       # Dataset viewer
│   │   ├── reviews.tsx        # Review config management
│   │   └── office.tsx         # 3D office visualization (NEW)
│   ├── components/
│   │   ├── ai-chat/          # Chat components
│   │   ├── ai-elements/      # AI UI elements
│   │   ├── tools-ui/         # Research proposal UI
│   │   ├── research/         # Dataset dashboard
│   │   └── office/           # 3D office components (NEW)
│   │       ├── Employee.tsx  # 3D employee with animations
│   │       ├── Desk.tsx      # Desk component
│   │       └── OfficeScene.tsx # Main 3D scene
│   └── lib/
│       └── office/           # Office types & constants (NEW)
└── public/                   # Static assets
```

## 🏆 Hackathon Highlights

This project showcases:

✅ **TanStack Start**: File-based routing, server functions, and modern React patterns  
✅ **Convex Real-time**: Live subscriptions for streaming research results  
✅ **Convex Workflows**: Long-running orchestration that survives restarts  
✅ **Convex Agents**: AI agent framework with tools and multi-step reasoning  
✅ **Quality Control**: AI-powered review system with custom rubrics  
✅ **Production-ready**: Authentication, error handling, and monitoring

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 📝 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- **TanStack Team**: For the amazing Start framework
- **Convex Team**: For the incredible backend platform and agent framework
- **Vercel**: For the AI SDK
- **Firecrawl**: For web search capabilities

## 📬 Contact

- **Project Link**: [https://github.com/your-username/goldman-stanley](https://github.com/your-username/goldman-stanley)
- **Demo**: [Coming soon]

---

Built with ❤️ for the TanStack Convex Hackathon
