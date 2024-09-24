const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const readline = require('readline');
const { HttpsProxyAgent } = require('https-proxy-agent');

class ByBit {
    constructor() {
        this.headers = {
            "Accept": "application/json, text/plain, */*",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
            "Content-Type": "application/json",
            "Origin": "https://bybitcoinsweeper.com",
            "Referer": "https://bybitcoinsweeper.com/",
            "Sec-Ch-Ua": '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
            "Sec-Ch-Ua-Mobile": "?1",
            "Sec-Ch-Ua-Platform": '"Android"',
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-site",
            "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36"
        };
        this.info = { score: 0 };
        this.proxies = this.loadProxies();
    }

    loadProxies() {
        const proxyFile = path.join(__dirname, 'proxy.txt');
        return fs.readFileSync(proxyFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);
    }

    log(msg, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        switch(type) {
            case 'success':
                console.log(`[${timestamp}] [*] ${msg}`.green);
                break;
            case 'custom':
                console.log(`[${timestamp}] [*] ${msg}`.magenta);
                break;        
            case 'error':
                console.log(`[${timestamp}] [!] ${msg}`.red);
                break;
            case 'warning':
                console.log(`[${timestamp}] [*] ${msg}`.yellow);
                break;
            default:
                console.log(`[${timestamp}] [*] ${msg}`.blue);
        }
    }

    async wait(seconds) {
        for (let i = seconds; i > 0; i--) {
            const timestamp = new Date().toLocaleTimeString();
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`[${timestamp}] [*] Chờ ${i} giây để tiếp tục...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        readline.cursorTo(process.stdout, 0);
        readline.clearLine(process.stdout, 0);
    }

    async login(userData, proxyAgent) {
        const url = "https://api.bybitcoinsweeper.com/api/auth/login";
        const payload = {
            firstName: userData.first_name,
            lastName: userData.last_name || "",
            telegramId: userData.id.toString(),
            userName: userData.username
        };

        try {
            const response = await axios.post(url, payload, { 
                headers: this.headers,
                httpsAgent: proxyAgent
            });
            if (response.status === 201) {
                this.headers['Authorization'] = `Bearer ${response.data.accessToken}`;
                return { 
                    success: true, 
                    accessToken: response.data.accessToken,
                    refreshToken: response.data.refreshToken,
                    userId: response.data.id
                };
            } else {
                return { success: false, error: "Unexpected status code" };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async score(proxyAgent) {
        for (let i = 0; i < 3; i++) {
            try {
                const gametime = Math.floor(Math.random() * (300 - 90 + 1)) + 90;
                const score = Math.floor(Math.random() * (900 - 600 + 1)) + 600;
                
                this.log(`Bắt đầu game ${i + 1}/3. Thời gian chơi: ${gametime} giây`, 'info');
                await this.wait(gametime);
                
                const game_data = {
                    'gameTime': gametime,
                    'score': score
                };
                
                const res = await axios.patch('https://api.bybitcoinsweeper.com/api/users/score', game_data, { 
                    headers: this.headers,
                    httpsAgent: proxyAgent
                });
                
                if (res.status === 200) {
                    this.info.score += score;
                    this.log(`Chơi Game Thành Công: nhận được ${score} điểm | Tổng : ${this.info.score}`, 'custom');
                } else if (res.status === 401) {
                    this.log('Token hết hạn, cần đăng nhập lại', 'warning');
                    return false;
                } else {
                    this.log(`Đã Xảy Ra Lỗi Với Mã ${res.status}`, 'error');
                }
                
                await this.wait(5);
            } catch (error) {
                this.log('Đã Yêu Cầu Quá Nhiều Lần Vui Lòng Chờ', 'warning');
                await this.wait(60);
            }
        }
        return true;
    }

    async checkProxyIP(proxy) {
        try {
            const proxyAgent = new HttpsProxyAgent(proxy);
            const response = await axios.get('https://api.ipify.org?format=json', { httpsAgent: proxyAgent });
            if (response.status === 200) {
                return response.data.ip;
            } else {
                throw new Error(`Không thể kiểm tra IP của proxy. Status code: ${response.status}`);
            }
        } catch (error) {
            throw new Error(`Error khi kiểm tra IP của proxy: ${error.message}`);
        }
    }

    async main() {
        const dataFile = path.join(__dirname, 'data.txt');
        const data = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);

        while (true) {
            for (let i = 0; i < data.length; i++) {
                const initData = data[i];
                const userData = JSON.parse(decodeURIComponent(initData.split('user=')[1].split('&')[0]));
                const proxy = this.proxies[i % this.proxies.length];
                const proxyAgent = new HttpsProxyAgent(proxy);

                let proxyIP = 'Unknown';
                try {
                    proxyIP = await this.checkProxyIP(proxy);
                } catch (error) {
                    this.log(`Lỗi khi kiểm tra IP của proxy: ${error.message}`, 'error');
                    continue;
                }

                console.log(`========== Tài khoản ${i + 1} | ${userData.first_name.green} | ip: ${proxyIP} ==========`);
                
                this.log(`Đang đăng nhập tài khoản ${userData.id}...`, 'info');
                const loginResult = await this.login(userData, proxyAgent);
                if (loginResult.success) {
                    this.log('Đăng nhập thành công!', 'success');
                    const gameResult = await this.score(proxyAgent);
                    if (!gameResult) {
                        this.log('Cần đăng nhập lại, chuyển sang tài khoản tiếp theo', 'warning');
                    }
                } else {
                    this.log(`Đăng nhập không thành công! ${loginResult.error}`, 'error');
                }

                if (i < data.length - 1) {
                    await this.wait(3);
                }
            }

            await this.wait(3);
        }
    }
}

const client = new ByBit();
client.main().catch(err => {
    client.log(err.message, 'error');
    process.exit(1);
});
