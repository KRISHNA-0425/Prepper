import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { RiUploadCloud2Line, RiFileTextLine, RiCloseLine, RiCheckLine, RiAlertLine } from 'react-icons/ri';

export default function ResumeUploadDropzone({
  file,
  setFile,
  parsedData,
  isParsing,
  error,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    const validExtensions = ['.pdf', '.docx', '.doc', '.txt'];
    const name = selectedFile.name.toLowerCase();
    const isValid = validExtensions.some((ext) => name.endsWith(ext));

    if (!isValid) {
      alert('Please upload a valid PDF (.pdf), Word (.docx), or Text (.txt) file.');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      alert('File size exceeds the 10MB limit. Please choose a smaller file.');
      return;
    }

    setFile(selectedFile);
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const kb = bytes / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.docx,.doc,.txt"
        className="hidden"
      />

      {!file ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center ${
            isDragOver
              ? 'border-yellow-500 bg-yellow-50/50 scale-[1.01]'
              : 'border-slate-200 hover:border-yellow-400 hover:bg-slate-50/60 bg-white/50'
          }`}
        >
          <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 text-3xl mb-4 shadow-inner">
            <RiUploadCloud2Line />
          </div>
          <h3 className="font-bold text-slate-800 text-base mb-1">
            Upload Candidate Resume
          </h3>
          <p className="text-xs text-slate-500 mb-4 max-w-xs">
            Drag and drop your resume file here or click to browse.
          </p>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
            <span className="px-2 py-0.5 bg-slate-100 rounded-md">PDF</span>
            <span className="px-2 py-0.5 bg-slate-100 rounded-md">DOCX</span>
            <span className="px-2 py-0.5 bg-slate-100 rounded-md">TXT</span>
            <span>• Max 10MB</span>
          </div>
        </div>
      ) : (
        <div className="border border-slate-200 bg-white rounded-2xl p-5 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-2xl shrink-0">
                <RiFileTextLine />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm truncate max-w-[200px] sm:max-w-[260px]">
                  {file.name}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>
            <button
              onClick={handleRemoveFile}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              title="Remove file"
            >
              <RiCloseLine className="text-lg" />
            </button>
          </div>

          {isParsing && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-yellow-600 font-medium">
              <div className="w-3.5 h-3.5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin shrink-0" />
              <span>Analyzing resume content and extracting technical skills...</span>
            </div>
          )}

          {parsedData && !isParsing && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs text-emerald-600 font-semibold mb-2">
                <span className="flex items-center gap-1">
                  <RiCheckLine /> Resume extracted successfully
                </span>
                <span className="text-slate-400 font-normal">
                  {parsedData.structuredData?.technicalSkills?.length || 0} skills detected
                </span>
              </div>
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                {(parsedData.structuredData?.technicalSkills || []).slice(0, 10).map((skill, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[11px] font-medium"
                  >
                    {skill}
                  </span>
                ))}
                {(parsedData.structuredData?.technicalSkills || []).length > 10 && (
                  <span className="px-2 py-0.5 bg-slate-50 text-slate-400 rounded-md text-[11px]">
                    +{parsedData.structuredData.technicalSkills.length - 10} more
                  </span>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-3 pt-3 border-t border-red-100 flex items-center gap-1.5 text-xs text-red-600">
              <RiAlertLine className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
