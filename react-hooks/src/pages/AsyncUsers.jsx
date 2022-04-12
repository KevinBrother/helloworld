import React, { useState } from 'react';

export default function AsyncUsers() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  function getUsers() {
    setLoading(true);
    fetch('https://reqres.in/api/users/')
      .then((rsp) => rsp.json())
      .then((rsp) => {
        setUsers(rsp.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }

  return (
    <>
      <button className="btn btn-primary" onClick={getUsers} disabled={loading}>
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
