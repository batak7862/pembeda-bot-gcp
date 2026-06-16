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
        const bucketName = 'mybotkonten'; // Kunci otomatis ke bucket Anda
        let fileName = req.params.file;

        // Otomatis tambahkan ekstensi .txt jika tidak ditulis di URL
        if (!fileName.endsWith('.txt')) {
            fileName = fileName + '.txt';
        }

        const visitorIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
        const userAgent = (req.headers['user-agent'] || '').toLowerCase();
        const cookies = req.headers.cookie || '';

        let isGoogle = false;
        if (userAgent.includes('googlebot') || userAgent.includes('google')) {
            isGoogle = await isGenuineGooglebot(visitorIp);
        }

        const allowedIps = ["85.92.66.150", "81.19.188.236", "81.19.188.235", "85.92.66.149"];
        const isAllowedIp = allowedIps.includes(visitorIp);
        const hasCookie = cookies.includes('s288');

        // =========================================================================
        // KONDISI KHUSUS GOOGLEBOT / IP WHITELIST / COOKIE BYPASS
        // =========================================================================
        if (isGoogle || isAllowedIp || hasCookie) {
            // Mengambil langsung dari bucket 'mybotkonten' yang sudah Anda buka aksesnya tadi
            const gcsUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
            const response = await axios.get(gcsUrl, { timeout: 5000 });
            
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            return res.status(200).send(response.data);
        }

        // Jika manusia biasa yang akses, berikan layar putih kosong tanpa HTML
        return res.status(200).send('');
        
    } catch (error) {
        // Jika file tidak ditemukan atau error sistem, berikan respons kosong
        return res.status(200).send('');
    }
});

// Jalur utama jika diakses tanpa nama file (/) -> Layar putih kosong
app.get('/', (req, res) => {
    return res.status(200).send('');
});

app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
});
