import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { uploadVideo, getCategories } from '../api/services';
import { FiUploadCloud, FiX, FiFilm } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useEffect } from 'react';
import { normalizeToArray } from '../utils/normalize';

export default function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [categories, setCategories] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    getCategories().then(({ data }) => setCategories(normalizeToArray(data))).catch(() => {});
  }, []);

  const onDrop = useCallback((accepted) => {
    if (accepted.length > 0) {
      const f = accepted[0];
      if (f.size > 5 * 1024 * 1024 * 1024) {
        toast.error('File too large (max 5GB)');
        return;
      }
      setFile(f);
      if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
    }
  }, [title]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': ['.mp4', '.mov', '.mkv', '.webm', '.avi'] },
    multiple: false,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { toast.error('Please select a video'); return; }
    if (!title.trim()) { toast.error('Title is required'); return; }

    const formData = new FormData();
    formData.append('video_file', file);
    formData.append('title', title.trim());
    if (description) formData.append('description', description);
    if (categoryName) formData.append('category_name', categoryName);
    if (tagInput) {
      const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean);
      tags.forEach(t => formData.append('tag_names', t));
    }
    if (thumbnail) formData.append('thumbnail', thumbnail);

    setUploading(true);
    try {
      await uploadVideo(formData, (e) => {
        setProgress(Math.round((e.loaded * 100) / e.total));
      });
      toast.success('Video uploaded! Processing will begin shortly.');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    }
    setUploading(false);
  };

  return (
    <div className="min-h-screen bg-olive-950 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-olive-100 text-2xl font-bold mb-6">Upload Video</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-olive-400 bg-olive-900/50' : 'border-olive-700 hover:border-olive-500 bg-olive-900/30'
            }`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FiFilm className="text-olive-400" size={24} />
                <span className="text-olive-200">{file.name}</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-olive-500 hover:text-red-400">
                  <FiX size={18} />
                </button>
              </div>
            ) : (
              <div>
                <FiUploadCloud className="mx-auto text-olive-500" size={48} />
                <p className="text-olive-300 mt-3">Drag & drop a video file or click to browse</p>
                <p className="text-olive-600 text-sm mt-1">MP4, MOV, MKV, WebM — Max 500MB</p>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-olive-300 text-sm mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-olive-900 border border-olive-700 rounded-lg px-4 py-2.5 text-olive-100 placeholder-olive-600 focus:outline-none focus:border-olive-500"
              placeholder="Video title"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-olive-300 text-sm mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full bg-olive-900 border border-olive-700 rounded-lg px-4 py-2.5 text-olive-100 placeholder-olive-600 focus:outline-none focus:border-olive-500 resize-none"
              placeholder="Tell viewers about your video"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-olive-300 text-sm mb-1">Category</label>
            <select
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="w-full bg-olive-900 border border-olive-700 rounded-lg px-4 py-2.5 text-olive-100 focus:outline-none focus:border-olive-500"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-olive-300 text-sm mb-1">Tags (comma separated)</label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              className="w-full bg-olive-900 border border-olive-700 rounded-lg px-4 py-2.5 text-olive-100 placeholder-olive-600 focus:outline-none focus:border-olive-500"
              placeholder="react, tutorial, coding"
            />
          </div>

          {/* Thumbnail */}
          <div>
            <label className="block text-olive-300 text-sm mb-1">Custom Thumbnail (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setThumbnail(e.target.files[0] || null)}
              className="w-full text-olive-400 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-olive-700 file:text-olive-200 file:px-3 file:py-1.5 file:text-sm file:cursor-pointer"
            />
          </div>

          {/* Upload progress */}
          {uploading && (
            <div className="bg-olive-900 rounded-lg p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-olive-300">Uploading...</span>
                <span className="text-olive-400">{progress}%</span>
              </div>
              <div className="w-full bg-olive-800 rounded-full h-2">
                <div className="bg-olive-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading || !file}
            className="w-full bg-olive-600 hover:bg-olive-500 text-white py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Upload Video'}
          </button>
        </form>
      </div>
    </div>
  );
}
