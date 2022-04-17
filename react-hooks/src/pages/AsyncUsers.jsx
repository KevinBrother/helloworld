import React from 'react';
import useAsync from '../hooks/useAsync-v2.js';

/* async function getUser() {
  const res = await fetch('https://reqres.in/api/users/');
  const json = await res.json();
  return json.data;
} */

function getUser() {
  return fetch('https://reqres.in/api/users/')
    .then((res) => res.json())
    .then((json) => json.data);
}

export default function AsyncUsers() {
  const {
    executer: fetchUser,
    data: users,
    loading,
    error
    // } = useAsync(getUser, { manual: true });
  } = useAsync(getUser);

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
