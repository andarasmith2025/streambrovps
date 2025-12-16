# SSL Setup Guide - StreamBro

Panduan lengkap untuk install SSL certificate (HTTPS) di StreamBro menggunakan Let's Encrypt.

---

## 📋 Prerequisites

### 1. DNS Sudah Pointing ke VPS
Pastikan DNS records sudah di-setup di Namecheap:

```
Type: A Record
Host: @
Value: 94.237.3.164

Type: A Record  
Host: streambro
Value: 94.237.3.164

Type: CNAME Record
Host: www
Value: nivarastudio.site
```

### 2. Cek DNS Propagation
```bash
# Cek domain utama
dig nivarastudio.site

# Cek subdomain
dig streambro.nivarastudio.site

# Atau gunakan online tool:
# https://dnschecker.org
```

Tunggu sampai DNS propagation selesai (5-30 menit).

---

## 🚀 Quick Install (Automated)

### Step 1: SSH ke VPS
```bash
ssh root@94.237.3.164
```

### Step 2: Masuk ke folder project
```bash
cd /root/streambrovps
```

### Step 3: Pull latest code (jika ada update)
```bash
git pull origin main
```

### Step 4: Jalankan script SSL setup
```bash
chmod +x setup-ssl.sh
./setup-ssl.sh
```

Script akan otomatis:
- ✅ Install Nginx
- ✅ Install Certbot
- ✅ Obtain SSL certificate
- ✅ Configure reverse proxy
- ✅ Setup auto-renewal
- ✅ Configure firewall

### Step 5: Test HTTPS
```bash
# Test dari VPS
curl -I https://streambro.nivarastudio.site

# Atau buka di browser:
# https://nivarastudio.site
# https://streambro.nivarastudio.site
```

---

## 🔧 Manual Install (Step-by-Step)

Jika prefer manual install atau troubleshooting:

### 1. Install Nginx
```bash
apt update
apt install -y nginx
```

### 2. Install Certbot
```bash
apt install -y certbot python3-certbot-nginx
```

### 3. Stop Nginx sementara
```bash
systemctl stop nginx
```

### 4. Obtain SSL Certificate
```bash
certbot certonly --standalone \
    -d nivarastudio.site \
    -d www.nivarastudio.site \
    -d streambro.nivarastudio.site \
    --non-interactive \
    --agree-tos \
    --email admin@nivarastudio.site
```

### 5. Create Nginx Config
```bash
nano /etc/nginx/sites-available/streambro
```

Paste config ini:
```nginx
# HTTP - Redirect to HTTPS
server {
    listen 80;
    server_name nivarastudio.site www.nivarastudio.site streambro.nivarastudio.site;
    return 301 https://$server_name$request_uri;
}

# HTTPS - Main Domain
server {
    listen 443 ssl http2;
    server_name nivarastudio.site www.nivarastudio.site;
    
    ssl_certificate /etc/letsencrypt/live/nivarastudio.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nivarastudio.site/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    location / {
        proxy_pass http://localhost:7575;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }
    
    client_max_body_size 10G;
    client_body_timeout 600s;
}

# HTTPS - Subdomain
server {
    listen 443 ssl http2;
    server_name streambro.nivarastudio.site;
    
    ssl_certificate /etc/letsencrypt/live/nivarastudio.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nivarastudio.site/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    location / {
        proxy_pass http://localhost:7575;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }
    
    client_max_body_size 10G;
    client_body_timeout 600s;
}
```

### 6. Enable Site
```bash
ln -sf /etc/nginx/sites-available/streambro /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
```

### 7. Test Nginx Config
```bash
nginx -t
```

### 8. Start Nginx
```bash
systemctl start nginx
systemctl enable nginx
```

### 9. Setup Auto-Renewal
```bash
systemctl enable certbot.timer
systemctl start certbot.timer

# Test renewal
certbot renew --dry-run
```

### 10. Configure Firewall
```bash
ufw allow 80/tcp
ufw allow 443/tcp
```

---

## ✅ Verification

### 1. Check SSL Certificate
```bash
certbot certificates
```

Output:
```
Certificate Name: nivarastudio.site
  Domains: nivarastudio.site www.nivarastudio.site streambro.nivarastudio.site
  Expiry Date: 2025-03-XX XX:XX:XX+00:00 (VALID: 89 days)
```

### 2. Check Nginx Status
```bash
systemctl status nginx
```

