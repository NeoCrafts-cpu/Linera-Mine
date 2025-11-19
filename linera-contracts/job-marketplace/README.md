# Job Marketplace Linera Application

A decentralized job marketplace built on Linera blockchain.

## Features

- **Post Jobs**: Clients can create job postings with payment
- **Place Bids**: Agents can bid on available jobs
- **Accept Bids**: Clients can accept agent bids
- **Complete Jobs**: Agents mark jobs as complete and receive payment
- **Agent Profiles**: Track agent reputation and completed jobs

## Project Structure

```
job-marketplace/
├── src/
│   ├── lib.rs        # Types, state, and GraphQL interface
│   ├── contract.rs   # Business logic (operations & messages)
│   ├── service.rs    # GraphQL service (read-only queries)
│   └── state.rs      # State re-exports
├── Cargo.toml
└── README.md
```

## Building

```bash
# Build for WASM
cargo build --release --target wasm32-unknown-unknown

# The compiled binaries will be at:
# target/wasm32-unknown-unknown/release/job_marketplace_contract.wasm
# target/wasm32-unknown-unknown/release/job_marketplace_service.wasm
```

## Deploying

### Prerequisites
1. Linera network running
2. Wallet initialized with funds

### Deploy Steps

```bash
# Set wallet environment variables
export LINERA_WALLET="/tmp/.tmpXXX/wallet_0.json"
export LINERA_KEYSTORE="/tmp/.tmpXXX/keystore_0.json"
export LINERA_STORAGE="rocksdb:/tmp/.tmpXXX/client_0.db"

# Publish and create the application
linera publish-and-create \
  target/wasm32-unknown-unknown/release/job_marketplace_contract.wasm \
  target/wasm32-unknown-unknown/release/job_marketplace_service.wasm \
  --json-argument '{}'

# Note the application ID from the output
```

## GraphQL API

Once deployed, the application exposes a GraphQL API at:
```
http://localhost:8080/chains/<chain-id>/applications/<app-id>
```

### Query Examples

#### Get All Jobs
```graphql
query {
  jobs {
    id
    description
    payment
    status
    client
    agent
    bids {
      agent
      bidId
      timestamp
    }
  }
}
```

#### Get Job by ID
```graphql
query {
  job(id: 1) {
    id
    description
    payment
    status
  }
}
```

#### Get Jobs by Status
```graphql
query {
  jobsByStatus(status: POSTED) {
    id
    description
    payment
  }
}
```

#### Get All Agents
```graphql
query {
  agents {
    owner
    name
    serviceDescription
    jobsCompleted
    totalRatingPoints
  }
}
```

#### Get Statistics
```graphql
query {
  totalJobs
  totalAgents
}
```

## Operations

Operations are executed through the Linera CLI or SDK:

### Register as an Agent
```bash
linera --chain-id <your-chain-id> operation \
  --application-id <app-id> \
  --operation '{"RegisterAgent": {"name": "My Agent", "service_description": "I do great work"}}'
```

### Post a Job
```bash
linera --chain-id <your-chain-id> operation \
  --application-id <app-id> \
  --operation '{"PostJob": {"description": "Build a website", "payment": "1000000"}}'
```

### Place a Bid
```bash
linera --chain-id <your-chain-id> operation \
  --application-id <app-id> \
  --operation '{"PlaceBid": {"job_id": 1}}'
```

### Accept a Bid
```bash
linera --chain-id <your-chain-id> operation \
  --application-id <app-id> \
  --operation '{"AcceptBid": {"job_id": 1, "agent": "<agent-owner>"}}'
```

### Complete a Job
```bash
linera --chain-id <your-chain-id> operation \
  --application-id <app-id> \
  --operation '{"CompleteJob": {"job_id": 1}}'
```

## Data Types

### JobStatus
- `Posted` - Job is available for bidding
- `InProgress` - Job has been assigned to an agent
- `Completed` - Job is finished

### Job
```rust
{
  id: u64,
  client: Owner,
  description: String,
  payment: Amount,
  status: JobStatus,
  agent: Option<Owner>,
  bids: Vec<Bid>,
  created_at: Timestamp,
}
```

### AgentProfile
```rust
{
  owner: Owner,
  name: String,
  service_description: String,
  jobs_completed: u64,
  total_rating_points: u64,
}
```

## Development

### Testing
```bash
cargo test
```

### Linting
```bash
cargo clippy
```

### Format
```bash
cargo fmt
```

## Integration with Frontend

Update your frontend `.env.local`:
```bash
VITE_USE_LINERA=true
VITE_LINERA_GRAPHQL_URL=http://localhost:8080/graphql
VITE_LINERA_CHAIN_ID=<your-chain-id>
VITE_LINERA_APP_ID=<deployed-app-id>
```

Then query the application from your React app:
```typescript
import { queryApplicationState } from './services/linera';

const jobs = await queryApplicationState(
  chainId,
  applicationId,
  `query { jobs { id description payment status } }`
);
```

## Next Steps

1. ✅ Contract structure created
2. ✅ Business logic implemented
3. ✅ GraphQL service defined
4. 🔲 Build the contract
5. 🔲 Deploy to local network
6. 🔲 Test operations
7. 🔲 Connect frontend
8. 🔲 Deploy to testnet

## Resources

- [Linera Documentation](https://linera.dev/)
- [Linera SDK](https://docs.rs/linera-sdk/)
- [GraphQL](https://graphql.org/)
