'use client';

import { useEffect, useState } from 'react';
import { getMySubmissionsAction, getSubmissionDetailsForStudentAction } from '@/modules/assignments/controller/submission.action';

export default function StudentDiaryPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // States cho modal chi tiết
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      const res = await getMySubmissionsAction();
      if (res.success) setSubmissions(res.data);
      setIsLoading(false);
    }
    loadData();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(dateStr));
  };

  const handleOpenDetail = async (submissionId: number) => {
    setSelectedSubmissionId(submissionId);
    setDetailLoading(true);
    setDetailData(null);
    const res = await getSubmissionDetailsForStudentAction(submissionId);
    if (res.success) {
      setDetailData(res.data);
    } else {
      alert(res.message || 'Không thể tải chi tiết bài làm');
      setSelectedSubmissionId(null);
    }
    setDetailLoading(false);
  };

  const handleCloseDetail = () => {
    setSelectedSubmissionId(null);
    setDetailData(null);
  };

  return (
    <div className="max-w-6xl mx-auto pb-10 px-4">
      
      {/* HEADER TƯƠI SÁNG */}
      <div className="flex items-center gap-4 mb-10">
        <div className="w-16 h-16 bg-sky-100 rounded-2xl flex items-center justify-center text-3xl border-2 border-sky-200 shadow-sm">📖</div>
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800">Nhật Ký Học Tập</h1>
          <p className="text-gray-500 font-bold mt-1">Nơi lưu giữ mọi nỗ lực và điểm số của bạn</p>
        </div>
      </div>

      {/* BẢNG KẾT QUẢ */}
      <div className="bg-white rounded-[2rem] border-2 border-sky-100 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-10 text-center text-sky-500 font-bold animate-pulse">⏳ Đang tải dữ liệu...</div>
        ) : submissions.length === 0 ? (
          <div className="p-20 text-center text-gray-400 font-bold">
            <span className="text-6xl block mb-4">📭</span>
            Bạn chưa có lịch sử làm bài nào.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-sky-50/50 text-sky-700 text-sm border-b-2 border-sky-100">
                <th className="p-6 font-black w-20 text-center uppercase tracking-wider text-xs">STT</th>
                <th className="p-6 font-black uppercase tracking-wider text-xs">Tên bài tập</th>
                <th className="p-6 font-black uppercase tracking-wider text-xs">Thời gian nộp</th>
                <th className="p-6 font-black text-center uppercase tracking-wider text-xs">Trạng thái</th>
                <th className="p-6 font-black text-center uppercase tracking-wider text-xs">Kết quả</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {submissions.map((sub, idx) => (
                <tr 
                  key={sub.submission_id} 
                  onClick={() => handleOpenDetail(sub.submission_id)} 
                  className="hover:bg-sky-50 transition-colors group cursor-pointer"
                >
                  <td className="p-6 text-center font-bold text-gray-400 group-hover:text-sky-500 transition-colors">{idx + 1}</td>
                  <td className="p-6">
                    <p className="font-bold text-gray-800 text-lg mb-1 group-hover:text-blue-600 transition-colors">{sub.title}</p>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 bg-sky-100 border border-sky-200 px-2.5 py-1 rounded-md shadow-sm">{sub.assignment_type}</span>
                  </td>
                  <td className="p-6 text-sm font-bold text-gray-500">{formatDate(sub.submitted_at)}</td>
                  <td className="p-6 text-center">
                    {sub.status === 'graded' 
                      ? <span className="inline-flex items-center gap-1.5 text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold shadow-sm"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Đã chấm</span>
                      : <span className="inline-flex items-center gap-1.5 text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full text-xs font-bold shadow-sm"><span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Chờ chấm</span>
                    }
                  </td>
                  <td className="p-6 text-center font-black text-2xl text-sky-500">
                    {sub.status === 'graded' ? `${Number(sub.grade).toFixed(2)}/10` : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL CHI TIẾT BÀI LÀM */}
      {selectedSubmissionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={handleCloseDetail}></div>
          <div className="relative bg-white rounded-[2rem] border-2 border-sky-100 max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl p-8">
            <button
              onClick={handleCloseDetail}
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

                {/* Modal Body */}
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

                        {/* Lựa chọn hoặc bài làm của học sinh */}
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
                                badge = <span className="text-rose-600 font-black text-xs ml-auto">❌ Bạn chọn sai</span>;
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
                                badge = ' ❌ (Bạn chọn sai)';
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
                              <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Bài làm của bạn:</p>
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