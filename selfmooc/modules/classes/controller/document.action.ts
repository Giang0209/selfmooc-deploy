'use server';

import { cookies } from 'next/headers';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

// 👉 CHUYỂN SANG CLASS SERVICE
import {
    getClassDocumentsService,
    createClassDocumentService,
    deleteClassDocumentService,
    uploadClassFileToMongoGridFS
} from '../services/document.service';

function getUserFromToken(token: string) {
    try {
        const payload = token.split('.')[1];
        return JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
    } catch (error) {
        return null;
    }
}

// 1. GET CLASS DOCS
export async function getClassDocsAction(classId: number) {
    try {
        const docs = await getClassDocumentsService(classId);

        return {
            success: true,
            data: docs
        };
    } catch (error) {
        return {
            success: false,
            data: []
        };
    }
}

// 2. CREATE CLASS DOC
export async function createClassDocAction(formData: FormData) {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;

    if (!token) return { success: false, message: 'Chưa đăng nhập' };

    const user = getUserFromToken(token);
    if (!user || user.role !== 'teacher') {
        return { success: false, message: 'Chỉ giáo viên mới được thao tác' };
    }

    const classId = Number(formData.get('class_id'));

    const file = formData.get('file') as File;
    if (!file || file.size === 0) {
        return { success: false, message: 'Không tìm thấy file hợp lệ' };
    }

    const schema = z.object({
        title: z.string().min(3, 'Tên tài liệu quá ngắn'),
        doc_type: z.enum(["lecture", "exercise", "reference", "video", "other"]),
        chapter: z.string().optional(),
        description: z.string().optional(),
        file_ext: z.string().optional(),
        file_size_kb: z.coerce.number().optional()
    });

    const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) {
        return { success: false, message: parsed.error.issues[0].message };
    }

    try {
        const buffer = Buffer.from(await file.arrayBuffer());

        // upload GridFS
        const gridFsFileId = await uploadClassFileToMongoGridFS(
            buffer,
            file.name,
            file.type
        );

        // ⚠️ QUAN TRỌNG: phải có storage_url
        const storageUrl = `/api/files/${gridFsFileId}`;

        await createClassDocumentService(user.id, {
            ...parsed.data,
            class_id: classId,
            gridfs_file_id: gridFsFileId,
            storage_url: storageUrl
        });

        revalidatePath(`/classes/${classId}`);

        return {
            success: true,
            message: '📄 Upload tài liệu lớp thành công!'
        };
    } catch (error: any) {
        console.error(error);
        return {
            success: false,
            message: 'Lỗi khi lưu file: ' + error.message
        };
    }
}

// 3. DELETE CLASS DOC
export async function deleteClassDocAction(
    documentId: number,
    classId: number
) {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;

    const user = token ? getUserFromToken(token) : null;
    if (!user || user.role !== 'teacher') {
        return { success: false, message: 'Không có quyền' };
    }

    try {
        await deleteClassDocumentService(documentId, user.id);
        revalidatePath(`/classes/${classId}`);

        return {
            success: true,
            message: '🗑️ Đã xóa tài liệu lớp'
        };
    } catch (error: any) {
        return {
            success: false,
            message: error.message
        };
    }
}