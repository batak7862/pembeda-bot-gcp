const express = require('express');
const axios = require('axios');
const dns = require('dns').promises;
const app = express();
const PORT = process.env.PORT || 8080;

// Fungsi Verifikasi DNS Googlebot Resmi
async function isGenuineGooglebot(ip) {
    try {
        const hostnames = await dns.reverse(ip);
        if (!hostnames || hostnames.length === 0) return false;
        const hostname = hostnames[0];
        if (hostname.endsWith('.googlebot.com') || hostname.endsWith('.google.com')) {
            const ips = await dns.resolve(hostname);
            return ips.includes(ip);
        }
    } catch (e) {
        return false;
    }
    return false;
}

// ROUTE DINAMIS: Hanya menangkap nama file belakangnya (:file)
app.get('/:file', async (req, res) => {
    try {
        const bucketName = 'mybotkonten'; 
        let fileName = req.params.file;

        if (!fileName.endsWith('.txt')) {
            fileName = fileName + '.txt';
        }

        const visitorIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
        const userAgent = (req.headers['user-agent'] || '').toLowerCase();
        const cookies = req.headers.cookie || '';

        // 1. Cek Verifikasi Googlebot Resmi lewat IP & DNS
        let isGoogle = false;
        if (userAgent.includes('googlebot') || userAgent.includes('google')) {
            isGoogle = await isGenuineGooglebot(visitorIp);
        }

        // 2. Fitur Tambahan: Jika Anda sedang tes pakai Inspect Element (User Agent mengandung 'googlebot')
        // Maka otomatis diloloskan meskipun IP-nya bukan IP Google asli.
        let isTestingBot = userAgent.includes('googlebot');

        const allowedIps = ["85.92.66.150", "81.19.188.236", "81.19.188.235", "85.92.66.149"];
        const isAllowedIp = allowedIps.includes(visitorIp);
        const hasCookie = cookies.includes('s288');

        // =========================================================================
        // JIKA LOLOS SALAH SATU VALIDASI (TERMASUK SAAT ANDA SIMULASI GOOGLEBOT)
        // =========================================================================
        if (isGoogle || isAllowedIp || hasCookie || isTestingBot) {
            const gcsUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
            const response = await axios.get(gcsUrl, { timeout: 5000 });
            
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            return res.status(200).send(response.data);
        }

        // Jika manusia biasa (Tanpa manipulasi User Agent), layar putih polos
        return res.status(200).send('');
        
    } catch (error) {
        // Jika file tidak ada di bucket atau link salah, tetap layar putih polos
        return res.status(200).send('');
    }
});

app.get('/', (req, res) => {
    return res.status(200).send('');
});

app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
});
