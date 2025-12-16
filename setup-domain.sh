#!/bin/bash

# StreamBro Domain Setup Script
# Domain: stream.nivarastudio.site
# VPS IP: 94.237.3.164

echo "🌐 StreamBro Domain Setup"
echo "=========================="
echo ""

DOMAIN="streambro.nivarastudio.site"
EMAIL="your-email@example.com"  # Change this!

echo "📋 Checklist:"
echo "1. ✅ Domain purchased: nivarastudio.site"
echo "2. ⏳ DNS A Record added: stream → 94.237.3.164"
echo "3. ⏳ Waiting for DNS propagation..."
echo ""

# Check if domain resolves
echo "🔍 Checking DNS resolution..."
if ping -c 1 $DOMAIN &> /dev/null; then
    echo "✅ Domain resolves to: $(dig +short $DOMAIN)"
else
    echo "❌ Domain not resolving yet. Please wait 5-30 minutes."
    echo "   Then run this script again."
    exit 1
fi

echo ""
echo "🔧 Installing dependencies..."

# Update system
apt update

# Install Certbot
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing Certbot..."
    apt install certbot -y
else
    echo "✅ Certbot already installed"
fi

# Install Nginx
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing Nginx..."
    apt install nginx -y
else
    echo "✅ Nginx already installed"
fi

echo ""
echo "🔒 Getting SSL certificate..."

# Stop Nginx temporarily
systemctl stop nginx

# Get SSL certificate
certbot certonly --standalone -d $DOMAIN --email $EMAIL --agree-tos --non-interactive

if [ $? -eq 0 ]; then
    echo "✅ SSL certificate obtained!"
else
    echo "❌ Failed to get SSL certificate"
    exit 1
fi

echo ""
echo "⚙️  Configuring Nginx..."

# Create Nginx config
cat > /etc/nginx/sites-available/streambro << 'EOF'
server {
    listen 80;
    server_name streambro.nivarastudio.site;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name streambro.nivarastudio.site;
    
    ssl_certificate /etc/letsencrypt/live/streambro.nivarastudio.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/streambro.nivarastudio.site/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
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
    }
    
    client_max_body_size 10G;
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/streambro /etc/nginx/sites-enabled/

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Test Nginx config
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx config valid"
    systemctl restart nginx
    echo "✅ Nginx restarted"
else
    echo "❌ Nginx config error"
    exit 1
fi

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "📊 Summary:"
echo "  Domain:  https://streambro.nivarastudio.site"
echo "  SSL:     ✅ Enabled (Let's Encrypt)"
echo "  HTTP:    ✅ Redirects to HTTPS"
echo "  Nginx:   ✅ Running"
echo ""
echo "🧪 Test now:"
echo "  curl -I https://streambro.nivarastudio.site"
echo ""
echo "📝 Next steps:"
echo "  1. Update YouTube OAuth redirect URI:"
echo "     https://streambro.nivarastudio.site/oauth2/callback"
echo "  2. Update .env file with new domain"
echo "  3. Test StreamBro access"
echo ""
