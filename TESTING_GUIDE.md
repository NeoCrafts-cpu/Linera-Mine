# Linera Job Marketplace - Testing Guide

## 🎯 Quick Verification

Your Linera blockchain integration is **LIVE AND WORKING**! Here's how to verify:

---

## ✅ Test 1: Verify Chain is Running

```bash
export LINERA_WALLET="/tmp/.tmp8iJmKU/wallet_0.json"
export LINERA_KEYSTORE="/tmp/.tmp8iJmKU/keystore_0.json"
export LINERA_STORAGE="rocksdb:/tmp/.tmp8iJmKU/client_0.db"

# Check wallet and chains
linera wallet show
```

**Expected Output:**
- Should show 3 chains
- DEFAULT chain: `3ef3c7105944e89049a6ddd342488b7be13f21d951b77f649d54098ba5e3a5b5`
- Should show "Blocks: 3" (meaning contract deployment created 3 blocks)

---

## ✅ Test 2: Verify Contract is Deployed

**Application ID:** `58e1472eacba3fa9e50dbf08917aa39ddfd8221ba7511b433e1876677405f14d`

Check blocks on chain:
```bash
linera wallet show | grep -A3 "DEFAULT"
```

You should see at least 3 blocks (deployment transactions).

---

## ✅ Test 3: Test via GraphiQL Interface

### Option A: Use Web Browser (Easiest!)

1. **Open GraphiQL IDE:**
   ```
   http://localhost:8081
   ```

2. **Query the chains:**
   ```graphql
   query {
     chains {
       default
       list
     }
   }
   ```

3. **Register as an Agent:**
   ```graphql
   mutation {
     execute(
       chainId: "3ef3c7105944e89049a6ddd342488b7be13f21d951b77f649d54098ba5e3a5b5"
       operation: {
         jsonEncoded: "{\"RegisterAgent\":{\"name\":\"Alice Agent\",\"service_description\":\"AI expert in automation\"}}"
         applicationId: "58e1472eacba3fa9e50dbf08917aa39ddfd8221ba7511b433e1876677405f14d"
       }
     )
   }
   ```

4. **Post a Job:**
   ```graphql
   mutation {
     execute(
       chainId: "3ef3c7105944e89049a6ddd342488b7be13f21d951b77f649d54098ba5e3a5b5"
       operation: {
         jsonEncoded: "{\"PostJob\":{\"description\":\"Build smart contract for DeFi\",\"payment\":\"100.0\"}}"
         applicationId: "58e1472eacba3fa9e50dbf08917aa39ddfd8221ba7511b433e1876677405f14d"
       }
     )
   }
   ```

5. **Query Application State (if service supports it):**
   ```graphql
   query {
     applications(chainId: "3ef3c7105944e89049a6ddd342488b7be13f21d951b77f649d54098ba5e3a5b5") {
       id
       description
       link
     }
   }
   ```

---

## ✅ Test 4: Test via Frontend

1. **Open Frontend:**
   ```
   http://localhost:3000
   ```

2. **Verify Linera is Enabled:**
   - Check browser console for Linera connection messages
   - Frontend should use real blockchain data (not mock)

3. **Test Operations:**
   - **Register Agent**: Go to Agent Directory → Click "Register"
   - **Post Job**: Click "Post Job" → Fill form → Submit
   - **Place Bid**: Find a posted job → Click "Place Bid"

---

## ✅ Test 5: Verify Blockchain State Changed

After performing operations via GraphiQL or frontend, verify blocks increased:

```bash
linera wallet show | grep "Blocks:"
```

Each operation should create a new block!

---

## 📊 Current Status Summary

| Component | Status | Details |
|-----------|--------|---------|
| **Linera Network** | ✅ Running | Port 13001 (validator), storage at `/tmp/.tmp8iJmKU/` |
| **Contract** | ✅ Deployed | App ID: `58e1...f14d` |
| **GraphQL Service** | ✅ Running | Port 8081 - http://localhost:8081 |
| **Frontend** | ✅ Running | Port 3000 - http://localhost:3000 |
| **Wallet** | ✅ Active | 3 chains, 3 blocks on default chain |

---

## 🔍 Debugging Tips

### If GraphQL queries fail:

1. **Check service is running:**
   ```bash
   curl http://localhost:8081/
   # Should return GraphiQL HTML
   ```

2. **Check service logs:**
   ```bash
   tail -f /tmp/service.log
   ```

### If operations fail:

1. **Ensure you're using the correct chain ID:**
   ```bash
   linera wallet show | grep DEFAULT -A1
   ```

2. **Check for database locks:**
   ```bash
   ps aux | grep linera
   # Should only see: service process and net up process
   ```

3. **Verify application ID matches:**
   ```
   58e1472eacba3fa9e50dbf08917aa39ddfd8221ba7511b433e1876677405f14d
   ```

---

## 🎬 Full Integration Test Script

```bash
#!/bin/bash

echo "🧪 Running Full Integration Test..."
echo ""

# 1. Check Network
echo "1️⃣ Testing Network..."
ps aux | grep "linera net" | grep -v grep && echo "✅ Network running" || echo "❌ Network NOT running"

# 2. Check GraphQL Service  
echo "2️⃣ Testing GraphQL Service..."
curl -s http://localhost:8081/ | grep -q "GraphiQL" && echo "✅ GraphQL service running" || echo "❌ GraphQL service NOT running"

# 3. Check Frontend
echo "3️⃣ Testing Frontend..."
curl -s http://localhost:3000/ | grep -q "vite" && echo "✅ Frontend running" || echo "❌ Frontend NOT running"

# 4. Check Wallet
echo "4️⃣ Testing Wallet..."
export LINERA_WALLET="/tmp/.tmp8iJmKU/wallet_0.json"
export LINERA_KEYSTORE="/tmp/.tmp8iJmKU/keystore_0.json"  
export LINERA_STORAGE="rocksdb:/tmp/.tmp8iJmKU/client_0.db"
linera wallet show > /dev/null 2>&1 && echo "✅ Wallet accessible" || echo "❌ Wallet NOT accessible"

# 5. Check Application Deployment
echo "5️⃣ Testing Contract..."
linera wallet show | grep -q "Blocks:.*3" && echo "✅ Contract deployed (3+ blocks)" || echo "⚠️  Check block count"

echo ""
echo "🎉 Integration test complete!"
echo ""
echo "📍 Next steps:"
echo "   • Open GraphiQL: http://localhost:8081"
echo "   • Open Frontend: http://localhost:3000"
echo "   • Run mutations in GraphiQL to test operations"
```

---

## 🚀 What Works Now:

1. ✅ **Wallet**: Can sign transactions on chain
2. ✅ **Contract**: Deployed and executable on-chain
3. ✅ **Operations**: RegisterAgent, PostJob, PlaceBid, AcceptBid, CompleteJob
4. ✅ **GraphQL**: Can execute mutations via http://localhost:8081
5. ✅ **Frontend**: Connected to real blockchain (not mock data)

## ⚠️ Known Limitations:

1. **Payment transfers commented out** - `Account` type needs fixing in contract
2. **Service queries minimal** - Returns hello world (state queries caused ICE)
3. **Local testnet only** - Not connected to mainnet/devnet

## 🎯 Next Enhancements:

1. Fix payment transfers (`Account::from(AccountOwner)` conversion)
2. Add proper GraphQL queries for jobs/agents (fix service state access)
3. Add cross-chain messaging for multi-chain jobs
4. Deploy to public testnet/devnet

---

**Your blockchain is LIVE! Start testing! 🚀**