### 3. Test HTTPS
```bash
# Test redirect HTTP → HTTPS
curl -I http://streambro.nivarastudio.site

# Test HTTPS
curl -I https://streambro.nivarastudio.site

# Test SSL grade
# https://www.ssllabs.com/ssltest/
```

### 4. Test dari Browser
Buka:
- https://nivarastudio.site
- https://www.nivarastudio.site
- https://streambro.nivarastudio.site

Harus muncul:
- ✅ Padlock icon (🔒)
- ✅ "Connection is secure"
- ✅ No port :7575 needed

---

## 🔄 Update Environment Variables

Setelah SSL aktif, update `.env` file:

```bash
nano /root/streambrovps/.env
```

Update:
```env
# YouTube OAuth (jika sudah setup)
GOOGLE_REDIRECT_URI=https://streambro.nivarastudio.site/oauth2/callback
```

Restart StreamBro:
```bash
pm2 restart streambro
```

---

## 🔄 SSL Auto-Renewal

SSL certificate dari Let's Encrypt valid 90 hari dan akan auto-renew.

### Check Auto-Renewal Status
```bash
systemctl status certbot.timer
```

### Manual Renewal (jika perlu)
```bash
certbot renew
systemctl reload nginx
```

### Test Renewal
```bash
certbot renew --dry-run
```

---

## 🐛 Troubleshooting

### Issue 1: DNS Not Resolving
```bash
# Check DNS
dig nivarastudio.site
dig streambro.nivarastudio.site

# Wait 5-30 minutes for propagation
# Then try again
```

### Issue 2: Certificate Failed
```bash
# Check if port 80 is open
netstat -tulpn | grep :80

# Check firewall
ufw status

# Check Nginx logs
tail -f /var/log/nginx/error.log

# Try again
systemctl stop nginx
certbot certonly --standalone -d nivarastudio.site -d www.nivarastudio.site -d streambro.nivarastudio.site
```

### Issue 3: Nginx Config Error
```bash
# Test config
nginx -t

# Check syntax errors
nano /etc/nginx/sites-available/streambro

# Reload after fix
systemctl reload nginx
```

### Issue 4: 502 Bad Gateway
```bash
# Check if StreamBro is running
pm2 status

# Check if port 7575 is listening
netstat -tulpn | grep :7575

# Restart StreamBro
pm2 restart streambro

# Check logs
pm2 logs streambro
```

### Issue 5: Mixed Content Warning
Jika ada warning "mixed content" di browser:
- Pastikan semua assets (CSS, JS, images) load via HTTPS
- Check browser console untuk errors
- Update hardcoded HTTP URLs ke HTTPS

---

## 🔒 Security Best Practices

### 1. Close Port 7575 (Optional)
Setelah SSL aktif, port 7575 tidak perlu diakses langsung:
```bash
ufw delete allow 7575/tcp
```

### 2. Enable HSTS
Sudah included di config Nginx:
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### 3. Regular Updates
```bash
# Update system
apt update && apt upgrade -y

# Update Certbot
apt install --only-upgrade certbot
```

---

## 📊 SSL Certificate Info

### Provider
- **Let's Encrypt** (Free, Trusted, Auto-Renewable)

### Validity
- **90 days** (auto-renews at 60 days)

### Domains Covered
- nivarastudio.site
- www.nivarastudio.site
- streambro.nivarastudio.site

### Encryption
- **TLS 1.2 / 1.3**
- **Strong ciphers only**

---

## 🎯 Next Steps After SSL

1. ✅ Test HTTPS access
2. ✅ Update YouTube OAuth redirect URI
3. ✅ Update Google Cloud Console
4. ✅ Test video upload via HTTPS
5. ✅ Test streaming via HTTPS
6. ✅ Share HTTPS URL with users

---

## 📞 Support

Jika ada masalah:
1. Check logs: `pm2 logs streambro`
2. Check Nginx: `tail -f /var/log/nginx/error.log`
3. Check SSL: `certbot certificates`
4. Test config: `nginx -t`

---

## 🎉 Success!

Setelah SSL aktif:
- ✅ Domain accessible via HTTPS
- ✅ Secure connection (padlock icon)
- ✅ No port number needed
- ✅ Auto-renewal enabled
- ✅ Professional appearance
- ✅ SEO friendly
- ✅ Required for YouTube OAuth

**Happy Streaming!** 🚀
