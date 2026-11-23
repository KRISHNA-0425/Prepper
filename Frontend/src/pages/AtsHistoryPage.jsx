import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  RiFileSearchLine,
  RiArrowLeftLine,
  RiBuilding4Line,
  RiDeleteBinLine,
  RiArrowRightLine,
  RiFilter3Line,
  RiSearchLine,
} from 'react-icons/ri';
import Navbar from '../components/Navbar';
import { backendServerUrl } from '../App';

export default function AtsHistoryPage() {
  const navigate = useNavigate();

  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchAnalyses = async () => {
    setLoading(true);
    try {
      let url = `${backendServerUrl}/api/ats/analyses?page=${page}&limit=10`;
      if (categoryFilter) url += `&matchCategory=${encodeURIComponent(categoryFilter)}`;

      const res = await axios.get(url, { withCredentials: true });
      if (res.data?.success) {
        setAnalyses(res.data.analyses || []);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch analyses history:', err);
      toast.error('Failed to load past analyses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyses();
  }, [page, categoryFilter]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this ATS analysis report permanently?')) return;

    try {
      await axios.delete(`${backendServerUrl}/api/ats/analysis/${id}`, {
        withCredentials: true,
      });
      toast.success('Analysis report deleted');
      setAnalyses((prev) => prev.filter((a) => a._id !== id));
    } catch (err) {
      toast.error('Failed to delete analysis');
    }
  };

  const filteredAnalyses = analyses.filter((a) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const title = (a.jobDetails?.jobTitle || '').toLowerCase();
    const company = (a.jobDetails?.companyName || '').toLowerCase();
    return title.includes(term) || company.includes(term);
  });

  const getBadgeStyle = (category) => {
    switch (category) {
      case 'Excellent Match':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Strong Match':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Moderate Match':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Weak Match':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-red-100 text-red-800 border-red-300';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-poppins">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 sm:py-10">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Link
              to="/ats"
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer shadow-xs"
            >
              <RiArrowLeftLine className="text-base" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-slate-800">
                ATS Analysis History
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Review and manage your past resume-to-job compatibility scorecards.
              </p>
            </div>
          </div>

          <Link
            to="/ats/new"
            className="px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-black text-xs self-start sm:self-auto shadow-xs"
          >
            New Job Match
          </Link>
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs mb-6 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <RiSearchLine className="absolute left-3.5 top-3 text-slate-400 text-sm" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by job title or company..."
              className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 font-medium"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <RiFilter3Line className="text-slate-400 text-base" />
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs p-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 font-medium cursor-pointer"
            >
              <option value="">All Categories</option>
              <option value="Excellent Match">Excellent Match (85%+)</option>
              <option value="Strong Match">Strong Match (70–84%)</option>
              <option value="Moderate Match">Moderate Match (55–69%)</option>
              <option value="Weak Match">Weak Match (40–54%)</option>
              <option value="Low Match">Low Match (&lt;40%)</option>
            </select>
          </div>
        </div>

        {/* Analyses List */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading your history...
            </div>
          ) : filteredAnalyses.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xl mx-auto mb-3">
                <RiFileSearchLine />
              </div>
              <p className="font-bold text-slate-700 text-sm">No analysis reports found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                No analyses match your search criteria. Try clearing the filter.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAnalyses.map((item) => (
                <div
                  key={item._id}
                  onClick={() => navigate(`/ats/analysis/${item._id}`)}
                  className="p-4 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/70 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">
                        {item.jobDetails?.jobTitle}
                      </span>
                      {item.jobDetails?.companyName && (
                        <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                          <RiBuilding4Line className="text-slate-400" />
                          {item.jobDetails.companyName}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {item.resumeId?.originalFileName || 'Resume'} •{' '}
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 justify-between sm:justify-end">
                    <div className="text-right">
                      <span className="font-black text-slate-800 text-base">
                        {item.scoring?.overallScore}%
                      </span>
                      <span
                        className={`block px-2.5 py-0.5 rounded-md text-[9px] font-bold uppercase border mt-0.5 ${getBadgeStyle(
                          item.scoring?.matchCategory
                        )}`}
                      >
                        {item.scoring?.matchCategory}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleDelete(e, item._id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete report"
                      >
                        <RiDeleteBinLine className="text-base" />
                      </button>
                      <RiArrowRightLine className="text-slate-300 group-hover:text-slate-700 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer font-bold"
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer font-bold"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
