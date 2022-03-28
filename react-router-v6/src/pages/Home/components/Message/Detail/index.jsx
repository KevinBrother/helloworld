import React from 'react';
import { useParams, useSearchParams, useLocation } from 'react-router-dom';

const users = [
  { id: '01', name: 'John', age: 34 },
  { id: '02', name: 'kevin', age: 24 },
  { id: '03', name: 'brother', age: 34 }
];

export default function Detail() {
  // 第一种获取params的方式
  //  console.log(useParams());
  // const { id } = useParams();

  // 第二种方式

  /*   
  console.log(useSearchParams());
  const [searchParams, setSearchParams] = useSearchParams();
  const id = searchParams.get('id'); 
  */

  // 第三种方式
  console.log(useLocation());
  const { id } = useLocation().state;

  const currentUser = users.find((user) => user.id === id) || {};

  return (
    <div>
      details
      <div>
        <ul>
          <li>ID：{currentUser.id}</li>
          <li>姓名：{currentUser.name}</li>
          <li>年龄：{currentUser.age}</li>
        </ul>

        {/*    <button onClick={() => setSearchParams('id=03&name=json')}>
          setSearchParams
        </button> */}
      </div>
    </div>
  );
}
