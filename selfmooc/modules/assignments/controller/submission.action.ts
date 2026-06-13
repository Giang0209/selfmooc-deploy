'use server';

import { cookies } from 'next/headers';
import { submitAssignmentDB } from '../models/submission.model';
import { pgPool } from '@/lib/db';
import { getMongoDb } from '@/lib/db';
import { ObjectId } from 'mongodb';

function getUserFromToken(token: string) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf-8'));
  } catch (error) { return null; }
}

export async function submitAssignmentAction(assignmentId: number, studentAnswers: Record<number, any>, timeSpentSec: number) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  const user = token ? getUserFromToken(token) : null;
  
  if (!user || user.role !== 'student') return { success: false, message: 'Chỉ học sinh mới được nộp bài' };

  const client = await pgPool.connect();
  try {
    // 0. Kiểm tra số lượt làm bài tối đa
    const assRes = await client.query('SELECT max_attempts FROM assignment WHERE assignment_id = $1', [assignmentId]);
    if (assRes.rows.length === 0) return { success: false, message: 'Không tìm thấy bài tập' };
    const maxAttempts = assRes.rows[0].max_attempts;
    if (maxAttempts) {
      const attemptsRes = await client.query('SELECT COUNT(*) FROM submission WHERE assignment_id = $1 AND student_id = $2', [assignmentId, user.id]);
      const attempts = parseInt(attemptsRes.rows[0].count);
      if (attempts >= maxAttempts) {
        return { success: false, message: '⚠️ Bạn đã hết số lần làm bài cho phép!' };
      }
    }

    // 1. Lấy danh sách câu hỏi của bài tập này để chấm điểm
    const qRes = await client.query(`
      SELECT q.question_id, q.question_type, q.mongo_id, aq.points
      FROM assignment_question aq
      JOIN question q ON aq.question_id = q.question_id
      WHERE aq.assignment_id = $1
    `, [assignmentId]);
    
    const pgQuestions = qRes.rows;
    const mongoIds = pgQuestions.map(q => new ObjectId(q.mongo_id));
    
    // 2. Kéo đáp án đúng từ MongoDB ra
    const db = await getMongoDb();
    const mongoQuestions = await db.collection('question_content').find({ _id: { $in: mongoIds } }).toArray();

    let totalScore = 0;
    let maxScore = 0;
    let needsManualGrading = false;
    let correctCount = 0; // Thêm biến đếm số câu đúng
    const totalQuestions = pgQuestions.length; // Tổng số câu
    const formattedAnswers = [];

    // 3. THUẬT TOÁN CHẤM ĐIỂM TỰ ĐỘNG
    for (const pgQ of pgQuestions) {
      const qContent = mongoQuestions.find(m => m._id.toString() === pgQ.mongo_id);
      if (!qContent) continue; 

      const studentAns = studentAnswers[pgQ.question_id];
      const points = parseFloat(pgQ.points);
      maxScore += points;

      let isCorrect = false;
      let pointsEarned = 0;

      if (pgQ.question_type === 'multiple_choice') {
        const correctIndex = qContent.options.findIndex((opt: any) => opt.is_correct);
        if (studentAns === correctIndex) {
          isCorrect = true;
          pointsEarned = points;
          correctCount++; // 🎯 Tăng biến đếm
        }
        formattedAnswers.push({ pg_question_id: pgQ.question_id, question_type: 'multiple_choice', selected_index: studentAns, is_correct: isCorrect, points_earned: pointsEarned, points_max: points, auto_graded: true });
      } 
      // ... (Tương tự cho True/False, nếu đúng thì correctCount++)
      else if (pgQ.question_type === 'true_false') {
        if (studentAns === qContent.correct_answer) {
          isCorrect = true;
          pointsEarned = points;
          correctCount++; // 🎯 Tăng biến đếm
        }
        formattedAnswers.push({ pg_question_id: pgQ.question_id, question_type: 'true_false', bool_answer: studentAns, is_correct: isCorrect, points_earned: pointsEarned, points_max: points, auto_graded: true });
      } 
      else if (pgQ.question_type === 'essay') {
        needsManualGrading = true;
        formattedAnswers.push({ pg_question_id: pgQ.question_id, question_type: 'essay', text_answer: studentAns, is_correct: false, points_earned: 0, points_max: points, auto_graded: false });
      }
      totalScore += pointsEarned;
    }

    const grade = maxScore > 0 ? (totalScore / maxScore) * 10 : 0;
    const status = needsManualGrading ? 'submitted' : 'graded';

    // 5. Lưu vào Database
    await submitAssignmentDB({
      assignment_id: assignmentId,
      student_id: user.id,
      answers: formattedAnswers,
      score: totalScore,
      max_score: maxScore,
      grade: grade,
      status: status,
      total_time_sec: timeSpentSec
    });

    return { 
      success: true, 
      message: '🎉 Nộp bài thành công!', 
      data: { 
        correctCount, 
        totalQuestions, 
        needsManualGrading 
      } 
    };
    } catch (error) {
      console.error(error);
      return { success: false, message: 'Lỗi hệ thống khi nộp bài' };
    } finally {
      client.release();
    }
}

