import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';

export async function POST(req: NextRequest) {
    try {
        const { cloudinaryId } = await req.json();

        if (!cloudinaryId) {
            return NextResponse.json(
                { success: false, message: 'Missing cloudinaryId' },
                { status: 400 }
            );
        }

        await cloudinary.uploader.destroy(cloudinaryId, {
            resource_type: "auto"
        });

        return NextResponse.json({ success: true });

    } catch (err) {
        return NextResponse.json(
            { success: false, message: 'Delete failed' },
            { status: 500 }
        );
    }
}