#!/bin/bash
set -euo pipefail

OPENWRT_VERSION="23.05.3"
IMAGE_URL="https://downloads.openwrt.org/releases/${OPENWRT_VERSION}/targets/x86/64/openwrt-${OPENWRT_VERSION}-x86-64-generic-ext4-combined.img.gz"
DISK="/data/openwrt.img"
KEY="/data/forte_key"
MOUNT="/mnt/openwrt"

# ── Install tools ─────────────────────────────────────────────────────────────
if ! command -v qemu-system-x86_64 &>/dev/null; then
    echo "▶ Installing QEMU + tools..."
    apt-get update -qq
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
        qemu-system-x86 qemu-utils openssh-client curl kpartx
fi

# ── Generate SSH keypair (once) ───────────────────────────────────────────────
if [ ! -f "$KEY" ]; then
    ssh-keygen -t ed25519 -N "" -f "$KEY"
    echo "▶ SSH keypair generated."
fi

# ── Download image (once) ─────────────────────────────────────────────────────
if [ ! -f "$DISK" ]; then
    echo "▶ Downloading OpenWRT ${OPENWRT_VERSION}..."
    curl -L "$IMAGE_URL" -o "${DISK}.gz"
    gunzip "${DISK}.gz"
    qemu-img resize "$DISK" 512M
    echo "▶ Image ready."

    # ── Pre-configure: inject SSH key + set root password via loop mount ──────
    echo "▶ Pre-configuring image (SSH key + root password)..."
    PUBKEY=$(cat "${KEY}.pub")

    # Map partitions from the raw image
    LOOPDEV=$(losetup -f)
    losetup -P "$LOOPDEV" "$DISK"
    # OpenWRT x86 combined image: p1=grub, p2=rootfs
    mkdir -p "$MOUNT"
    mount "${LOOPDEV}p2" "$MOUNT"

    # Set empty root password (allows SSH with key auth; dropbear accepts this)
    sed -i 's|^root:[^:]*:|root::|' "${MOUNT}/etc/shadow" 2>/dev/null || true
    sed -i 's|^root:[^:]*:|root::|' "${MOUNT}/etc/passwd" 2>/dev/null || true

    # Inject SSH public key
    mkdir -p "${MOUNT}/etc/dropbear"
    echo "$PUBKEY" > "${MOUNT}/etc/dropbear/authorized_keys"
    chmod 600 "${MOUNT}/etc/dropbear/authorized_keys"

    # Enable dropbear on boot (create symlink if missing)
    ln -sf /etc/init.d/dropbear \
        "${MOUNT}/etc/rc.d/S50dropbear" 2>/dev/null || true

    umount "$MOUNT"
    losetup -d "$LOOPDEV"
    echo "▶ Image pre-configured."
fi

# ── Boot OpenWRT ──────────────────────────────────────────────────────────────
echo "▶ Booting OpenWRT ${OPENWRT_VERSION} (KVM)..."
qemu-system-x86_64 \
    -enable-kvm \
    -m 256M \
    -drive  file="$DISK",format=raw,if=virtio \
    -netdev user,id=lan,net=10.0.2.0/24,host=10.0.2.2,hostfwd=tcp::2222-:22,hostfwd=tcp::8080-:80 \
    -device virtio-net-pci,netdev=lan,mac=52:54:00:11:22:33 \
    -netdev user,id=captive,net=10.0.3.0/24,host=10.0.3.2 \
    -device virtio-net-pci,netdev=captive,mac=52:54:00:44:55:66 \
    -display none \
    -serial mon:stdio &

QEMU_PID=$!
echo "▶ QEMU PID: $QEMU_PID"

# ── Wait for SSH to come up ───────────────────────────────────────────────────
echo "▶ Waiting for SSH (up to 60s)..."
for i in $(seq 1 12); do
    if ssh -p 2222 -i "$KEY" \
        -o ConnectTimeout=4 \
        -o BatchMode=yes \
        -o StrictHostKeyChecking=no \
        root@127.0.0.1 "echo OK" 2>/dev/null; then
        echo ""
        echo "✅ OpenWRT is up and SSH is ready."
        echo "   SSH : ssh -p 2222 -i ${KEY} root@127.0.0.1"
        echo "   Web : http://localhost:8080"
        break
    fi
    printf "."
    sleep 5
done

# Keep container alive
wait $QEMU_PID