// LẤY NHẬT KÝ LÀM BÀI CỦA HỌC SINH
export async function getMySubmissionsAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  const user = token ? getUserFromToken(token) : null;
  
  if (!user || user.role !== 'student') return { success: false, data: [] };

  const client = await pgPool.connect();
  try {
    const res = await client.query(`
      SELECT s.submission_id, a.title, a.assignment_type, s.status, s.grade, s.score, s.max_score, s.submitted_at
      FROM submission s
      JOIN assignment a ON s.assignment_id = a.assignment_id
      WHERE s.student_id = $1
      ORDER BY s.submitted_at DESC
    `, [user.id]);
    
    return { success: true, data: res.rows };
  } catch (error) {
    console.error(error);
    return { success: false, data: [] };
  } finally {
    client.release();
  }
}

// LẤY CHI TIẾT BÀI LÀM CỦA HỌC SINH (KÈM CÂU HỎI VÀ ĐÁP ÁN ĐÚNG)
export async function getSubmissionDetailsForStudentAction(submissionId: number) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  const user = token ? getUserFromToken(token) : null;
  
  if (!user || (user.role !== 'student' && user.role !== 'parent')) {
    return { success: false, message: 'Chưa đăng nhập hoặc không có quyền' };
  }

  const client = await pgPool.connect();
  try {
    // 1. Lấy thông tin submission & assignment
    const subRes = await client.query(`
      SELECT s.submission_id, s.assignment_id, s.student_id, s.status, s.grade, s.score, s.max_score, s.submitted_at,
             a.title, a.assignment_type
      FROM submission s
      JOIN assignment a ON s.assignment_id = a.assignment_id
      WHERE s.submission_id = $1
    `, [submissionId]);

    if (subRes.rows.length === 0) {
      return { success: false, message: 'Không tìm thấy bài làm' };
    }

    const submission = subRes.rows[0];

    // Xác thực quyền truy cập
    if (user.role === 'student' && submission.student_id !== user.id) {
      return { success: false, message: 'Bạn không có quyền xem bài làm này' };
    }

    if (user.role === 'parent') {
      const relRes = await client.query(
        'SELECT 1 FROM parent_student WHERE parent_id = $1 AND student_id = $2',
        [user.id, submission.student_id]
      );
      if (relRes.rows.length === 0) {
        return { success: false, message: 'Bạn không có quyền xem bài làm của học sinh này' };
      }
    }

    // 2. Lấy validation trong MongoDB
    const db = await getMongoDb();
    const validation = await db.collection('validation').findOne({ pg_submission_id: submissionId });
    if (!validation) {
      return { success: false, message: 'Không tìm thấy chi tiết bài làm' };
    }

    // 3. Lấy thông tin các câu hỏi của assignment này từ Postgres + MongoDB
    const qRes = await client.query(`
      SELECT q.question_id, q.question_type, q.mongo_id, aq.points, aq.display_order
      FROM assignment_question aq
      JOIN question q ON aq.question_id = q.question_id
      WHERE aq.assignment_id = $1
      ORDER BY aq.display_order ASC
    `, [submission.assignment_id]);

    const pgQuestions = qRes.rows;
    if (pgQuestions.length === 0) {
      return { success: true, data: { submission, questions: [] } };
    }

    const mongoIds = pgQuestions.map(q => new ObjectId(q.mongo_id));
    const mongoQuestions = await db.collection('question_content').find({ _id: { $in: mongoIds } }).toArray();

    // Map chi tiết câu hỏi
    const detailQuestions = pgQuestions.map(pgQ => {
      const qContent = mongoQuestions.find(m => m._id.toString() === pgQ.mongo_id);
      const studentAns = validation.answers.find((ans: any) => ans.pg_question_id === pgQ.question_id);

      return {
        question_id: pgQ.question_id,
        question_type: pgQ.question_type,
        points: pgQ.points,
        text: qContent?.text || '',
        media: qContent?.media || [],
        options: qContent?.options || [], // Có chứa is_correct
        correct_answer: qContent?.correct_answer,
        sample_answer: qContent?.sample_answer,
        student_answer: studentAns || null
      };
    }).filter(q => q !== null);

    return {
      success: true,
      data: {
        submission,
        questions: detailQuestions
      }
    };
  } catch (error) {
    console.error(error);
    return { success: false, message: 'Lỗi hệ thống khi tải chi tiết bài làm' };
  } finally {
    client.release();
  }
}

// LẤY DANH SÁCH BÀI TẬP CHỜ CHẤM (CHO GIÁO VIÊN)
export async function getPendingSubmissionsAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  const user = token ? getUserFromToken(token) : null;
  
  if (!user || user.role !== 'teacher') return { success: false, data: [] };

  const client = await pgPool.connect();
  try {
    const res = await client.query(`
      SELECT s.submission_id, s.submitted_at, a.title AS assignment_title, 
             st.name AS student_name, st.student_code
      FROM submission s
      JOIN assignment a ON s.assignment_id = a.assignment_id
      JOIN student st ON s.student_id = st.student_id
      WHERE a.created_by = $1 AND s.status = 'submitted'
      ORDER BY s.submitted_at ASC
    `, [user.id]);
    
    return { success: true, data: res.rows };
  } catch (error) {
    console.error(error);
    return { success: false, data: [] };
  } finally {
    client.release();
  }
}