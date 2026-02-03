/**
 * Seed Jobs Script
 * 
 * This script posts 10 example AI agent jobs to the Linera testnet.
 * Run with: npx ts-node scripts/seed-jobs.ts
 * 
 * Prerequisites:
 * - VITE_APPLICATION_ID set in .env
 * - VITE_LINERA_FAUCET_URL set in .env (or uses default Conway testnet)
 */

// Example jobs data - realistic AI agent tasks
export const SEED_JOBS = [
  {
    title: "Train Sentiment Analysis Model on Twitter Data",
    description: "Need an AI agent to train a sentiment analysis model on 100K tweets. Should classify into positive, negative, and neutral categories with 90%+ accuracy. Deliverables: trained model file, accuracy report, and inference code.",
    payment: "5000",
    category: "AIModel",
    tags: ["nlp", "sentiment-analysis", "machine-learning", "twitter"],
    milestones: []
  },
  {
    title: "Generate 50 Product Images for E-commerce Store",
    description: "Looking for an AI agent to generate 50 high-quality product images using Stable Diffusion or DALL-E. Products are modern furniture items. Need consistent style, white background, professional lighting. Provide prompts and output images.",
    payment: "2500",
    category: "ImageGeneration",
    tags: ["stable-diffusion", "product-photography", "e-commerce", "image-generation"],
    milestones: []
  },
  {
    title: "Analyze Q4 Sales Data and Create Dashboard",
    description: "Have 500K rows of sales data from Q4 2025. Need comprehensive analysis including: revenue trends, top products, customer segmentation, regional breakdown. Deliver interactive dashboard (Python/Streamlit) and executive summary PDF.",
    payment: "3500",
    category: "DataAnalysis",
    tags: ["data-analysis", "visualization", "python", "business-intelligence"],
    milestones: []
  },
  {
    title: "Build RAG Chatbot for Customer Support",
    description: "Create a Retrieval-Augmented Generation chatbot for our SaaS product documentation. Should handle 50+ common questions, integrate with our knowledge base (provided as PDFs), and have a simple web interface. Use LangChain or similar.",
    payment: "8000",
    category: "CodeDevelopment",
    tags: ["rag", "langchain", "chatbot", "llm", "customer-support"],
    milestones: []
  },
  {
    title: "Translate Technical Documentation EN→JP",
    description: "Translate 30 pages of technical API documentation from English to Japanese. Must maintain technical accuracy, proper terminology, and formatting. Experience with developer docs required. Deliver in Markdown format.",
    payment: "1500",
    category: "Translation",
    tags: ["translation", "japanese", "technical-writing", "api-docs"],
    milestones: []
  },
  {
    title: "Research and Summarize AI Safety Papers",
    description: "Research task: Find and summarize the top 20 AI safety papers from 2024-2025. For each paper, provide: key findings, methodology, implications, and relevance to current LLM development. Deliver comprehensive research report.",
    payment: "2000",
    category: "Research",
    tags: ["ai-safety", "research", "academic", "llm"],
    milestones: []
  },
  {
    title: "Create Video Explainer for Blockchain Concept",
    description: "Produce a 3-5 minute animated explainer video about Linera's microchain architecture. Target audience: developers new to blockchain. Include script, voiceover, and animations. Style: clean, modern, professional.",
    payment: "4500",
    category: "VideoProduction",
    tags: ["video", "animation", "blockchain", "education", "explainer"],
    milestones: []
  },
  {
    title: "Fine-tune LLM for Code Review",
    description: "Fine-tune a code review model (based on CodeLlama or similar) on our internal code review dataset (5K examples provided). Model should identify bugs, suggest improvements, and follow our coding standards. Deliver model weights and evaluation metrics.",
    payment: "7500",
    category: "AIModel",
    tags: ["fine-tuning", "code-review", "llm", "codellama", "machine-learning"],
    milestones: []
  },
  {
    title: "Write Technical Blog Series on Web3 Development",
    description: "Write a 5-part technical blog series on building dApps. Topics: smart contract basics, frontend integration, testing, deployment, and security. Each post 1500-2000 words with code examples. SEO-optimized.",
    payment: "2200",
    category: "ContentWriting",
    tags: ["technical-writing", "web3", "blockchain", "blog", "tutorial"],
    milestones: []
  },
  {
    title: "Build Automated Customer Service Agent",
    description: "Create an AI agent that can handle tier-1 customer support queries via API. Should integrate with our ticketing system, handle common questions, escalate complex issues, and maintain conversation context. Include monitoring dashboard.",
    payment: "6000",
    category: "CustomerService",
    tags: ["automation", "customer-service", "api", "chatbot", "integration"],
    milestones: []
  }
];

/**
 * Instructions for running this script:
 * 
 * Since the frontend uses WASM client that requires browser environment,
 * you have two options to seed jobs:
 * 
 * Option 1: Use the frontend UI
 * - Open the app in browser
 * - Connect wallet
 * - Go to Marketplace
 * - Post each job manually (or we can add a "Seed Demo Jobs" button)
 * 
 * Option 2: Add a seed button to the app (recommended for judges)
 * - Add a hidden/admin feature that seeds all jobs at once
 * - This is implemented in the SeedJobsButton component
 * 
 * Option 3: Use linera CLI directly
 * - linera service --port 8080
 * - Use GraphQL mutations to post each job
 */

console.log('=== Seed Jobs Data ===');
console.log(`Total jobs to seed: ${SEED_JOBS.length}`);
console.log('\nJobs:');
SEED_JOBS.forEach((job, i) => {
  console.log(`${i + 1}. ${job.title} (${job.category}) - ${job.payment} tokens`);
});

console.log('\n---');
console.log('To seed these jobs, use the SeedJobsButton component in the app,');
console.log('or post them manually through the Marketplace UI.');

export default SEED_JOBS;
