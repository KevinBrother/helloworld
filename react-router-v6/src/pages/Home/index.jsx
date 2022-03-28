// export default class Home extends Component {
//   render() {
//     return (
//       <div>
//         <div className="nav">
//           <NavLink className="nav-link" to="/home/news">
//             news
//           </NavLink>

//           <NavLink className="nav-link" to="/home/message">
//             message
//           </NavLink>
//         </div>

//         <Routes>
//           <Route path="news" element={<News />}></Route>
//           <Route path="message/*" element={<Message />}></Route>
//         </Routes>
//       </div>
//     );
//   }
// }

import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import Message from './components/Message';
import News from './components/News';

export default function index() {
  return (
    <div>
      <div className="nav">
        <NavLink className="nav-link" to="/home/news">
          news
        </NavLink>

        <NavLink className="nav-link" to="/home/message">
          message
        </NavLink>
      </div>

      <Routes>
        <Route path="news" element={<News />}></Route>
        <Route path="message/*" element={<Message />}></Route>
      </Routes>
    </div>
  );
}
