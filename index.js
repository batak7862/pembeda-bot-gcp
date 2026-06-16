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

// ROUTE DINAMIS: /:bucket/:file
// :bucket akan menangkap nama bucket, :file akan menangkap nama filenya
app.get('/:bucket/:file', async (req, res) => {
    try {
        // 1. Tangkap parameter dinamis dari URL browser
        const bucketName = req.params.bucket;
        let fileName = req.params.file;

        // Otomatis tambahkan ekstensi .txt jika pengunjung tidak menulisnya di URL
        if (!fileName.endsWith('.txt')) {
            fileName = fileName + '.txt';
        }

        // 2. Ambil data identitas pengunjung
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
        // KONDISI JIKA YANG DATANG GOOGLEBOT RESMI / IP WHITELIST / COOKIE BYPASS
        // =========================================================================
        if (isGoogle || isAllowedIp || hasCookie) {
            
            // Menggabungkan URL Google Cloud Storage secara dinamis berdasarkan parameter URL
            const gcsUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
            
            const response = await axios.get(gcsUrl, { timeout: 5000 });
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            return res.status(200).send(response.data);
        }

        // =========================================================================
        // KONDISI JIKA YANG DATANG MANUSIA (KONTEN ASLI WEBSITE ANDA)
        // =========================================================================
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(`
            <!DOCTYPE html>
            <html lang="id">
            <head><meta charset="UTF-8"><title>Website Resmi Saya</title></head>
            <body>
                <h1>Selamat Datang di Website Utama</h1>
                <p>Ini adalah halaman asli yang hanya bisa dilihat oleh pengunjung manusia biasa.</p>
            </body>
            </html>
        `);
        
    } catch (error) {
        // Jika file di GCP tidak ditemukan atau error sistem, arahkan ke halaman normal manusia
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.status(200).send("<h1>Selamat Datang di Website Utama</h1>");
    }
});

// Cadangan untuk route utama "/" jika diakses langsung tanpa parameter agar tidak error 404
app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send("<h1>Selamat Datang di Website Utama</h1>");
});

app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
});
