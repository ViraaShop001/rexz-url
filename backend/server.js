import express from 'express';
import multer from 'multer';
import cors from 'cors';
import ImageKit from 'imagekit';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Konfigurasi ImageKit[citation:5]
const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY || 'public_wN50iPpj+Rgpv98G7G5axaps5Lk=',
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY || 'private_mj1C5ffe8w4rqRpVNodmzSwNzRs=',
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/rexz'
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('frontend'));

// Konfigurasi Multer (memory storage)[citation:3]
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/webm', 'video/quicktime',
            'audio/mpeg', 'audio/wav', 'audio/ogg',
            'application/pdf',
            'application/zip', 'application/x-rar-compressed'
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipe file tidak didukung'), false);
        }
    }
});

// Sanitize filename
function sanitizeFilename(filename) {
    return filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

// Endpoint upload
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Tidak ada file yang diupload'
            });
        }

        // Validasi file size
        if (req.file.size > 100 * 1024 * 1024) {
            return res.status(400).json({
                success: false,
                error: 'File terlalu besar. Maksimal 100MB'
            });
        }

        const sanitizedFilename = sanitizeFilename(req.file.originalname);
        
        // Upload ke ImageKit[citation:5]
        const uploadResponse = await imagekit.upload({
            file: req.file.buffer,
            fileName: sanitizedFilename,
            folder: '/rexz-official'
        });

        // Response sukses
        const response = {
            success: true,
            fileUrl: uploadResponse.url,
            thumbnailUrl: uploadResponse.thumbnailUrl,
            fileId: uploadResponse.fileId,
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            fileName: sanitizedFilename,
            uploadTime: new Date().toISOString()
        };

        res.json(response);

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            error: 'Terjadi kesalahan saat mengupload file'
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File terlalu besar. Maksimal 100MB'
            });
        }
    }
    
    res.status(500).json({
        success: false,
        error: error.message
    });
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'frontend', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server Rexz Official berjalan di http://localhost:${PORT}`);
    console.log(`📁 Endpoint Upload: POST http://localhost:${PORT}/upload`);
});
