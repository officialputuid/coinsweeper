# coinsweeper

## Prerequisites
```bash
sudo apt update -y && sudo apt install nodejs -y
```

## Installation
```bash
git clone https://github.com/officialputuid/coinsweeper && cd coinsweeper && npm i
```

## Configuration
- Add `query_id=xxxx` or `user_id=xxxx` to `data.txt`.
- Set proxies in `proxy.txt`: `http://user:pass@ip:port`.

## Usage
| | |
|--------------------------|--------------------------------|
| `node coinsweeper`           | Start coinsweeper.         |
| `node coinsweeper-proxy`     | Start with proxy support.  |
