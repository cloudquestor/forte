#!/bin/sh
# init.sh — OpenWRT container init for forte test rig

# Generate dropbear host keys
mkdir -p /etc/dropbear
[ -f /etc/dropbear/dropbear_rsa_host_key ]     || dropbearkey -t rsa     -f /etc/dropbear/dropbear_rsa_host_key     > /dev/null 2>&1
[ -f /etc/dropbear/dropbear_ed25519_host_key ] || dropbearkey -t ed25519 -f /etc/dropbear/dropbear_ed25519_host_key > /dev/null 2>&1

# Generate a client keypair for the test rig (stored in /etc/forte/)
mkdir -p /etc/forte
if [ ! -f /etc/forte/id_ed25519 ]; then
    dropbearkey -t ed25519 -f /etc/forte/id_ed25519 > /dev/null 2>&1
    dropbearkey -y -f /etc/forte/id_ed25519 | grep ^ssh > /etc/forte/id_ed25519.pub
fi

# Authorize the key for root login
mkdir -p /root/.ssh
cp /etc/forte/id_ed25519.pub /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys

# Start dropbear: password auth ON, root login ON
/usr/sbin/dropbear -F -E -p 22 &   # password auth enabled
DROPBEAR_PID=$!

# Start uhttpd (LuCI) if available
/usr/sbin/uhttpd -f -h /www -p 80 2>/dev/null &

echo ""
echo "✅ OpenWRT simulation ready"
echo "   Container IP (lan)     : 10.99.1.2"
echo "   Container IP (captive) : 10.99.2.2"
echo "   SSH key                : /etc/forte/id_ed25519"
echo ""

wait $DROPBEAR_PID
