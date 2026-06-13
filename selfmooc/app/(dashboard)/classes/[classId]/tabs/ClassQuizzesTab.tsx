'use client';

import { useEffect, useState } from 'react';
import { getCourseQuestionsAction } from '@/modules/courses/controller/question.action';
import { createAssignmentAction, getClassAssignmentsAction, getCourseIdOfClassAction, updateAssignmentAction, getAssignmentSelectedQuestionsAction } from '@/modules/assignments/controller/assignment.action';
import { getAssignmentSubmissionsAction, getSubmissionDetailsForStudentAction } from '@/modules/assignments/controller/submission.action';


export default function ClassQuizzesTab({ classId }: { classId: number }) {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [courseQuestions, setCourseQuestions] = useState<any[]>([]);
  const [selectedQIds, setSelectedQIds] = useState<number[]>([]);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // States cho modal xem kết quả làm bài của học sinh
  const [selectedAssResults, setSelectedAssResults] = useState<any>(null); 
  const [submissionsList, setSubmissionsList] = useState<any[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);

  // States cho modal chi tiết bài làm từng học sinh
  const [detailSubmissionId, setDetailSubmissionId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);

  const handleViewResults = async (ass: any) => {
    setSelectedAssResults(ass);
    setIsLoadingSubmissions(true);
    setSubmissionsList([]);
    const res = await getAssignmentSubmissionsAction(ass.assignment_id);
    if (res.success && res.data) {
      setSubmissionsList(res.data);
    } else {
      alert(res.message || 'Lỗi tải danh sách bài làm');
      setSelectedAssResults(null);
    }
    setIsLoadingSubmissions(false);
  };

  const handleOpenSubmissionDetail = async (submissionId: number) => {
    setDetailSubmissionId(submissionId);
    setDetailLoading(true);
    setDetailData(null);
    const res = await getSubmissionDetailsForStudentAction(submissionId);
    if (res.success) {
      setDetailData(res.data);
    } else {
      alert(res.message || 'Không thể tải chi tiết bài làm');
      setDetailSubmissionId(null);
    }
    setDetailLoading(false);
  };

  const handleCloseSubmissionDetail = () => {
    setDetailSubmissionId(null);
    setDetailData(null);
  };

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(dateStr));
  };

  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [questionSearch, setQuestionSearch] = useState('');

  const loadAssignments = async () => {
    setIsLoading(true);
    const res = await getClassAssignmentsAction(classId);
    if (res.success) setAssignments(res.data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadAssignments();
  }, [classId]);

  const handleOpenQuizModal = async () => {
    setIsQuizModalOpen(true);
    setEditingAssignment(null);
    setSelectedQIds([]);
    const courseRes = await getCourseIdOfClassAction(classId);
    if (courseRes.success && courseRes.courseId) {
      const qRes = await getCourseQuestionsAction(courseRes.courseId);
      if (qRes.success) setCourseQuestions(qRes.data);
    }
  };

  const handleEditAssignment = async (ass: any) => {
    setIsQuizModalOpen(true);
    setEditingAssignment(ass);
    const courseRes = await getCourseIdOfClassAction(classId);
    if (courseRes.success && courseRes.courseId) {
      const qRes = await getCourseQuestionsAction(courseRes.courseId);
      if (qRes.success) setCourseQuestions(qRes.data);
    }
    const selectedRes = await getAssignmentSelectedQuestionsAction(ass.assignment_id);
    if (selectedRes.success) setSelectedQIds(selectedRes.data);
  };

  const handleToggleQuestion = (qId: number) => {
    setSelectedQIds(prev => prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]);
  };

  const handleSubmitQuizForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmittingQuiz(true);
    setMessage('');
    try {
      const formData = new FormData(e.currentTarget);
      formData.append('class_id', classId.toString());
      let res;
      if (editingAssignment) {
        res = await updateAssignmentAction(editingAssignment.assignment_id, formData, selectedQIds);
      } else {
        res = await createAssignmentAction(formData, selectedQIds);
      }
      setMessage(res.message);
      if (res.success) {
        loadAssignments();
        setTimeout(() => {
          setIsQuizModalOpen(false);
          setEditingAssignment(null);
          setMessage('');
        }, 1500);
      }
    } catch (error) {
      setMessage('❌ Đã xảy ra lỗi hệ thống khi lưu!');
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  const filteredAssignments = assignments.filter(a =>
    a.title?.toLowerCase().includes(assignmentSearch.toLowerCase()) ||
    a.assignment_type?.toLowerCase().includes(assignmentSearch.toLowerCase())
  );

  const filteredQuestions = courseQuestions.filter(q =>
    q.content?.text?.toLowerCase().includes(questionSearch.toLowerCase()) ||
    String(q.chapter || '').includes(questionSearch)
  );

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><span>📝</span> Bài Tập Giao Cho Lớp</h2>
        <div className="mb-6">
        </div>
        <button onClick={handleOpenQuizModal} className="px-6 py-3 bg-amber-500 text-white font-bold rounded-2xl hover:bg-amber-600 transition-all shadow-[0_4px_0_rgb(217,119,6)] active:translate-y-[2px] active:shadow-none">
          ➕ Soạn Bài Tập Mới
        </button>
      </div>

      <div className="mb-6 flex justify-start">
        <input
          value={assignmentSearch}
          onChange={(e) => setAssignmentSearch(e.target.value)}
          placeholder="🔍 Tìm bài tập theo tiêu đề ..."
          className="w-full md:w-[420px] px-4 py-3 border-2 border-gray-200 rounded-2xl font-bold text-gray-700 focus:border-amber-400 outline-none shadow-sm"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-amber-500 animate-pulse font-bold">Đang tải bài tập...</div>
      ) : assignments.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border-2 border-gray-100 border-dashed shadow-sm">
          <span className="text-6xl mb-4 block grayscale opacity-50">🎯</span>
          <h3 className="text-xl font-bold text-gray-400 mb-2">Chưa có bài tập nào được giao</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-1">
          {filteredAssignments.map((ass) => (
            <div key={ass.assignment_id} className="bg-white rounded-3xl p-6 border-2 border-gray-100 hover:border-amber-300 shadow-sm transition-colors group relative">
              <button onClick={() => handleEditAssignment(ass)} className="absolute top-4 right-4 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-amber-500 hover:text-white font-bold" title="Sửa bài tập">
                ✏️
              </button>

              <div className="flex items-center gap-4 mb-4 pr-10">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center text-2xl font-bold border border-amber-200">Q</div>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg line-clamp-1">{ass.title}</h3>
                  <p className="text-xs font-bold text-gray-400">{ass.assignment_type.toUpperCase()}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm font-bold text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <p>🕒 Thời gian: <span className="text-amber-600">{ass.time_limit_min ? `${ass.time_limit_min} phút` : 'Không giới hạn'}</span></p>
                <p>📊 Số câu hỏi: <span className="text-emerald-600">{ass.question_count} câu</span></p>
                <p>🔄 Lần làm: <span className="text-sky-600">{ass.max_attempts ? `Tối đa ${ass.max_attempts} lần` : 'Vô hạn'}</span></p>
                <p>📅 Hạn chót: <span className="text-rose-500">{ass.due_date ? new Date(ass.due_date).toLocaleDateString('vi-VN') : 'Không có'}</span></p>
              </div>
              <div className="mt-4 flex gap-2">
                <button 
                  onClick={() => handleViewResults(ass)}
                  className="w-full py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-600 font-black rounded-xl text-xs transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  📊 Kết quả làm bài
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL TẠO & SỬA BÀI TẬP */}
      {isQuizModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-6xl shadow-2xl border border-gray-200 flex flex-col max-h-[95vh] overflow-hidden">
            <div className="p-6 bg-amber-500 text-white flex justify-between items-center shrink-0">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <span>🎯</span> {editingAssignment ? 'Chỉnh sửa Bài tập' : 'Thiết lập Bài tập / Đề thi'}
              </h2>
              <button onClick={() => { setIsQuizModalOpen(false); setEditingAssignment(null); setMessage(''); }} className="text-white hover:rotate-90 transition-transform text-2xl font-bold">✖</button>
            </div>

            <form onSubmit={handleSubmitQuizForm} className="flex-1 overflow-hidden flex flex-col lg:flex-row">

              {/* CỘT TRÁI: Cài đặt thông số */}
              <div className="w-full lg:w-1/3 p-6 border-r border-gray-200 overflow-y-auto bg-gray-50">
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Tiêu đề bài tập *</label>
                    <input name="title" defaultValue={editingAssignment?.title} required placeholder="VD: Kiểm tra 15 phút Chương 1" className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 text-gray-800 font-bold" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Loại bài</label>
                      <select name="assignment_type" defaultValue={editingAssignment?.assignment_type || 'homework'} className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-800 font-bold outline-none focus:border-amber-500">
                        <option value="homework">Bài tập về nhà</option>
                        <option value="quiz">Quiz (Kiểm tra)</option>
                        <option value="midterm">Thi Giữa kỳ</option>
                        <option value="final">Thi Cuối kỳ</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Thời gian (Phút)</label>
                      <input name="time_limit_min" defaultValue={editingAssignment?.time_limit_min} type="number" placeholder="Vô hạn" className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-800 font-bold outline-none focus:border-amber-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Lần làm tối đa</label>
                      <input name="max_attempts" defaultValue={editingAssignment?.max_attempts} type="number" min="1" placeholder="Vô hạn" className="w-full px-4 py-3 bg-white border-2 border-amber-200 focus:border-amber-500 rounded-xl text-gray-800 font-bold outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Hạn chót nộp bài</label>
                      <input name="due_date" defaultValue={editingAssignment?.due_date ? new Date(new Date(editingAssignment.due_date).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''} type="datetime-local" className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-800 font-bold outline-none text-xs focus:border-amber-500" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Lời dặn dò</label>
                    <textarea name="description" defaultValue={editingAssignment?.description} rows={3} placeholder="Chú ý làm bài cẩn thận nhé..." className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-800 font-medium outline-none resize-none focus:border-amber-500"></textarea>
                  </div>

                  {message && (
                    <div className={`p-3 rounded-xl text-sm font-bold text-center ${message.includes('✅') ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
                      {message}
                    </div>
                  )}

                  <button type="submit" disabled={isSubmittingQuiz} className="w-full py-4 mt-2 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-400 transition-colors shadow-[0_4px_0_rgb(217,119,6)] active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:shadow-none">
                    {isSubmittingQuiz ? '⏳ ĐANG LƯU...' : (editingAssignment ? `💾 LƯU THAY ĐỔI (${selectedQIds.length} Câu)` : `🚀 GIAO BÀI (${selectedQIds.length} Câu)`)}
                  </button>
                </div>
              </div>

              {/* CỘT PHẢI: Ngân hàng câu hỏi */}
              <div className="w-full lg:w-2/3 p-6 overflow-y-auto bg-white relative">
                <div className="flex justify-between items-center mb-6 sticky top-0 bg-white/90 backdrop-blur pb-2 z-10 border-b border-gray-100">
                  <h3 className="text-xl font-bold text-gray-800">Ngân hàng đề của Khóa học</h3>
                  <span className="px-4 py-1.5 bg-amber-100 text-amber-600 font-bold rounded-full border border-amber-200 text-sm">
                    Đã chọn: {selectedQIds.length} câu
                  </span>
                </div>

                <input
                  value={questionSearch}
                  onChange={(e) => setQuestionSearch(e.target.value)}
                  placeholder="🔍 Tìm câu hỏi..."
                  className="w-full px-4 py-3 mb-4 border-2 border-gray-200 rounded-xl font-bold text-gray-700 focus:border-amber-400 outline-none"
                />

                {courseQuestions.length === 0 ? (
                  <div className="text-center py-20 text-gray-400 font-bold border-2 border-dashed border-gray-200 rounded-3xl">
                    Chưa có câu hỏi nào trong Khóa học này.<br />Hãy sang mục Khóa Học để soạn đề trước nhé!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredQuestions.map((q) => (
                      <label key={q.question_id} className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedQIds.includes(q.question_id) ? 'bg-amber-50 border-amber-400 shadow-sm' : 'bg-white border-gray-200 hover:border-amber-300'}`}>
                        <div className="pt-1">
                          <input
                            type="checkbox"
                            className="w-6 h-6 accent-amber-500 cursor-pointer"
                            checked={selectedQIds.includes(q.question_id)}
                            onChange={() => handleToggleQuestion(q.question_id)}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex gap-2 mb-2">
                            <span className="px-2 py-0.5 bg-gray-100 text-xs font-bold rounded text-gray-500 border border-gray-200">Chương {q.chapter || '?'}</span>
                            <span className="px-2 py-0.5 bg-purple-50 text-xs font-bold rounded text-purple-600 border border-purple-200">Độ khó: {q.difficulty}</span>
                          </div>
                          <p className="font-bold text-gray-800 text-base leading-relaxed line-clamp-3">{q.content?.text || 'Nội dung câu hỏi...'}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XEM KẾT QUẢ BÀI TẬP (GIÁO VIÊN) */}
      {selectedAssResults && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-gray-200 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-6 bg-sky-600 text-white flex justify-between items-center shrink-0">
              <div>
                <p className="text-xs font-bold text-sky-200 uppercase tracking-widest mb-0.5">KẾT QUẢ LÀM BÀI</p>
                <h2 className="text-xl font-bold">
                  {selectedAssResults.title}
                </h2>
              </div>
              <button 
                onClick={() => { setSelectedAssResults(null); setSubmissionsList([]); }} 
                className="text-white hover:rotate-90 transition-transform text-2xl font-bold"
              >
                ✖
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              {isLoadingSubmissions ? (
                <div className="py-20 text-center font-bold text-sky-500 animate-pulse">⏳ Đang lấy lịch sử làm bài...</div>
              ) : submissionsList.length === 0 ? (
                <div className="text-center py-20 text-gray-400 font-medium">
                  <span className="text-5xl block mb-4">📭</span>
                  Chưa có học sinh nào nộp bài tập này.
                </div>
              ) : (
                <div className="space-y-4">
                  {submissionsList.map((sub, idx) => {
                    const formattedDate = new Intl.DateTimeFormat('vi-VN', { 
                      hour: '2-digit', 
                      minute: '2-digit', 
                      day: '2-digit', 
                      month: '2-digit', 
                      year: 'numeric' 
                    }).format(new Date(sub.submitted_at));

                    return (
                      <div 
                        key={sub.submission_id} 
                        className="bg-white rounded-2xl border-2 border-gray-100 hover:border-sky-300 p-5 flex items-center gap-5 transition-all group shadow-sm hover:shadow-md"
                      >
                        {/* STT */}
                        <div className="w-8 h-8 bg-sky-50 text-sky-500 rounded-full flex items-center justify-center text-sm font-black border border-sky-200 shrink-0">
                          {idx + 1}
                        </div>

                        {/* Avatar + Info */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-11 h-11 bg-gray-100 border-2 border-gray-200 rounded-full flex items-center justify-center text-xl shadow-inner overflow-hidden shrink-0">
                            {sub.student_avatar ? (
                              <img src={sub.student_avatar} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                              '🐶'
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-800 text-base truncate">{sub.student_name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-mono font-bold text-gray-400">{sub.student_code}</span>
                              <span className="text-gray-300">·</span>
                              <span className="text-[10px] font-bold text-sky-500">Lần {sub.attempt_number}</span>
                            </div>
                          </div>
                        </div>

                        {/* Điểm số */}
                        <div className="text-center shrink-0 px-3">
                          <p className="text-2xl font-black text-emerald-500 leading-none">
                            {Number(sub.grade).toFixed(1)}
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold">/10 điểm</p>
                        </div>

                        {/* Trạng thái */}
                        <div className="shrink-0">
                          {sub.status === 'graded' ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Đã chấm
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Chờ chấm
                            </span>
                          )}
                        </div>

                        {/* Thời gian */}
                        <div className="text-right shrink-0 hidden md:block">
                          <p className="text-[10px] text-gray-400 font-bold">{formattedDate}</p>
                        </div>

                        {/* Nút xem chi tiết */}
                        <button 
                          onClick={() => handleOpenSubmissionDetail(sub.submission_id)}
                          className="shrink-0 px-4 py-2.5 bg-sky-50 hover:bg-sky-500 text-sky-600 hover:text-white font-bold rounded-xl text-xs transition-all border border-sky-200 hover:border-sky-500 cursor-pointer group-hover:shadow-sm flex items-center gap-1.5"
                        >
                          🔍 Xem chi tiết
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT BÀI LÀM CỦA HỌC SINH (GIÁO VIÊN XEM) */}
      {detailSubmissionId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={handleCloseSubmissionDetail}></div>
          <div className="relative bg-white rounded-[2rem] border-2 border-sky-100 max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl p-8">
            <button
              onClick={handleCloseSubmissionDetail}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors text-2xl font-bold p-2 hover:bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center hover:scale-105 active:scale-95"
            >
              ✕
            </button>

            {detailLoading ? (
              <div className="py-20 text-center text-sky-500 font-bold animate-pulse">
                ⏳ Đang tải chi tiết bài làm...
              </div>
            ) : detailData ? (
              <div className="flex flex-col gap-6 flex-1 min-h-0">
                {/* Modal Header */}
                <div className="flex flex-col md:flex-row justify-between items-start pb-6 border-b border-gray-100 shrink-0 pr-14">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 bg-sky-100 border border-sky-200 px-2.5 py-1 rounded-md shadow-sm mb-2 inline-block">
                      {detailData.submission.assignment_type}
                    </span>
                    <h2 className="text-2xl font-black text-gray-800">{detailData.submission.title}</h2>
                    <p className="text-gray-400 font-bold text-xs mt-1">
                      Nộp lúc: {formatDate(detailData.submission.submitted_at)}
                    </p>
                  </div>
                  <div className="text-left md:text-right mt-4 md:mt-0">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Kết quả bài thi</p>
                    {detailData.submission.status === 'graded' ? (
                      <div>
                        <span className="text-4xl font-black text-sky-500">{Number(detailData.submission.grade ?? 0).toFixed(2)}</span>
                        <span className="text-xl text-gray-400 font-bold">/10</span>
                        <p className="text-xs text-emerald-600 font-bold mt-1">
                          Đã chấm ({Number(detailData.submission.score ?? 0).toFixed(1)}/{Number(detailData.submission.max_score ?? 0).toFixed(1)} đ)
                        </p>
                      </div>
                    ) : (
                      <div>
                        <span className="text-xl font-black text-amber-500">Chờ chấm</span>
                        <p className="text-xs text-gray-400 font-bold mt-1">—/10</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Body - Danh sách câu hỏi */}
                <div className="space-y-6 overflow-y-auto flex-1 pr-2">
                  {detailData.questions.map((q: any, idx: number) => {
                    const studentAns = q.student_answer;
                    return (
                      <div key={q.question_id} className="bg-white rounded-[2rem] p-6 border-2 border-gray-100 shadow-sm">
                        {/* Tiêu đề câu hỏi */}
                        <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-50">
                          <h3 className="text-base font-bold text-sky-600">
                            Câu {idx + 1} <span className="text-xs text-gray-400 font-bold ml-2">({q.points} điểm)</span>
                          </h3>
                          <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded-md border border-gray-200 uppercase">
                            {q.question_type.replace('_', ' ')}
                          </span>
                        </div>

                        {/* Nội dung câu hỏi */}
                        <div className="text-gray-800 font-bold text-base mb-4 leading-relaxed">
                          {q.text}
                        </div>

                        {/* Ảnh minh họa nếu có */}
                        {q.media && q.media.length > 0 && (
                          <img src={q.media[0].url} alt="Minh họa" className="max-h-60 rounded-2xl border-2 border-gray-100 mb-4 shadow-sm" />
                        )}

                        {/* Lựa chọn của học sinh */}
                        {q.question_type === 'multiple_choice' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {q.options?.map((opt: any, optIdx: number) => {
                              const isSelected = studentAns?.selected_index === optIdx;
                              const isCorrect = opt.is_correct;
                              let optionStyle = 'bg-gray-50 border-gray-200 text-gray-600';
                              let badge = null;

                              if (isCorrect) {
                                optionStyle = 'bg-emerald-50 border-emerald-500 text-emerald-700 font-bold';
                                badge = <span className="text-emerald-600 font-black text-xs ml-auto">✅ Đáp án đúng</span>;
                              } else if (isSelected) {
                                optionStyle = 'bg-rose-50 border-rose-500 text-rose-700 font-bold';
                                badge = <span className="text-rose-600 font-black text-xs ml-auto">❌ HS chọn sai</span>;
                              }

                              return (
                                <div
                                  key={optIdx}
                                  className={`flex items-center text-left gap-4 p-4 rounded-2xl border-2 transition-all ${optionStyle}`}
                                >
                                  <div className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center ${
                                    isCorrect ? 'border-emerald-500 bg-emerald-500' : isSelected ? 'border-rose-500 bg-rose-500' : 'border-gray-300 bg-white'
                                  }`}>
                                    {(isCorrect || isSelected) && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                  </div>
                                  <span className="font-bold">{opt.label}. {opt.text}</span>
                                  {badge}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {q.question_type === 'true_false' && (
                          <div className="flex gap-4">
                            {[true, false].map((val) => {
                              const isSelected = studentAns?.bool_answer === val;
                              const isCorrect = q.correct_answer === val;
                              let btnStyle = 'bg-gray-50 border-gray-200 text-gray-500';
                              let badge = '';

                              if (isCorrect) {
                                btnStyle = 'bg-emerald-50 border-emerald-500 text-emerald-600 font-bold';
                                badge = ' ✅ (Đáp án đúng)';
                              } else if (isSelected) {
                                btnStyle = 'bg-rose-50 border-rose-500 text-rose-600 font-bold';
                                badge = ' ❌ (HS chọn sai)';
                              }

                              return (
                                <div
                                  key={val ? 'true' : 'false'}
                                  className={`flex-1 py-4 font-bold rounded-2xl border-2 text-center transition-all ${btnStyle}`}
                                >
                                  {val ? 'ĐÚNG' : 'SAI'}
                                  {badge}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {q.question_type === 'essay' && (
                          <div className="space-y-4">
                            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-gray-800 font-medium whitespace-pre-wrap">
                              <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Bài làm của học sinh:</p>
                              {studentAns?.text_answer || <span className="italic text-gray-400">Không có câu trả lời</span>}
                            </div>

                            {studentAns?.teacher_comment && (
                              <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4 text-amber-800">
                                <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-1">Nhận xét của Giáo viên:</p>
                                <p className="font-bold text-sm">{studentAns.teacher_comment}</p>
                                <p className="text-xs font-bold text-amber-600 mt-2">
                                  Điểm đạt được: {Number(studentAns.points_earned ?? 0).toFixed(1)}/{Number(studentAns.points_max ?? 0).toFixed(1)} đ
                                </p>
                              </div>
                            )}

                            {q.sample_answer && (
                              <div className="bg-sky-50/50 border border-sky-200 rounded-2xl p-4 text-sky-800">
                                <p className="text-xs font-bold text-sky-500 uppercase tracking-wider mb-1">Đáp án mẫu:</p>
                                <p className="text-sm font-medium whitespace-pre-wrap">{q.sample_answer}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-rose-500 font-bold">
                ⚠️ Không thể tải thông tin chi tiết.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}