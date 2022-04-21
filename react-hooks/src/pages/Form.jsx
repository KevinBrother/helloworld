import React from 'react';
import useForm from '../hooks/useForm';
import Input from './Input';

const validate = {
  username: (value) => {
    if (!value) {
      return '必填!';
    }
    return null;
  },

  email: (value) => {
    if (!value.includes('@')) {
      return '不是邮箱！！！';
    }
    return null;
  }
};

export default function Form() {
  const [formData, errMsg, setFormValue, resetFormData] = useForm(
    {
      username: '',
      email: ''
    },
    validate
  );

  return (
    <div className="container">
      <form>
        <div className="form-group">
          <label>姓名</label>
          <Input
            value={formData.username}
            name="username"
            onChange={(value) => setFormValue('username', value)}
          ></Input>
          <div style={{ color: 'red' }}>{errMsg.username}</div>
        </div>
        <div className="form-group">
          <label>邮箱</label>
          <input
            className="form-control"
            type="text"
            value={formData.email}
            onChange={(event) => setFormValue('email', event.target.value)}
          />
          <div style={{ color: 'red' }}>{errMsg.email}</div>
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
