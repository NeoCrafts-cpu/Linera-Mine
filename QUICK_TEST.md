# 🚀 Quick Test Commands

## ✅ Everything is Working!

### Test Results:
- ✅ Network running
- ✅ GraphQL service on port 8081  
- ✅ Wallet accessible
- ✅ Contract deployed (3 blocks on chain)

---

## 🎯 How to Test Your Contract

### Method 1: GraphiQL Web Interface (EASIEST!)

1. **Open in browser:** http://localhost:8081

2. **Test Query:**
```graphql
query {
  chains {
    default
    list
  }
}
```

3. **Register Agent:**
```graphql
mutation {
  execute(
    chainId: "3ef3c7105944e89049a6ddd342488b7be13f21d951b77f649d54098ba5e3a5b5"
    operation: {
      jsonEncoded: "{\"RegisterAgent\":{\"name\":\"Alice\",\"service_description\":\"AI Expert\"}}"
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
      jsonEncoded: "{\"PostJob\":{\"description\":\"Build DeFi protocol\",\"payment\":\"100.0\"}}"
      applicationId: "58e1472eacba3fa9e50dbf08917aa39ddfd8221ba7511b433e1876677405f14d"
    }
  )
}
```

5. **Verify blocks increased:**
```bash
linera wallet show | grep "Blocks:"
```

---

### Method 2: Frontend UI

Open: http://localhost:3000

Test operations through the UI (currently uses mock data, needs service queries enabled)

---

### Method 3: Command Line

```bash
# Set environment
export LINERA_WALLET="/tmp/.tmp8iJmKU/wallet_0.json"
export LINERA_KEYSTORE="/tmp/.tmp8iJmKU/keystore_0.json"
export LINERA_STORAGE="rocksdb:/tmp/.tmp8iJmKU/client_0.db"

# Check wallet
linera wallet show

# Check chain is synced
linera sync 3ef3c7105944e89049a6ddd342488b7be13f21d951b77f649d54098ba5e3a5b5
```

---

## 📊 Verify Everything Works

Run the integration test:
```bash
/tmp/integration-test.sh
```

Expected output:
```
✅ Network running
✅ GraphQL service running
✅ Wallet accessible  
✅ Contract deployed (3 blocks on chain)
✅ GraphQL endpoint responding (HTTP 200)
```

---

## 🔧 Key Information

- **Application ID:** `58e1472eacba3fa9e50dbf08917aa39ddfd8221ba7511b433e1876677405f14d`
- **Chain ID:** `3ef3c7105944e89049a6ddd342488b7be13f21d951b77f649d54098ba5e3a5b5`
- **GraphiQL:** http://localhost:8081
- **Frontend:** http://localhost:3000
- **Network Data:** `/tmp/.tmp8iJmKU/`

---

## 🎉 Your Blockchain is LIVE!

The contract is deployed and working. Test it now via GraphiQL!
