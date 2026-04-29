import { NextResponse } from 'next/server';
import axios from 'axios';
import { pgPool } from '@/lib/db';

async function getDocument(id: number) {
    const client = await pgPool.connect();
    try {
        const res = await client.query(
            `SELECT title, file_url, file_ext
       FROM document
       WHERE document_id = $1`,
            [id]
        );
        return res.rows[0];
    } finally {
        client.release();
    }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ message: 'Missing id' }, { status: 400 });
    }

    const doc = await getDocument(Number(id));

    if (!doc) {
        return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    const response = await axios.get(doc.file_url, {
        responseType: 'arraybuffer',
    });

    return new NextResponse(response.data, {
        headers: {
            // 🔥 QUAN TRỌNG: ép download đúng file type
            'Content-Type': 'application/octet-stream',

            // 🔥 QUAN TRỌNG: ép đúng tên + đúng đuôi file
            'Content-Disposition': `attachment; filename="${doc.title}.${doc.file_ext || 'file'}"`
        },
    });
}