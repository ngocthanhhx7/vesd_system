import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, X, Clock, FolderKanban, UserCircle, Wallet, ArrowDownToLine, Command, CornerDownLeft, ArrowUp, ArrowDown } from 'lucide-react';
import { endpoints } from '../../services/api';
import { StatusBadge } from '../ui/Primitives';

const RECENT_KEY = 'vesd_recent_searches';
const MAX_RECENT = 5;

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').slice(0, MAX_RECENT); }
  catch { return []; }
}
function saveRecent(q: string) {
  const list = getRecent().filter(i => i !== q);
  list.unshift(q);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
}
function clearRecent() { localStorage.removeItem(RECENT_KEY); }

const groupConfig: Record<string, { label: string; icon: typeof FolderKanban }> = {
  projects: { label: 'Dự án', icon: FolderKanban },
  users: { label: 'Người dùng', icon: UserCircle },
  designers: { label: 'Designer', icon: UserCircle },
  transactions: { label: 'Giao dịch', icon: Wallet },
  withdrawals: { label: 'Rút tiền', icon: ArrowDownToLine }
};

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Search query
  const { data, isFetching } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => endpoints.search(debouncedQuery),
    enabled: debouncedQuery.length >= 2
  });

  // Flatten results for keyboard nav
  const flatItems: { _id: string; url: string; title: string; group: string }[] = [];
  if (data?.results) {
    for (const [group, items] of Object.entries(data.results)) {
      (items as any[]).forEach(item => flatItems.push({ ...item, group }));
    }
  }

  // Focus on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setDebouncedQuery('');
      setActiveIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') return onClose();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, flatItems.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    }
    if (e.key === 'Enter' && activeIndex >= 0 && flatItems[activeIndex]) {
      e.preventDefault();
      goTo(flatItems[activeIndex].url, flatItems[activeIndex].title);
    }
  }, [activeIndex, flatItems, onClose]);

  const goTo = (url: string, label?: string) => {
    if (label) saveRecent(label);
    onClose();
    navigate(url);
  };

  const recent = getRecent();

  if (!open) return null;

  return (
    <div className="search-overlay-backdrop" onClick={onClose}>
      <div className="search-overlay-panel" onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
        {/* Search Input */}
        <div className="search-overlay-input-row">
          <Search size={18} className="text-muted" />
          <input
            ref={inputRef}
            type="text"
            className="search-overlay-input"
            placeholder="Tìm kiếm dự án, designer, giao dịch..."
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIndex(-1); }}
          />
          <kbd className="search-overlay-kbd">
            <Command size={11} />K
          </kbd>
          {query && (
            <button className="search-overlay-clear" onClick={() => setQuery('')}>
              <X size={15} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="search-overlay-body">
          {/* Loading */}
          {isFetching && debouncedQuery.length >= 2 && (
            <div className="search-overlay-loading">
              <div className="search-overlay-spinner" />
              <span>Đang tìm...</span>
            </div>
          )}

          {/* Results */}
          {!isFetching && data?.results && Object.keys(data.results).length > 0 && (
            <>
              {Object.entries(data.results).map(([group, items]) => {
                const config = groupConfig[group] || { label: group, icon: FolderKanban };
                const Icon = config.icon;
                return (
                  <div key={group} className="search-overlay-group">
                    <div className="search-overlay-group-title">
                      <Icon size={13} /> {config.label} ({(items as any[]).length})
                    </div>
                    {(items as any[]).map((item: any, idx: number) => {
                      const globalIdx = flatItems.findIndex(f => f._id === item._id && f.group === group);
                      return (
                        <button
                          key={item._id}
                          className={`search-overlay-result-item ${globalIdx === activeIndex ? 'active' : ''}`}
                          onClick={() => goTo(item.url, item.title)}
                          onMouseEnter={() => setActiveIndex(globalIdx)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="search-overlay-result-title">{item.title}</div>
                            {item.subtitle && <div className="search-overlay-result-subtitle">{item.subtitle}</div>}
                          </div>
                          {item.status && <StatusBadge status={item.status} />}
                          {item.rating > 0 && <span className="text-xs text-amber-500">⭐ {item.rating?.toFixed(1)}</span>}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}

          {/* Empty */}
          {!isFetching && debouncedQuery.length >= 2 && data?.totalCount === 0 && (
            <div className="search-overlay-empty">
              <Search size={32} className="text-muted/30" />
              <p>Không tìm thấy kết quả cho "<strong>{debouncedQuery}</strong>"</p>
              <p className="text-muted text-xs">Thử từ khóa khác hoặc kiểm tra chính tả</p>
            </div>
          )}

          {/* Recent searches (when input is empty) */}
          {!query && recent.length > 0 && (
            <div className="search-overlay-group">
              <div className="search-overlay-group-title">
                <Clock size={13} /> Tìm kiếm gần đây
                <button className="search-overlay-clear-recent" onClick={() => { clearRecent(); setQuery(' '); setQuery(''); }}>Xóa</button>
              </div>
              {recent.map((r, i) => (
                <button key={i} className="search-overlay-result-item" onClick={() => setQuery(r)}>
                  <Clock size={14} className="text-muted/50" />
                  <span className="flex-1">{r}</span>
                </button>
              ))}
            </div>
          )}

          {/* Empty initial state */}
          {!query && recent.length === 0 && (
            <div className="search-overlay-empty">
              <Search size={32} className="text-muted/30" />
              <p className="text-muted">Nhập từ khóa để tìm kiếm</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="search-overlay-footer">
          <span><ArrowUp size={12} /><ArrowDown size={12} /> Di chuyển</span>
          <span><CornerDownLeft size={12} /> Chọn</span>
          <span><kbd>ESC</kbd> Đóng</span>
        </div>
      </div>
    </div>
  );
}
