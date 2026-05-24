#!/bin/bash
img_name="forlove10grams:node-22-alpine"
port_num=9000

# 解析參數
while [ $# -gt 0 ]; do
  case $1 in
    --img_name=*)
      img_name="${1#*=}"
      ;;
    --port_num=*)
      port_num="${1#*=}"
      ;;
  esac
  shift
done
echo "Image name: $img_name"
echo "Port number: $port_num"

docker run -itd -p $port_num:3000 -v ./forlove10grams:/workspace -w /workspace "$img_name"
