import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { SERVER_URL } from '../../config';

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const performSearch = useCallback(async (currentQuery) => {
    if (!currentQuery.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      // 🔽 แก้ไข URL ให้เรียบง่ายขึ้น ไม่มี &filter=... อีกต่อไป
      const response = await fetch(`${SERVER_URL}/api/users/search?q=${currentQuery}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch search results.');
      
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [query, performSearch]);

  return (
    <div className="max-w-3xl mx-auto p-4 font-sans">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">Search for Users</h1>
        
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Start typing a username..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>
        
        {/* --- 🔽 ลบส่วนของ Filter ออกไปแล้ว --- */}

        {error && <p className="text-red-500">{error}</p>}

        <div className="space-y-3 min-h-[50px]">
          {isLoading ? (
            <p className="text-gray-500">Searching...</p>
          ) : results.length > 0 ? (
            results.map(user => (
              <div key={user.id} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                <span className="font-semibold">{user.username}</span>
                <Link to={`/profile/${user.username}`} className="text-blue-500 hover:underline text-sm font-medium">
                  View Profile
                </Link>
              </div>
            ))
          ) : (
            query.trim() && <p className="text-gray-500">No users found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchPage;