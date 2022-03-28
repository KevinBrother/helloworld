import React from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import Detail from './Detail';

const users = [
  { id: '01', name: 'John', age: 34 },
  { id: '02', name: 'kevin', age: 24 },
  { id: '03', name: 'brother', age: 34 }
];

export default function Message() {
  const navigate = useNavigate();

  function toDetail(id) {
    navigate({
      to: 'detail',
      state: {
        id
      }
    });
  }

  return (
    <div>
      message
      <ul>
        {users.map((user) => {
          const { id, name } = user;
          return (
            <li key={id}>
              {/* 1. params方式 */}
              {/* <Link to={`/home/message/detail/${id}/${name}`}>{name}</Link> */}
              {/* 2. search方式 */}
              {/* <Link to={`/home/message/detail?id=${id}&${name}`}>{name}</Link> */}
              {/* 3. state方式 */}
              <Link to="detail" state={{ id, name }}>
                {name} <button onClick={() => toDetail(id)}>查看详情</button>
              </Link>
            </li>
          );
        })}
      </ul>
      <hr />
      <Routes>
        {/* <Route path="detail/:id/:name" element={<Detail />} /> */}
        {/* <Route path="detail/" element={<Detail />} /> */}

        <Route path="detail/" element={<Detail />} />
      </Routes>
    </div>
  );
}
