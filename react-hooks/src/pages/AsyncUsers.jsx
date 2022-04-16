import React, { useCallback } from 'react';
import useAsync from '../hooks/useAsync-v2.js';

export default function AsyncUsers() {
  const {
    executer: fetchUser,
    data: users,
    loading,
    error
  } = useAsync(
    useCallback(async () => {
      // 为什么不直接放在hooks里处理掉呢？
      const res = await fetch('https://reqres.in/api/users/');
      const json = await res.json();
      return json.data;
    }, [])
  );

  return (
    <>
      <button
        className="btn btn-primary"
        onClick={fetchUser}
        disabled={loading}
      >
        获取用户
      </button>
      {error && <div style={{ color: 'red' }}>{toString(error)}</div>}
      <br />
      <ul>
        {users.map((user) => {
          return <li key={user.id}>{user.last_name}</li>;
        })}
      </ul>
    </>
  );
}
