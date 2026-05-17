'use server';

import { cookies } from 'next/headers';
import { pgPool } from '@/lib/db';
import * as xlsx from 'xlsx';
import bcrypt from 'bcryptjs';

const clean = (val: any) => val ? String(val).trim() : null;

export async function addStudentsToClassAction(
  classId: number,
  type: 'manual' | 'excel',
  data: any
) {
  const token = (await cookies()).get('session')?.value;
  if (!token) return { success: false, message: 'Chưa đăng nhập' };

  const client = await pgPool.connect();

  try {
    await client.query('BEGIN');

    let studentsToProcess: any[] = [];

    // 1. INPUT
    if (type === 'manual') {
      studentsToProcess.push({
        student_code: data.student_code.toUpperCase(),
        name: 'Học sinh mới'
      });
    } else {
      const arrayBuffer = await (data as File).arrayBuffer();
      const workbook = xlsx.read(Buffer.from(arrayBuffer), { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      studentsToProcess = xlsx.utils.sheet_to_json(sheet);
    }

    // 2. NORMALIZE CODES
    const codes = studentsToProcess
      .map(row => clean(row['MASOHOCSINH'] || row['student_code'])?.toUpperCase())
      .filter(Boolean);

    // 3. CHECK EXISTING IN DB
    const existing = await client.query(`
      SELECT student_code 
      FROM student 
      WHERE student_code = ANY($1)
    `, [codes]);

    const existingSet = new Set(
      existing.rows.map(r => r.student_code)
    );

    // 4. STATS
    let successCount = 0;
    let skippedCount = 0;

    const skippedList: string[] = [];

    // 5. PROCESS
    for (const row of studentsToProcess) {
      const code = clean(row['MASOHOCSINH'] || row['student_code'])?.toUpperCase();
      const name = clean(row['HOTEN'] || row['name']) || 'Học sinh mới';

      if (!code) continue;

      // 🔥 SKIP DUPLICATE
      if (existingSet.has(code)) {
        skippedCount++;
        skippedList.push(code);
        continue;
      }

      const defaultPassword = '123456';
      const passHash = await bcrypt.hash(defaultPassword, 10);

      const studentRes = await client.query(`
        INSERT INTO student (student_code, name, password_hash)
        VALUES ($1, $2, $3)
        RETURNING student_id
      `, [code, name, passHash]);

      const studentId = studentRes.rows[0].student_id;

      await client.query(`
        INSERT INTO enrollment (student_id, class_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [studentId, classId]);

      successCount++;
    }

    await client.query('COMMIT');

    // 6. RESPONSE
    return {
      success: true,
      successCount,
      skippedCount,
      skippedList,
      message: `🎉 Import xong: ${successCount} thành công, ${skippedCount} bị trùng`
    };

  } catch (e: any) {
    await client.query('ROLLBACK');
    return {
      success: false,
      message: 'Lỗi: ' + e.message
    };
  } finally {
    client.release();
  }
}