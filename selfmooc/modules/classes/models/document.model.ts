import { pgPool } from '@/lib/db';

export async function getClassAndCourseDocumentsDB(classId: number) {
    const client = await pgPool.connect();

    try {
        const courseRes = await client.query(
            `SELECT course_id FROM class WHERE class_id = $1`,
            [classId]
        );

        const courseId = courseRes.rows[0]?.course_id;

        const result = await client.query(
            `
      SELECT 
        document_id,
        title,
        description,
        doc_type,
        chapter,
        file_ext,
        file_size_kb,
        is_visible,
        class_id,
        course_id,
        created_at,
        CASE 
          WHEN class_id = $1 THEN 'class'
          ELSE 'course'
        END AS source_type
      FROM document
      WHERE class_id = $1
         OR course_id = $2
      ORDER BY created_at DESC
      `,
            [classId, courseId]
        );

        return result.rows;
    } finally {
        client.release();
    }
}
// 2. Thêm tài liệu mới vào Lớp học
export async function createClassDocumentDB(data: {
    class_id: number;
    uploaded_by: number;
    title: string;
    description?: string;
    doc_type: string;
    chapter?: string;
    file_ext?: string;
    file_size_kb?: number;
    mongo_id: string;
}) {
    const client = await pgPool.connect();
    try {
        const query = `
      INSERT INTO document (
        class_id,
        uploaded_by,
        title,
        description,
        doc_type,
        chapter,
        file_ext,
        file_size_kb,
        mongo_id
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING document_id, title
    `;

        const values = [
            data.class_id,
            data.uploaded_by,
            data.title,
            data.description,
            data.doc_type,
            data.chapter,
            data.file_ext,
            data.file_size_kb,
            data.mongo_id
        ];

        const result = await client.query(query, values);
        return result.rows[0];
    } finally {
        client.release();
    }
}

// 3. Xóa tài liệu lớp
export async function deleteClassDocumentDB(
    documentId: number,
    teacherId: number
) {
    const client = await pgPool.connect();
    try {
        const query = `
      DELETE FROM document 
      WHERE document_id = $1 
      AND uploaded_by = $2 
      AND class_id IS NOT NULL
      RETURNING mongo_id
    `;

        const result = await client.query(query, [documentId, teacherId]);

        return result.rowCount && result.rowCount > 0
            ? result.rows[0].mongo_id
            : null;
    } finally {
        client.release();
    }
}