'use client';

import { useEffect, useRef, useState } from 'react';

import { getClassDocsAction } from '@/modules/classes/controller/document.action';

import {
  createClassDocAction,
  deleteClassDocAction
} from '@/modules/classes/controller/document.action';

export default function ClassMaterialsTab({
  classId
}: {
  classId: number;
}) {

  const [materials, setMaterials] = useState<any[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(true);

  // 🎯 Upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // =====================================================
  // LOAD MATERIALS
  // =====================================================
  async function loadMaterials() {
    setIsLoadingMaterials(true);

    // 🎯 Cái này vẫn get từ COURSE như m muốn
    const res = await getClassDocsAction(classId);

    if (res.success) {
      setMaterials(res.data);
      setFilteredMaterials(res.data);
    }

    setIsLoadingMaterials(false);
  }

  useEffect(() => {
    loadMaterials();
  }, [classId]);

  // =====================================================
  // HANDLE FILE
  // =====================================================
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // =====================================================
  // UPLOAD CLASS DOC
  // =====================================================
  const handleUploadDoc = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {

    e.preventDefault();

    if (!selectedFile) {
      return alert('⚠️ Vui lòng chọn file!');
    }

    setIsUploading(true);

    const formData = new FormData(e.currentTarget);

    formData.append('class_id', classId.toString());
    formData.append('file', selectedFile);

    const ext =
      selectedFile.name.split('.').pop()?.toLowerCase() ||
      'unknown';

    const sizeKb = Math.round(selectedFile.size / 1024);

    formData.append('file_ext', ext);
    formData.append('file_size_kb', sizeKb.toString());

    const result = await createClassDocAction(formData);

    if (result.success) {

      setShowUploadModal(false);

      setSelectedFile(null);

      (e.target as HTMLFormElement).reset();

      await loadMaterials();

    } else {

      alert(result.message);
    }

    setIsUploading(false);
  };

  // =====================================================
  // DELETE
  // =====================================================
  const handleDeleteDoc = async (documentId: number) => {

    if (!window.confirm('Xóa tài liệu này?')) return;

    const res = await deleteClassDocAction(
      documentId,
      classId
    );

    if (res.success) {

      setMaterials(prev =>
        prev.filter(
          d => d.document_id !== documentId
        )
      );

    } else {

      alert(res.message);
    }
  };

  //Search
  const [search, setSearch] = useState('');
  const [filteredMaterials, setFilteredMaterials] = useState<any[]>([]);
  useEffect(() => {
    const filtered = materials.filter(doc =>
      doc.title?.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredMaterials(filtered);
  }, [search, materials]);

  return (
    <div className="animate-fade-in">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">

        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span>📚</span> Kho Học Liệu
        </h2>

        <button
          onClick={() => setShowUploadModal(true)}
          className="px-6 py-3 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-400 transition-all shadow-[0_4px_0_rgb(5,150,105)] active:translate-y-[2px] active:shadow-none"
        >
          ➕ Tải thêm tài liệu Lớp
        </button>

      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Tìm tài liệu..."
          className="w-full px-4 py-3 border-2 rounded-2xl focus:border-emerald-500 outline-none"
        />
      </div>

      {/* LOADING */}
      {isLoadingMaterials ? (

        <div className="text-center py-20 text-emerald-500 animate-pulse font-bold">
          Đang tải kho học liệu...
        </div>

      ) : materials.length === 0 ? (

        <div className="bg-white rounded-3xl p-12 text-center border-2 border-gray-200 border-dashed shadow-sm">

          <span className="text-6xl mb-4 block grayscale opacity-50">
            📂
          </span>

          <h3 className="text-xl font-bold text-gray-400 mb-2">
            Chưa có tài liệu nào
          </h3>

          <p className="text-gray-500 font-medium">
            Khóa học gốc chưa có tài liệu. Hãy sang mục Quản lý Khóa học để thêm nhé.
          </p>

        </div>

      ) : (

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMaterials.map((doc) => (
            <div
              key={doc.document_id}
              className="bg-white p-5 rounded-2xl border-2 border-gray-100 flex items-center justify-between hover:border-emerald-300 shadow-sm transition-colors group"
            >
              {/* LEFT */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-xl font-bold uppercase border border-emerald-100">
                  {doc.doc_type === 'video' ? '🎥' : (doc.file_ext || '📄')}
                </div>

                <div>
                  <h4 className="font-bold text-gray-800 text-lg line-clamp-1">
                    {doc.title}
                  </h4>

                  <div className="flex gap-2 mt-1">
                    <span
                      className={`text-xs font-mono px-2 py-0.5 rounded font-bold border ${doc.course_id
                        ? 'text-sky-600 bg-sky-50 border-sky-200'
                        : 'text-emerald-600 bg-emerald-50 border-emerald-200'
                        }`}
                    >
                      {doc.course_id ? '🌐 Của Khóa Học' : '📌 Của Lớp Này'}
                    </span>
                  </div>
                </div>
              </div>

              {/* RIGHT ACTIONS */}
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">

                {/* VIEW */}
                {doc.storage_url && doc.storage_url !== '#' && (
                  <a
                    href={doc.storage_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-gray-100 text-sky-500 rounded-full flex items-center justify-center hover:bg-sky-500 hover:text-white transition-all shadow-sm"
                    title="Xem tài liệu"
                  >
                    👁️
                  </a>
                )}

                {/* DOWNLOAD */}
                {doc.storage_url && doc.storage_url !== '#' && (
                  <a
                    href={`${doc.storage_url}?download=1`}
                    className="w-10 h-10 bg-gray-100 text-emerald-500 rounded-full flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                    title="Tải xuống"
                  >
                    ⬇️
                  </a>
                )}

                {/* DELETE (GIỐNG COURSE: LUÔN HIỂN THỊ) */}
                <button
                  onClick={() => handleDeleteDoc(doc.documentId || doc.document_id)}
                  className="w-10 h-10 bg-gray-100 text-red-500 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"
                  title="Xóa tài liệu"
                >
                  🗑️
                </button>

              </div>
            </div>
          ))}
        </div>

      )}

      {/* ===================================================== */}
      {/* MODAL */}
      {/* ===================================================== */}
      {showUploadModal && (

        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-emerald-100 overflow-hidden animate-fade-in">

            {/* HEADER */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">

              <div>
                <h3 className="text-2xl font-extrabold text-gray-800">
                  📤 Tải tài liệu lớp
                </h3>

                <p className="text-sm text-gray-500 mt-1">
                  Upload PDF, DOCX, PPT hoặc Video
                </p>
              </div>

              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFile(null);
                }}
                className="w-10 h-10 rounded-full hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors font-bold"
              >
                ✕
              </button>

            </div>

            {/* BODY */}
            <form
              onSubmit={handleUploadDoc}
              className="p-6 space-y-5"
            >

              {/* FILE */}
              <div>

                <label className="block text-sm font-bold text-gray-700 mb-2">
                  File tài liệu *
                </label>

                <div
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className={`w-full h-40 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all ${selectedFile
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-300 hover:bg-gray-50'
                    }`}
                >

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4"
                  />

                  {selectedFile ? (

                    <div className="text-center px-4">

                      <span className="text-5xl block mb-2">
                        📄
                      </span>

                      <p className="font-bold text-emerald-600 truncate max-w-[250px]">
                        {selectedFile.name}
                      </p>

                      <p className="text-sm text-gray-500 mt-1">
                        {(
                          selectedFile.size /
                          1024 /
                          1024
                        ).toFixed(2)} MB
                      </p>

                    </div>

                  ) : (

                    <div className="text-center text-gray-400">

                      <span className="text-5xl block mb-2">
                        📥
                      </span>

                      <p className="font-bold">
                        Bấm để chọn file
                      </p>

                      <p className="text-sm mt-1">
                        PDF, DOCX, PPT, MP4...
                      </p>

                    </div>

                  )}

                </div>

              </div>

              {/* TITLE */}
              <div>

                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Tên tài liệu *
                </label>

                <input
                  name="title"
                  required
                  placeholder="VD: Slide chương 1"
                  className="w-full px-4 py-3 border-2 rounded-2xl focus:border-emerald-500 outline-none"
                />

              </div>

              {/* TYPE */}
              <div>

                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Loại tài liệu
                </label>

                <select
                  name="doc_type"
                  className="w-full px-4 py-3 border-2 rounded-2xl focus:border-emerald-500 outline-none bg-white"
                >
                  <option value="lecture">
                    📖 Bài giảng
                  </option>

                  <option value="exercise">
                    ✍️ Bài tập
                  </option>

                  <option value="reference">
                    📚 Tài liệu tham khảo
                  </option>

                  <option value="video">
                    🎥 Video
                  </option>

                  <option value="other">
                    📁 Khác
                  </option>
                </select>

              </div>

              {/* BUTTON */}
              <div className="flex gap-3 pt-2">

                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFile(null);
                  }}
                  className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={isUploading}
                  className="flex-1 py-3 rounded-2xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {isUploading
                    ? '⏳ ĐANG TẢI...'
                    : '📤 TẢI LÊN'}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}