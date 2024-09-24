const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const readline = require('readline');

class ByBit {
    constructor() {
        this.headers = {
            "Accept": "application/json, text/plain, */*",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "en-US,en;q=0.9,fr-FR;q=0.8,fr;q=0.7,vi-VN;q=0.6,vi;q=0.5",
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
            process.stdout.write(`[${timestamp}] [*] Waiting ${i} seconds to continue...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        readline.cursorTo(process.stdout, 0);
        readline.clearLine(process.stdout, 0);
    }

    async login(userData) {
        const url = "https://api.bybitcoinsweeper.com/api/auth/login";
        const payload = {
            firstName: userData.first_name,
            lastName: userData.last_name || "",
            telegramId: userData.id.toString(),
            userName: userData.username
        };

        try {
            const response = await axios.post(url, payload, { headers: this.headers });
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

    async score() {
        for (let i = 0; i < 3; i++) {
            try {
                const gametime = Math.floor(Math.random() * (300 - 90 + 1)) + 90; // 90 to 300 seconds (1.5 to 5 minutes)
                const score = Math.floor(Math.random() * (900 - 600 + 1)) + 600; // 600 to 900 points
                
                this.log(`Starting game ${i + 1}/3. Play time: ${gametime} seconds`, 'info');
                await this.wait(gametime);
                
                const game_data = {
                    'gameTime': gametime,
                    'score': score
                };
                
                const res = await axios.patch('https://api.bybitcoinsweeper.com/api/users/score', game_data, { headers: this.headers });
                
                if (res.status === 200) {
                    this.info.score += score;
                    this.log(`Game Played Successfully: received ${score} points | Total: ${this.info.score}`, 'custom');
                } else if (res.status === 401) {
                    this.log('Token expired, need to log in again', 'warning');
                    return false;
                } else {
                    this.log(`An Error Occurred With Code ${res.status}`, 'error');
                }
                
                await this.wait(5);
            } catch (error) {
                this.log('Too Many Requests, Please Wait', 'warning');
                await this.wait(60);
            }
        }
        return true;
    }

    async main() {
        const xTitle = "\n\x1b[1mBybit coinsweeper\x1b[0m";
        const additionalText = "\nIf you use it, don't be afraid.\nIf you're afraid, don't use it.\nDo With Your Own Risk!\n";
        
        console.log(xTitle.green);
        console.log(additionalText.yellow);

        const dataFile = path.join(__dirname, 'data.txt');
        const data = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);

        while (true) {
            for (let i = 0; i < data.length; i++) {
                const initData = data[i];
                const userData = JSON.parse(decodeURIComponent(initData.split('user=')[1].split('&')[0]));

                console.log(`========== Account ${i + 1} | ${userData.first_name.green} ==========`);

                this.log(`Logging into account ${userData.id}...`, 'info');
                const loginResult = await this.login(userData);
                if (loginResult.success) {
                    this.log('Login successful!', 'success');
                    const gameResult = await this.score();
                    if (!gameResult) {
                        this.log('Need to log in again, moving to the next account', 'warning');
                    }
                } else {
                    this.log(`Login failed! ${loginResult.error}`, 'error');
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
