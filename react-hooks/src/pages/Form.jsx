import React from 'react';
import useForm from '../hooks/useForm';

export default function Form() {
  const [formData, setFormValue, resetFormData] = useForm({
    username: '',
    email: ''
  });

  return (
    <div className="container">
      <form>
        <div className="form-group">
          <label>姓名</label>
          <input
            className="form-control"
            type="text"
            value={formData.username}
            onChange={(event) => setFormValue('username', event.target.value)}
          />
        </div>
        <div className="form-group">
          <label>邮箱</label>
          <input
            className="form-control"
            type="text"
            value={formData.email}
            onChange={(event) => setFormValue('email', event.target.value)}
          />
        </div>
      </form>

      <button className="btn btn-primary" onClick={() => console.log(formData)}>
        确定
      </button>
      <button className="btn btn-primary" onClick={resetFormData}>
        重制
      </button>
    </div>
  );
}
