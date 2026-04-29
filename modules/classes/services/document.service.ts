import {
    getClassDocumentsDB,
    createClassDocumentDB,
    deleteDocumentDB
} from '../models/document.model';


// =======================
// 1. GET
// =======================
export async function getClassDocumentsService(classId: number) {
    return await getClassDocumentsDB(classId);
}


// =======================
// 2. CREATE
// =======================
export async function createClassDocumentService(
    teacherId: number,
    data: any
) {
    return await createClassDocumentDB({
        class_id: data.class_id,
        uploaded_by: teacherId,
        title: data.title,
        description: data.description,
        doc_type: data.doc_type,
        chapter: data.chapter,
        file_ext: data.file_ext,
        file_size_kb: data.file_size_kb,
        file_url: data.file_url,
        cloudinary_id: data.cloudinary_id
    });
}


// =======================
// 3. DELETE (FIXED)
// =======================
export async function deleteClassDocumentService(
    documentId: number,
    teacherId: number
) {
    const cloudinaryId = await deleteDocumentDB(documentId, teacherId);

    if (!cloudinaryId) {
        throw new Error("Không có quyền hoặc tài liệu không tồn tại");
    }

    // 👉 QUAN TRỌNG: trả về ID để action xoá cloudinary
    return cloudinaryId;
}