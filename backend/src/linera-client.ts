import { execSync, spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface LineraConfig {
  walletPath: string;
  keystorePath: string;
  storagePath: string;
  faucetUrl: string;
  contractPath: string;
  servicePath: string;
}

export class LineraClient {
  private config: LineraConfig;
  private chainId: string | null = null;
  private appId: string | null = null;
  private initialized: boolean = false;
  private serviceProcess: ChildProcess | null = null;
  private servicePort: number = 8082; // Internal port for linera service

  constructor(config: LineraConfig) {
    this.config = config;
  }

  private getEnv(): NodeJS.ProcessEnv {
    return {
      ...process.env,
      LINERA_WALLET: this.config.walletPath,
      LINERA_KEYSTORE: this.config.keystorePath,
      LINERA_STORAGE: this.config.storagePath,
    };
  }

  private exec(command: string): string {
    console.log(`Executing: ${command}`);
    try {
      const result = execSync(command, {
        env: this.getEnv(),
        encoding: 'utf-8',
        timeout: 120000, // 2 minutes timeout
      });
      return result.trim();
    } catch (error: any) {
      console.error(`Command failed: ${command}`);
      console.error(error.stderr || error.message);
      throw error;
    }
  }

  private walletExists(): boolean {
    return fs.existsSync(this.config.walletPath) && 
           fs.existsSync(this.config.keystorePath);
  }

  private loadDeployment(): boolean {
    const deploymentPath = path.join(path.dirname(this.config.walletPath), 'deployment.json');
    if (fs.existsSync(deploymentPath)) {
      const data = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
      this.chainId = data.chainId;
      this.appId = data.appId;
      return true;
    }
    return false;
  }

  private saveDeployment(): void {
    const deploymentPath = path.join(path.dirname(this.config.walletPath), 'deployment.json');
    fs.writeFileSync(deploymentPath, JSON.stringify({
      chainId: this.chainId,
      appId: this.appId,
      deployedAt: new Date().toISOString(),
    }, null, 2));
  }

  async initialize(): Promise<void> {
    console.log('Initializing Linera client...');

    // Ensure data directory exists
    const dataDir = path.dirname(this.config.walletPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Check if already deployed
    if (this.loadDeployment() && this.walletExists()) {
      console.log('Loaded existing deployment');
      this.initialized = true;
      await this.startLineraService();
      return;
    }

    // Initialize wallet if needed
    if (!this.walletExists()) {
      console.log('Initializing wallet from faucet...');
      this.exec(`linera wallet init --faucet ${this.config.faucetUrl}`);
    }

    // Get chain ID
    console.log('Getting chain ID...');
    const walletOutput = this.exec('linera wallet show');
    const chainMatch = walletOutput.match(/Chain ID:\s*([a-f0-9]{64})/i) ||
                       walletOutput.match(/([a-f0-9]{64})/);
    
    if (!chainMatch) {
      // Request a new chain
      console.log('Requesting new chain from faucet...');
      const chainOutput = this.exec(`linera wallet request-chain --faucet ${this.config.faucetUrl}`);
      const newChainMatch = chainOutput.match(/([a-f0-9]{64})/);
      if (newChainMatch) {
        this.chainId = newChainMatch[1];
      }
    } else {
      this.chainId = chainMatch[1];
    }

    if (!this.chainId) {
      throw new Error('Failed to get chain ID');
    }
    console.log(`Chain ID: ${this.chainId}`);

    // Deploy contract if not already deployed
    if (!this.appId) {
      console.log('Deploying contract...');
      
      if (!fs.existsSync(this.config.contractPath) || !fs.existsSync(this.config.servicePath)) {
        throw new Error(`Contract files not found: ${this.config.contractPath}, ${this.config.servicePath}`);
      }

      const deployOutput = this.exec(
        `linera publish-and-create "${this.config.contractPath}" "${this.config.servicePath}" --json-argument "null"`
      );
      
      // Extract app ID from output (usually the last 64-char hex string)
      const appMatches = deployOutput.match(/[a-f0-9]{64}/gi);
      if (appMatches && appMatches.length > 0) {
        this.appId = appMatches[appMatches.length - 1];
      }
    }

    if (!this.appId) {
      throw new Error('Failed to deploy contract');
    }
    console.log(`App ID: ${this.appId}`);

    // Save deployment info
    this.saveDeployment();
    this.initialized = true;

    // Start the Linera service
    await this.startLineraService();
  }

  private async startLineraService(): Promise<void> {
    console.log(`Starting Linera service on port ${this.servicePort}...`);
    
    this.serviceProcess = spawn('linera', ['service', '--port', String(this.servicePort)], {
      env: this.getEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.serviceProcess.stdout?.on('data', (data) => {
      console.log(`[linera-service] ${data.toString().trim()}`);
    });

    this.serviceProcess.stderr?.on('data', (data) => {
      console.error(`[linera-service] ${data.toString().trim()}`);
    });

    this.serviceProcess.on('exit', (code) => {
      console.log(`Linera service exited with code ${code}`);
    });

    // Wait for service to be ready
    await this.waitForService();
  }

  private async waitForService(retries: number = 30): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(`http://localhost:${this.servicePort}/`);
        if (response.ok) {
          console.log('Linera service is ready');
          return;
        }
      } catch {
        // Service not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.warn('Linera service may not be fully ready');
  }

  async queryGraphQL(body: any): Promise<any> {
    if (!this.initialized || !this.chainId || !this.appId) {
      throw new Error('Linera client not initialized');
    }

    const url = `http://localhost:${this.servicePort}/chains/${this.chainId}/applications/${this.appId}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.statusText}`);
    }

    return response.json();
  }

  getChainId(): string | null {
    return this.chainId;
  }

  getAppId(): string | null {
    return this.appId;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getGraphQLUrl(): string {
    return `http://localhost:${this.servicePort}/chains/${this.chainId}/applications/${this.appId}`;
  }
}
