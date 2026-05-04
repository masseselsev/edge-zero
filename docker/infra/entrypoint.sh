#!/bin/bash
set -e

# Ensure PXE files are in the volume
echo "Syncing PXE boot files..."
cp -n /tftpboot/* /mnt/infra_config/tftp/

# Start dnsmasq in background
dnsmasq --conf-file=/etc/dnsmasq.conf --log-dhcp --no-daemon &

# Start nginx in foreground
nginx -g "daemon off;"
