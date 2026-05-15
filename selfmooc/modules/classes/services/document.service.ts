import {
    getClassAndCourseDocumentsDB,
    createClassDocumentDB,
    deleteClassDocumentDB
} from '../models/document.model';

import { ObjectId, GridFSBucket } from 'mongodb';
import { getMongoDb } from '@/lib/db';
import { Readable } from 'stream';

// 1. Lấy danh sách tài liệu của Lớp học
export async function getClassDocumentsService(classId: number) {
    const pgDocs = await getClassAndCourseDocumentsDB(classId);

    if (pgDocs.length === 0) return [];

    const pgDocIds = pgDocs.map(d => d.document_id);

    const db = await getMongoDb();

    const mongoDocs = await db
        .collection('document_content')
        .find({ pg_document_id: { $in: pgDocIds } })
        .toArray();

    return pgDocs.map(pgDoc => {
        const mongoDoc = mongoDocs.find(
            m => m.pg_document_id === pgDoc.document_id
        );

        return {
            ...pgDoc,
            storage_url: mongoDoc?.storage_url || '#'
        };
    });
}

// 2. Upload file lên GridFS
export async function uploadClassFileToMongoGridFS(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
) {
    const db = await getMongoDb();
    const bucket = new GridFSBucket(db, { bucketName: 'course_files' });

    return new Promise<string>((resolve, reject) => {
        const uploadStream = bucket.openUploadStream(fileName, {
            metadata: {
                contentType: mimeType
            }
        });

        const readableStream = new Readable();
        readableStream.push(fileBuffer);
        readableStream.push(null);

        readableStream
            .pipe(uploadStream)
            .on('error', reject)
            .on('finish', () => {
                resolve(uploadStream.id.toString());
            });
    });
}

// 3. Tạo tài liệu lớp
export async function createClassDocumentService(
    teacherId: number,
    data: any
) {
    const newMongoId = new ObjectId();

    try {
        const newPgDocument = await createClassDocumentDB({
            class_id: data.class_id,
            uploaded_by: teacherId,
            title: data.title,
            description: data.description,
            doc_type: data.doc_type,
            chapter: data.chapter,
            file_ext: data.file_ext,
            file_size_kb: data.file_size_kb,
            mongo_id: newMongoId.toString()
        });

        const mongoDb = await getMongoDb();

        await mongoDb.collection('document_content').insertOne({
            _id: newMongoId,
            pg_document_id: newPgDocument.document_id,
            title: data.title,

            // ⚠️ quan trọng: giữ đúng field từ action
            storage_url: data.storage_url,

            cdn_url: data.cdn_url || '',
            processing_status: 'done',
            created_at: new Date(),
            updated_at: new Date()
        });

        return newPgDocument;
    } catch (error: any) {
        console.error("ERROR REAL:", error);

        throw new Error(
            error?.message || 'Lỗi hệ thống khi đồng bộ tài liệu lớp'
        );
    }
}

// 4. Xóa tài liệu lớp
export async function deleteClassDocumentService(
    documentId: number,
    teacherId: number
) {
    const mongoIdStr = await deleteClassDocumentDB(documentId, teacherId);

    if (!mongoIdStr) {
        throw new Error('Không thể xóa. Tài liệu không tồn tại hoặc bạn không có quyền!');
    }

    try {
        const db = await getMongoDb();
        const mongoId = new ObjectId(mongoIdStr);

        const documentContent = await db
            .collection('document_content')
            .findOne({ _id: mongoId });

        if (documentContent) {
            if (
                documentContent.storage_url &&
                documentContent.storage_url.includes('/api/files/')
            ) {
                const gridFsFileIdStr = documentContent.storage_url.split('/').pop();

                if (gridFsFileIdStr) {
                    const bucket = new GridFSBucket(db, { bucketName: 'course_files' });

                    try {
                        await bucket.delete(new ObjectId(gridFsFileIdStr));
                        console.log(`🗑️ Đã xóa file lớp trong GridFS: ${gridFsFileIdStr}`);
                    } catch (err) {
                        console.log(`⚠️ File không tồn tại trong GridFS`);
                    }
                }
            }

            await db.collection('document_content').deleteOne({ _id: mongoId });

            console.log(`🗑️ Đã xóa metadata tài liệu lớp: ${mongoIdStr}`);
        }

        return true;
    } catch (error: any) {
        console.error('🔥 Lỗi khi dọn rác MongoDB:', error);
        return true;
    }
}