#!/usr/bin/env bash

set -e


case "$1" in
    *)
        echo "Unknown command: $1"
        echo "Usage: ./runproject []"
        exit 1
        ;;
esac
