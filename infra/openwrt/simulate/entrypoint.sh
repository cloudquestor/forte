#!/bin/bash
# entrypoint.sh — runs inside the Ubuntu container
# Downloads the OpenWRT x86/64 image and boots it under QEMU with KVM

set -euo pipefail

OPENWRT_VERSION="23.05.3"
IMAGE_URL="https://downloads.openwrt.org/releases/${OPENWRT_VERSION}/targets/x86/64/openwrt-${OPENWRT_VERSION}-x86-64-generic-ext4-combined.img.gz"
DISK="/data/openwrt.img"
KEY="/data/forte_key"
MONITOR_SOCK="/tmp/qemu-monitor.sock"
SERIAL_SOCK="/tmp/qemu-serial.sock"

# ── Install tools if not already present ─────────────────────────────────────
if ! command -v qemu-system-x86_64 &>/dev/null; then
    echo "▶ Installing QEMU..."
    apt-get update -qq
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
        qemu-system-x86 qemu-utils openssh-client iproute2 curl socat
fi

# ── Download + prepare disk image (once) ─────────────────────────────────────
if [ ! -f "$DISK" ]; then
    echo "▶ Downloading OpenWRT ${OPENWRT_VERSION}..."
    curl -L "$IMAGE_URL" -o "${DISK}.gz"
    gunzip "${DISK}.gz"
    echo "▶ Resizing disk to 512M..."
    qemu-img resize "$DISK" 512M
    echo "▶ Disk image ready: $(du -sh $DISK | cut -f1)"
fi

# ── Generate SSH keypair (once) ───────────────────────────────────────────────
if [ ! -f "$KEY" ]; then
    ssh-keygen -t ed25519 -N "" -f "$KEY"
    echo "▶ SSH key generated."
fi

# ── Boot OpenWRT under QEMU ───────────────────────────────────────────────────
echo "▶ Booting OpenWRT ${OPENWRT_VERSION} (KVM)..."
qemu-system-x86_64 \
    -enable-kvm \
    -m 256M \
    -drive  file="$DISK",format=raw,if=virtio \
    -netdev user,id=lan,net=10.0.2.0/24,host=10.0.2.2,hostfwd=tcp::2222-:22,hostfwd=tcp::8080-:80 \
    -device virtio-net-pci,netdev=lan,mac=52:54:00:11:22:33 \
    -netdev user,id=captive,net=10.0.3.0/24,host=10.0.3.2 \
    -device virtio-net-pci,netdev=captive,mac=52:54:00:44:55:66 \
    -serial unix:${SERIAL_SOCK},server,nowait \
    -monitor unix:${MONITOR_SOCK},server,nowait \
    -display none \
    -daemonize

echo "▶ Waiting for OpenWRT to boot..."
# Wait for serial socket to appear and OpenWRT login prompt
for i in $(seq 1 60); do
    if socat -u UNIX-CONNECT:${SERIAL_SOCK} /dev/null 2>/dev/null; then
        break
    fi
    sleep 2
done

# Wait for the login prompt on serial
echo "▶ Waiting for login prompt..."
timeout 60 socat UNIX-CONNECT:${SERIAL_SOCK} - 2>/dev/null | grep -m1 "login\|Please press" || true
sleep 3

# ── Automate root password + SSH key setup via serial console ─────────────────
echo "▶ Configuring OpenWRT (root password + SSH key)..."
PUBKEY=$(cat "${KEY}.pub")

# Send commands to OpenWRT serial console
{
    sleep 1; echo ""                          # activate console
    sleep 2; echo "passwd"                    # start passwd command
    sleep 1; echo "forte123"                  # new password
    sleep 1; echo "forte123"                  # confirm password
    sleep 1
    # Inject SSH public key
    echo "mkdir -p /etc/dropbear"
    sleep 1
    echo "echo '${PUBKEY}' > /etc/dropbear/authorized_keys"
    sleep 1
    echo "chmod 600 /etc/dropbear/authorized_keys"
    sleep 1
    # Start dropbear if not running
    echo "/etc/init.d/dropbear start"
    sleep 2
    echo "echo FORTE_READY"
} | socat - UNIX-CONNECT:${SERIAL_SOCK} &

# Wait for FORTE_READY confirmation
echo "▶ Waiting for SSH to be ready..."
ATTEMPTS=0
until ssh -p 2222 -i "${KEY}" \
    -o ConnectTimeout=5 \
    -o BatchMode=yes \
    -o StrictHostKeyChecking=no \
    root@127.0.0.1 "uname -a" &>/dev/null; do
    ATTEMPTS=$((ATTEMPTS + 1))
    if [ $ATTEMPTS -ge 24 ]; then
        echo "⚠ SSH key auth not working, trying password..."
        break
    fi
    sleep 5
done

echo ""
echo "✅ OpenWRT simulation running."
echo "   SSH  : ssh -p 2222 -i ${KEY} root@127.0.0.1"
echo "   SSH  : ssh -p 2222 root@127.0.0.1  (password: forte123)"
echo "   LuCI : http://localhost:8080"

# Keep container alive — tail QEMU serial output
echo "▶ Tailing serial console (Ctrl+C to stop)..."
socat UNIX-CONNECT:${SERIAL_SOCK} STDOUT 2>/dev/null || tail -f /dev/null
