# Quick Capacity Reference

**TL;DR:** Your server can handle **15-20 concurrent streams** safely.

---

## 🎯 Quick Stats

| Metric | Value |
|--------|-------|
| **Server** | UpCloud 2 cores, 16 GB RAM |
| **Cost** | $40/month |
| **Per Stream** | 2% CPU + 60 MB RAM + 4 Mbps |
| **Safe Limit** | 15 streams |
| **Optimal** | 18 streams |
| **Maximum** | 20 streams |
| **Bottleneck** | Network (100 Mbps) |

---

## 📊 Capacity by Server Specs

**Formula:** Per stream = 2% CPU + 60 MB RAM + 4 Mbps bandwidth

| CPU Cores | RAM | Bandwidth | Max Streams | Cost/Month (est) |
|-----------|-----|-----------|-------------|------------------|
| 1 core | 1 GB | 50 Mbps | 5-8 streams | $5-10 |
| 2 cores | 2 GB | 100 Mbps | 10-15 streams | $10-20 |
| 2 cores | 4 GB | 100 Mbps | 15-20 streams | $20-30 |
| 2 cores | 8 GB | 200 Mbps | 30-40 streams | $30-40 |
| 4 cores | 8 GB | 500 Mbps | 80-100 streams | $40-50 |
| 6 cores | 16 GB | 1 Gbps | 150-200 streams | $50-80 |

**Note:** Bandwidth is usually the bottleneck, not CPU/RAM!

---

## 📊 Your Current Server Usage

| Streams | CPU Usage | RAM Usage | Bandwidth | Status |
|---------|-----------|-----------|-----------|--------|
| 0 | 1% | 150 MB | 0 Mbps | 🟢 Idle |
| 5 | 11% | 450 MB | 20 Mbps | 🟢 Very Safe |
| 10 | 21% | 750 MB | 40 Mbps | 🟢 Safe |
| 15 | 31% | 1.05 GB | 60 Mbps | 🟢 Recommended |
| 18 | 37% | 1.23 GB | 72 Mbps | 🟡 Optimal |
| 20 | 41% | 1.35 GB | 80 Mbps | 🟡 Maximum |
| 25 | 51% | 1.65 GB | 100 Mbps | 🔴 Over Limit |

---

## 🚦 Traffic Light System

### 🟢 Green Zone (0-15 streams)
- **Status:** Safe for 24/7 operation
- **CPU:** < 30%
- **RAM:** < 1.1 GB
- **Network:** < 60 Mbps
- **Action:** None needed

### 🟡 Yellow Zone (16-18 streams)
- **Status:** Monitor closely
- **CPU:** 30-40%
- **RAM:** 1.1-1.3 GB
- **Network:** 60-75 Mbps
- **Action:** Watch for issues

### 🔴 Red Zone (19-20 streams)
- **Status:** Peak capacity
- **CPU:** 40-50%
- **RAM:** 1.3-1.5 GB
- **Network:** 75-85 Mbps
- **Action:** Don't add more

### ⛔ Danger Zone (21+ streams)
- **Status:** Over capacity
- **CPU:** > 50%
- **RAM:** > 1.5 GB
- **Network:** > 85 Mbps
- **Action:** Reduce streams immediately

---

## 💡 Quick Tips

1. **Start with 10-12 streams** and scale up gradually
2. **Monitor network usage** - it's your bottleneck
3. **Use stream copy mode** - don't enable re-encoding
4. **Pre-encode videos** at 2.5-4 Mbps bitrate
5. **Keep safety margin** - don't run at 100%

---

## 🆚 VPS Comparison

| Provider | Price | Cores | RAM | Network | Max Streams |
|----------|-------|-------|-----|---------|-------------|
| **UpCloud (current)** | $40 | 2 | 16GB | 100M | 15-20 |
| Hetzner CPX31 | $13 | 4 | 8GB | 20G | 40-50 |
| Contabo Cloud M | $13 | 6 | 16GB | 600M | 80-100 |
| Vultr Singapore | $48 | 4 | 8GB | 4G | 60-80 |
| DigitalOcean | $48 | 4 | 8GB | 5G | 60-80 |

---

## 📞 When to Upgrade

Upgrade if you need:
- ✅ More than 20 concurrent streams
- ✅ Better network bandwidth
- ✅ Lower latency to Asia
- ✅ More CPU for re-encoding

Consider:
- **Hetzner** for best value ($13 for 40-50 streams)
- **Vultr/DO** for Asia location ($48 for 60-80 streams)

---

## 🔗 Full Documentation

See `SERVER_CAPACITY_PLANNING.md` for detailed analysis