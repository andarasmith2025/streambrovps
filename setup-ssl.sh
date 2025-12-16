#!/bin/bash

# StreamBro SSL Setup Script
# Domain: nivarastudio.site
# Subdomain: streambro.nivarastudio.site
# VPS IP: 94.237.3.164

set -e

echo "=========================================="
echo "🔒 StreamBro SSL Setup"
echo "=========================================="
echo ""

# Configuration
DOMAIN="nivarastudio.site"
SUBDOMAIN="streambro.nivarastudio.site"
APP_PORT="7575"
EMAIL="admin@nivarastudio.site"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

echo "📋 Configuration:"
echo "  Domain:     $DOMAIN"
echo "  Subdomain:  $SUBDOMAIN"
echo "  App Port:   $APP_PORT"
echo "  Email:      $EMAIL"
echo ""
echo "This script will:"
echo "  1. Install Nginx"
echo "  2. Install Certbot (Let's Encrypt)"
echo "  3. Obtain SSL certificate"
echo "  4. Configure Nginx reverse proxy"
echo "  5. Setup auto-renewal"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Check DNS resolution
echo ""
echo "🔍 Checking DNS resolution..."
DOMAIN_IP=$(dig +short $DOMAIN | tail -n1)
SUBDOMAIN_IP=$(dig +short $SUBDOMAIN | tail -n1)

echo "  $DOMAIN → $DOMAIN_IP"
echo "  $SUBDOMAIN → $SUBDOMAIN_IP"

if [ -z "$DOMAIN_IP" ] || [ -z "$SUBDOMAIN_IP" ]; then
    echo ""
    echo "⚠️  WARNING: DNS not fully propagated yet"
    echo "   SSL certificate may fail to obtain"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Update system
echo ""
echo "📦 Updating system..."
apt update

# Install Nginx
echo ""
echo "📦 Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    echo "✅ Nginx installed"
else
    echo "✅ Nginx already installed"
fi

# Install Certbot
echo ""
echo "📦 Installing Certbot..."
if ! command -v certbot &> /dev/null; then
    apt install -y certbot python3-certbot-nginx
    echo "✅ Certbot installed"
else
    echo "✅ Certbot already installed"
fi

# Stop Nginx temporarily
echo ""
echo "⏸️  Stopping Nginx..."
systemctl stop nginx

# Get SSL certificate
echo ""
echo "🔒 Obtaining SSL certificate..."
echo "   This may take a few minutes..."
echo ""

certbot certonly --standalone \
    -d $DOMAIN \
    -d www.$DOMAIN \
    -d $SUBDOMAIN \
    --non-interactive \
    --agree-tos \
    --email $EMAIL \
    --preferred-challenges http

# Check if certificate was obtained
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo ""
    echo "❌ Failed to obtain SSL certificate"
    echo ""
    echo "Possible reasons:"
    echo "  1. DNS not pointing to this server"
    echo "  2. Port 80 blocked by firewall"
    echo "  3. Domain not accessible from internet"
    echo ""
    echo "Please check and try again"
    exit 1
fi

echo ""
echo "✅ SSL certificate obtained successfully!"

# Create Nginx configuration
echo ""
echo "⚙️  Creating Nginx configuration..."

cat > /etc/nginx/sites-available/streambro << EOF
# HTTP - Redirect to HTTPS
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN $SUBDOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# HTTPS - Main Domain
server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL Certificate
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Proxy to StreamBro
    location / {
        proxy_pass http://localhost:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts for large uploads
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }
    
    # Increase upload size for videos
    client_max_body_size 10G;
    client_body_timeout 600s;
}

# HTTPS - Subdomain
server {
    listen 443 ssl http2;
    server_name $SUBDOMAIN;
    
    # SSL Certificate
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Proxy to StreamBro
    location / {
        proxy_pass http://localhost:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts for large uploads
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }
    
    # Increase upload size for videos
    client_max_body_size 10G;
    client_body_timeout 600s;
}
EOF

echo "✅ Nginx configuration created"

# Enable site
echo ""
echo "🔗 Enabling site..."
ln -sf /etc/nginx/sites-available/streambro /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
echo ""
echo "🧪 Testing Nginx configuration..."
nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Nginx configuration test failed"
    exit 1
fi

echo "✅ Nginx configuration valid"

# Start Nginx
echo ""
echo "▶️  Starting Nginx..."
systemctl start nginx
systemctl enable nginx

echo "✅ Nginx started and enabled"

# Setup auto-renewal
echo ""
echo "🔄 Setting up SSL auto-renewal..."
systemctl enable certbot.timer
systemctl start certbot.timer

# Test auto-renewal
echo ""
echo "🧪 Testing SSL auto-renewal..."
certbot renew --dry-run

if [ $? -eq 0 ]; then
    echo "✅ Auto-renewal test passed"
else
    echo "⚠️  Auto-renewal test failed (but certificate is installed)"
fi

# Configure firewall
echo ""
echo "🔥 Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 80/tcp
    ufw allow 443/tcp
    echo "✅ Firewall rules added"
else
    echo "⚠️  UFW not installed, skipping firewall config"
fi

# Test HTTPS
echo ""
echo "🧪 Testing HTTPS connection..."
sleep 2
if curl -s -o /dev/null -w "%{http_code}" https://$SUBDOMAIN | grep -q "200\|301\|302"; then
    echo "✅ HTTPS working!"
else
    echo "⚠️  HTTPS test inconclusive (may need time to propagate)"
fi

echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "🌐 Your sites are now available at:"
echo "   https://$DOMAIN"
echo "   https://www.$DOMAIN"
echo "   https://$SUBDOMAIN"
echo ""
echo "🔒 SSL Features:"
echo "   ✅ SSL certificate installed"
echo "   ✅ Auto-renewal enabled"
echo "   ✅ HTTP → HTTPS redirect"
echo "   ✅ Security headers added"
echo "   ✅ Port :7575 no longer needed"
echo ""
echo "📝 Next steps:"
echo "   1. Test: https://$SUBDOMAIN"
echo "   2. Update .env GOOGLE_REDIRECT_URI:"
echo "      GOOGLE_REDIRECT_URI=https://$SUBDOMAIN/oauth2/callback"
echo "   3. Update Google Cloud Console OAuth redirect URI"
echo "   4. Close port 7575 in firewall (optional)"
echo ""
echo "🔍 Useful commands:"
echo "   nginx -t              # Test config"
echo "   systemctl status nginx"
echo "   certbot certificates  # View SSL certs"
echo "   certbot renew        # Manual renewal"
echo ""
