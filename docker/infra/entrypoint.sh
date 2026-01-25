#!/bin/bash
set -e

# Start dnsmasq in background
dnsmasq --conf-file=/etc/dnsmasq.conf --log-dhcp &

# Start nginx in foreground
nginx -g "daemon off;"
